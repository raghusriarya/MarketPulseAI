process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import cors from "cors";
import csv from "csv-parser";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import https from "https";
import fetch from "node-fetch";

dotenv.config();

const app = express();
// app.use(cors());
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// ===============================
// 🔥 GLOBAL STOCK CACHE
// ===============================
let stockList = [];
let watchlist = {};
let breakout = "NONE";
let srSignal = "HOLD";
// ===============================
// 🔥 LOAD CSV (NSE STOCKS)
// ===============================
const loadStocks = () => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream("./data/EQUITY_L.csv")
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          symbol: data["SYMBOL"],
          name: data["NAME OF COMPANY"],
        });
      })
      .on("end", () => {
        stockList = results;
        console.log("✅ NSE Stocks Loaded:", stockList.length);
        resolve();
      })
      .on("error", reject);
  });
};

// ===============================
// ✅ Round helper
// ===============================
const round = (num) => (num != null ? Number(Number(num).toFixed(2)) : null);

const agent = new https.Agent({
  rejectUnauthorized: false,
});

// ===============================
// 🚀 STOCK ANALYSIS API (UNCHANGED)
// ===============================
app.post("/chat-stock", async (req, res) => {
  try {
    const { message } = req.body;
    const base = message.trim().toUpperCase();

    if (!base) {
      return res.json({ error: "Enter stock like TCS, INFY" });
    }

    const exchanges = [".NS", ".BO"];
    let stockJson, symbol;

    for (let suffix of exchanges) {
      symbol = base.includes(".") ? base : `${base}${suffix}`;
      console.log("Fetching 👉", symbol);

      const stockRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m`,
        { agent },
      );

      stockJson = await stockRes.json();
      const result = stockJson.chart?.result?.[0];

      if (result) break;
    }

    const result = stockJson.chart?.result?.[0];
    if (!result) return res.json({ error: "Stock not found" });

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    // 🔥 FILTER VALID DATA
    const validOpens = quotes.open.filter((v) => v != null);
    const validHighs = quotes.high.filter((v) => v != null);
    const validLows = quotes.low.filter((v) => v != null);
    const validCloses = quotes.close.filter((v) => v != null);

    // ✅ DAY VALUES (CORRECT)
    const dayOpen = validOpens[0];
    const dayHigh = Math.max(...validHighs);
    const dayLow = Math.min(...validLows);
    const dayClose = validCloses[validCloses.length - 1];

    // 🔥 KEEP YOUR LATEST TIME LOGIC
    let latestIndex = timestamps.length - 1;

    while (
      latestIndex > 0 &&
      quotes.open[latestIndex] === quotes.close[latestIndex] &&
      quotes.high[latestIndex] === quotes.low[latestIndex]
    ) {
      latestIndex--;
    }

    const latestTimeUnix = timestamps[latestIndex];

    const latestDate = new Date(latestTimeUnix * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    // ===============================
    // 🔥 WATCHLIST ALERTS
    // ===============================
    const alertMsg =
      breakout === "BREAKOUT UP"
        ? `${symbol} breakout 🚀`
        : breakout === "BREAKDOWN"
          ? `${symbol} breakdown ⚠`
          : srSignal === "BUY"
            ? `${symbol} near support`
            : srSignal === "SELL"
              ? `${symbol} near resistance`
              : null;

    // Store latest alert
    if (alertMsg) {
      watchlist[symbol] = {
        message: alertMsg,
        time: new Date().toLocaleTimeString(),
      };
    }
    const stockInfo = `
Symbol: ${symbol}
Price: ${dayClose}
Open: ${dayOpen}
High: ${dayHigh}
Low: ${dayLow}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Return JSON ONLY:
{
 "trend":"",
 "risk":"",
 "insights":"",
 "summary":"",
 "disclaimer":""
}`,
          },
          { role: "user", content: `Analyze this stock:\n${stockInfo}` },
        ],
      }),
    });

    const aiData = await aiRes.json();
    // 🔥 Extract pure symbol (remove .NS/.BO)
    const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "");

    // 🔥 Find full name from CSV
    const stockMeta = stockList.find((s) => s.symbol === cleanSymbol);

    const fullName = stockMeta?.name || cleanSymbol;
    let parsed;
    try {
      parsed = JSON.parse(aiData.choices[0].message.content);
    } catch {
      parsed = {
        trend: "Unknown",
        risk: "Medium",
        insights: aiData.choices[0].message.content,
        summary: "",
        disclaimer: "Not financial advice",
      };
    }

    const chartData = timestamps
      .map((t, i) => {
        const o = quotes.open[i];
        const h = quotes.high[i];
        const l = quotes.low[i];
        const c = quotes.close[i];
        const v = quotes.volume[i];

        if (!t || o == null || h == null || l == null || c == null) return null;

        return {
          time: Number(t),
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          volume: v != null ? Number(v) : null,
        };
      })
      .filter(Boolean);

    // ===============================
    // 🔥 SUPPORT & RESISTANCE (last 20 candles)
    // ===============================
    const recent = chartData.slice(-20);

    const support = Math.min(...recent.map((c) => c.low));
    const resistance = Math.max(...recent.map((c) => c.high));

    // 🔥 PRICE POSITION SIGNAL

    if (dayClose <= support * 1.01) {
      srSignal = "BUY"; // near support
    } else if (dayClose >= resistance * 0.99) {
      srSignal = "SELL"; // near resistance
    }

    // ===============================
    // 🔥 VOLUME BREAKOUT
    // ===============================
    const recentVolumes = chartData.slice(-20).map((c) => c.volume);

    const validVolumes = chartData
      .map((c) => c.volume)
      .filter((v) => v && v > 0);

    const avgVolume =
      validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length || 0;

    const latestVolume =
      [...chartData].reverse().find((c) => c.volume && c.volume > 0)?.volume ||
      0;
    let volumeSignal = "NORMAL";

    if (avgVolume > 0 && latestVolume > avgVolume * 1.5) {
      volumeSignal = "HIGH";
    }
    // ===============================
    // 🔥 FINAL SIGNAL (SR + VOLUME)
    // ===============================
    let finalSignal = "HOLD";

    // Strong Buy → near support + high volume
    if (srSignal === "BUY" && volumeSignal === "HIGH") {
      finalSignal = "STRONG BUY";
    }

    // Strong Sell → near resistance + high volume
    else if (srSignal === "SELL" && volumeSignal === "HIGH") {
      finalSignal = "STRONG SELL";
    }

    // Weak signals
    else if (srSignal === "BUY") {
      finalSignal = "BUY";
    } else if (srSignal === "SELL") {
      finalSignal = "SELL";
    }

    // ===============================
    // 🔥 BREAKOUT DETECTION
    // ===============================

    if (dayClose > resistance && volumeSignal === "HIGH") {
      breakout = "BREAKOUT UP";
    } else if (dayClose < support && volumeSignal === "HIGH") {
      breakout = "BREAKDOWN";
    }

    // ===============================
    // 🔥 MOMENTUM DETECTION
    // ===============================
    let momentum = "WEAK";

    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];

    if (last && prev) {
      const move = Math.abs(last.close - prev.close);

      if (move > (resistance - support) * 0.2 && volumeSignal === "HIGH") {
        momentum = "STRONG";
      }
    }
    // ===============================
    // 🔥 CONFIDENCE SCORE
    // ===============================
    let confidence = 50;

    // Volume weight
    if (volumeSignal === "HIGH") confidence += 20;

    // Near key levels
    if (srSignal !== "HOLD") confidence += 20;

    // Breakout bonus
    if (breakout !== "NONE") confidence += 10;

    // Momentum bonus
    if (momentum === "STRONG") confidence += 10;

    confidence = Math.min(100, confidence);

    // ===============================
    // 🔥 SMART INSIGHT
    // ===============================
    let smartInsight = "Market is consolidating.";

    if (breakout === "BREAKOUT UP") {
      smartInsight =
        "Price broke resistance with strong volume → bullish move possible.";
    } else if (breakout === "BREAKDOWN") {
      smartInsight = "Price broke support with strong volume → downside risk.";
    } else if (srSignal === "BUY") {
      smartInsight = "Price near support → possible bounce zone.";
    } else if (srSignal === "SELL") {
      smartInsight = "Price near resistance → possible rejection zone.";
    }

    if (momentum === "STRONG") {
      smartInsight += " Momentum is strong.";
    }

    return res.json({
      name: fullName,
      symbol: symbol,
      price: round(dayClose),
      open: round(dayOpen),
      high: round(dayHigh),
      low: round(dayLow),
      trend: parsed.trend,
      risk: parsed.risk,
      insights: parsed.insights,
      summary: parsed.summary,
      disclaimer: parsed.disclaimer,
      latestTime: latestDate,
      chart: chartData,
      support: round(support),
      resistance: round(resistance),
      srSignal,

      volume: latestVolume,
      avgVolume: Math.round(avgVolume),
      volumeSignal,

      finalSignal,
      breakout,
      momentum,
      confidence,
      smartInsight,
      alert: watchlist[symbol] || null,
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Server error" });
  }
});
app.get("/alerts", (req, res) => {
  res.json(Object.values(watchlist));
});
// ===============================
// 🔍 FAST SEARCH (CSV BASED)
// ===============================
app.get("/search-stock", (req, res) => {
  const { q } = req.query;

  if (!q) return res.json([]);

  const query = q.toLowerCase().trim();

  const results = stockList
    .map((stock) => {
      const symbol = stock.symbol.toLowerCase();
      const name = stock.name.toLowerCase();

      // 🔥 scoring system (important)
      let score = 0;

      if (symbol.startsWith(query)) score += 3; // INFY
      if (symbol.includes(query)) score += 2;

      if (name.startsWith(query)) score += 3; // Infosys
      if (name.includes(query)) score += 1;

      return { stock, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score) // 🔥 best match first
    .slice(0, 10)
    .map(({ stock }) => ({
      label: `${stock.symbol} - ${stock.name}`, // 👈 better UI
      value: `${stock.symbol}.NS`,
    }));

  res.json(results);
});
// ===============================
// 🤖 AI STOCK INSIGHT HELPER
// ===============================
const getAIStockInsight = async (stock) => {
  try {
    const prompt = `
Analyze this stock and return JSON ONLY:

{
 "summary": "",
 "insights": "",
 "watchout": ""
}

Stock Data:
Name: ${stock.name}
Symbol: ${stock.symbol}
Price: ${stock.price}
Change: ${stock.change}%
52W High: ${stock.high52}
52W Low: ${stock.low52}
Volume: ${stock.volume}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional stock market analyst. Be concise and actionable.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await aiRes.json();

    let parsed;

    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      parsed = {
        summary: data.choices[0].message.content,
        insights: "",
        watchout: "Market risk present",
      };
    }

    return parsed;
  } catch (err) {
    return {
      summary: "AI unavailable",
      insights: "",
      watchout: "",
    };
  }
};
app.get("/top-stocks", async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) return res.json({ error: "Type required" });

    const sampleStocks = stockList.slice(0, 80); // ⚡ reduced for AI speed

    const results = [];

    for (let stock of sampleStocks) {
      try {
        const symbol = `${stock.symbol}.NS`;

        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
          { agent },
        );

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) continue;

        const q = result.indicators.quote[0];

        const closes = q.close.filter((v) => v != null);
        const highs = q.high.filter((v) => v != null);
        const lows = q.low.filter((v) => v != null);
        const volumes = q.volume.filter((v) => v != null);

        if (!closes.length) continue;

        const current = closes.at(-1);
        const prev = closes.at(-2);

        const high52 = Math.max(...highs);
        const low52 = Math.min(...lows);

        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

        const latestVolume = volumes.at(-1);

        const changePct = ((current - prev) / prev) * 100;

        let isMatch = false;

        if (type === "uptrend") isMatch = changePct > 2;
        if (type === "downtrend") isMatch = changePct < -2;
        if (type === "breakout")
          isMatch = current > high52 * 0.98 && latestVolume > avgVolume * 1.5;
        if (type === "high52") isMatch = current >= high52 * 0.99;
        if (type === "low52") isMatch = current <= low52 * 1.01;

        if (isMatch) {
          results.push({
            symbol,
            name: stock.name,
            price: Number(current.toFixed(2)),
            change: Number(changePct.toFixed(2)),
            high52: Number(high52.toFixed(2)),
            low52: Number(low52.toFixed(2)),
            volume: latestVolume,
          });
        }
      } catch {
        continue;
      }
    }

    // 🔥 Sorting
    if (type === "uptrend") results.sort((a, b) => b.change - a.change);
    if (type === "downtrend") results.sort((a, b) => a.change - b.change);
    if (type === "breakout") results.sort((a, b) => b.volume - a.volume);
    if (type === "high52") results.sort((a, b) => b.price - a.price);
    if (type === "low52") results.sort((a, b) => a.price - b.price);

    const top5 = results.slice(0, 5);

    // ============================
    // 🤖 ADD AI INSIGHTS
    // ============================
    const finalData = [];

    for (let stock of top5) {
      const ai = await getAIStockInsight(stock);

      finalData.push({
        ...stock,
        aiSummary: ai.summary,
        aiInsights: ai.insights,
        aiWatchout: ai.watchout,
      });
    }

    return res.json(finalData);
  } catch (err) {
    console.error(err);
    res.json({ error: "Failed" });
  }
});
const FO_INDICES = [
  { label: "NIFTY 50", value: "^NSEI" },
  { label: "BANK NIFTY", value: "^NSEBANK" },
  { label: "FIN NIFTY", value: "NIFTY_FIN_SERVICE.NS" },
];

app.get("/fo/indices", (req, res) => {
  res.json(FO_INDICES);
});
app.get("/fo/option-chain", async (req, res) => {
  try {
    const { symbol = "^NSEI" } = req.query;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`,
      { agent },
    );

    const json = await response.json();
    const result = json.chart?.result?.[0];

    if (!result) return res.json({ error: "No data" });

    const closes = result.indicators.quote[0].close.filter(Boolean);
    const price = closes.at(-1);

    const step = symbol.includes("BANK") ? 100 : 50;
    const base = Math.round(price / step) * step;

    const strikes = [];
    for (let i = -5; i <= 5; i++) {
      strikes.push(base + i * step);
    }

    const data = strikes.map((strike) => ({
      strike,
      call: {
        oi: Math.floor(Math.random() * 200000),
      },
      put: {
        oi: Math.floor(Math.random() * 200000),
      },
    }));

    const totalCallOI = data.reduce((a, b) => a + b.call.oi, 0);
    const totalPutOI = data.reduce((a, b) => a + b.put.oi, 0);

    const pcr = (totalPutOI / totalCallOI).toFixed(2);

    res.json({
      symbol,
      atm: base,
      pcr,
      data,
    });
  } catch (err) {
    res.json({ error: "F&O error" });
  }
});
const getFOAIInsight = async ({ pcr, support, resistance, signal, symbol }) => {
  try {
    const prompt = `
You are a professional options trader.

Return JSON ONLY:

{
  "summary": "",
  "bias": "",
  "tradeIdea": "",
  "risk": ""
}

Data:
Symbol: ${symbol}
PCR: ${pcr}
Support: ${support}
Resistance: ${resistance}
Signal: ${signal}

Rules:
- Short and actionable
- No extra text
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // ✅ FIXED
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are an expert derivatives trader. Give concise trading insights.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await aiRes.json();

    let parsed;

    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      parsed = {
        summary: data?.choices?.[0]?.message?.content || "AI response failed",
        bias: "",
        tradeIdea: "",
        risk: "Market risk present",
      };
    }

    return parsed;
  } catch (err) {
    return {
      summary: "AI unavailable",
      bias: "",
      tradeIdea: "",
      risk: "",
    };
  }
};
// =============================== // 🔥 F&O ANALYSIS API // ===============================

// ===============================
// 🔥 F&O ANALYSIS API (AI ENABLED)
// ===============================
app.post("/fo/analyze", async (req, res) => {
  try {
    const { data, symbol } = req.body;

    if (!Array.isArray(data) || !data.length) {
      return res.json({ error: "No option data" });
    }

    let totalCallOI = 0;
    let totalPutOI = 0;

    let maxCall = { strike: 0, oi: 0 };
    let maxPut = { strike: 0, oi: 0 };

    data.forEach((row) => {
      const callOI = Number(row.call?.oi) || 0;
      const putOI = Number(row.put?.oi) || 0;

      totalCallOI += callOI;
      totalPutOI += putOI;

      if (callOI > maxCall.oi) {
        maxCall = { strike: row.strike, oi: callOI };
      }

      if (putOI > maxPut.oi) {
        maxPut = { strike: row.strike, oi: putOI };
      }
    });

    // ✅ PCR
    const pcr = totalCallOI === 0 ? 0 : totalPutOI / totalCallOI;

    // ✅ SIGNAL
    let signal = "SIDEWAYS";

    if (pcr > 1.3) signal = "POSSIBLE REVERSAL UP";
    else if (pcr < 0.7) signal = "POSSIBLE REVERSAL DOWN";
    else if (pcr > 1.05) signal = "MILD BULLISH";
    else if (pcr < 0.95) signal = "MILD BEARISH";

    // ✅ SUPPORT / RESISTANCE
    const support = maxPut.strike;
    const resistance = maxCall.strike;

    // ✅ CONFIDENCE
    let confidence = 50;

    const oiStrength = Math.max(maxCall.oi, maxPut.oi) > 200000;

    if (Math.abs(pcr - 1) > 0.2) confidence += 15;
    if (oiStrength) confidence += 20;

    confidence = Math.min(90, confidence);

    // ✅ MESSAGE
    let message = "Balanced market";

    if (pcr > 1.3) {
      message = "Heavy put writing → market may bounce";
    } else if (pcr < 0.7) {
      message = "Heavy call writing → downside risk";
    }

    // ===============================
    // 🤖 AI CALL
    // ===============================
    const ai = await getFOAIInsight({
      pcr: Number(pcr.toFixed(2)),
      support,
      resistance,
      signal,
      symbol: symbol || "INDEX",
    });

    return res.json({
      signal,
      pcr: Number(pcr.toFixed(2)),
      support,
      resistance,
      confidence,
      message,
      maxPain: null,

      // 🔥 AI OUTPUT
      aiSummary: ai.summary,
      aiBias: ai.bias,
      aiTrade: ai.tradeIdea,
      aiRisk: ai.risk,
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Analyze failed" });
  }
});
// ===============================
// 🚀 START SERVER AFTER CSV LOAD
// ===============================
const startServer = async () => {
  await loadStocks();

  app.listen(5000, () => {
    console.log("Server running http://localhost:5000 🚀");
  });
};

startServer();
