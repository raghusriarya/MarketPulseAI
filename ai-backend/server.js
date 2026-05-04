import cors from "cors";
import csv from "csv-parser";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import https from "https";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// ===============================
// 🔥 CACHE (VERY IMPORTANT)
// ===============================
const CACHE = new Map();
const CACHE_TTL = 15000; // 15 sec

const getCache = (key) => {
  const data = CACHE.get(key);
  if (!data) return null;

  if (Date.now() - data.time > CACHE_TTL) {
    CACHE.delete(key);
    return null;
  }

  return data.value;
};

const setCache = (key, value) => {
  CACHE.set(key, { value, time: Date.now() });
};

// ===============================
// 🔥 SAFE FETCH (ANTI RATE LIMIT)
// ===============================
const agent = new https.Agent({ rejectUnauthorized: false });

const fetchSafe = async (url, retries = 2) => {
  try {
    const res = await fetch(url, {
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const text = await res.text();

    if (!text.startsWith("{")) {
      throw new Error("Invalid JSON (Rate Limited)");
    }

    return JSON.parse(text);
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchSafe(url, retries - 1);
    }
    throw err;
  }
};
// ===============================
// 🔍 SEARCH STOCK API
// ===============================
app.get("/search-stock", (req, res) => {
  try {
    const { q } = req.query;

    if (!q) return res.json([]);

    const query = q.toLowerCase().trim();

    const results = stockList
      .map((stock) => {
        const symbol = stock.symbol.toLowerCase();
        const name = stock.name.toLowerCase();

        let score = 0;

        if (symbol.startsWith(query)) score += 3;
        if (symbol.includes(query)) score += 2;

        if (name.startsWith(query)) score += 3;
        if (name.includes(query)) score += 1;

        return { stock, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ stock }) => ({
        label: `${stock.symbol} - ${stock.name}`,
        value: `${stock.symbol}.NS`,
      }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.json({ error: "Search failed" });
  }
});
// ===============================
// 🔥 LOAD CSV
// ===============================
let stockList = [];

const loadStocks = () =>
  new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(new URL("./data/EQUITY_L.csv", import.meta.url))
      .pipe(csv())
      .on("data", (d) =>
        results.push({
          symbol: d["SYMBOL"],
          name: d["NAME OF COMPANY"],
        }),
      )
      .on("end", () => {
        stockList = results;
        console.log("✅ Stocks Loaded:", results.length);
        resolve();
      })
      .on("error", reject);
  });

// ===============================
// 🔥 OPTION CHAIN
// ===============================
app.get("/fo/option-chain", async (req, res) => {
  try {
    const { symbol = "^NSEI" } = req.query;

    const cacheKey = `option-${symbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const json = await fetchSafe(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`,
    );

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
      call: { oi: Math.floor(Math.random() * 200000) },
      put: { oi: Math.floor(Math.random() * 200000) },
    }));

    const totalCallOI = data.reduce((a, b) => a + b.call.oi, 0);
    const totalPutOI = data.reduce((a, b) => a + b.put.oi, 0);

    const response = {
      symbol,
      atm: base,
      pcr: (totalPutOI / totalCallOI).toFixed(2),
      data,
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("❌ Option Chain Error:", err.message);
    res.json({ error: "F&O error" });
  }
});

// ===============================
// 🔥 CHAT STOCK (FIXED)
// ===============================
app.post("/chat-stock", async (req, res) => {
  try {
    const base = req.body.message?.trim().toUpperCase();

    if (!base) return res.json({ error: "Enter stock" });

    const symbol = base.includes(".") ? base : `${base}.NS`;

    const cacheKey = `stock-${symbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const json = await fetchSafe(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m`,
    );

    const result = json.chart?.result?.[0];
    if (!result) return res.json({ error: "Stock not found" });

    const q = result.indicators.quote[0];

    const close = q.close.filter(Boolean).at(-1);
    const high = Math.max(...q.high.filter(Boolean));
    const low = Math.min(...q.low.filter(Boolean));

    const response = {
      symbol,
      price: close,
      high,
      low,
    };

    setCache(cacheKey, response);

    res.json(response);
  } catch (err) {
    console.error("❌ Stock API Error:", err.message);

    res.json({
      error: "Yahoo rate limit hit. Try again in 10 sec",
    });
  }
});

// ===============================
// 🔥 F&O ANALYSIS (UNCHANGED + SAFE)
// ===============================
app.post("/fo/analyze", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data?.length) return res.json({ error: "No option data" });

    let call = 0,
      put = 0;
    let maxCall = { oi: 0, strike: 0 };
    let maxPut = { oi: 0, strike: 0 };

    data.forEach((r) => {
      const c = r.call?.oi || 0;
      const p = r.put?.oi || 0;

      call += c;
      put += p;

      if (c > maxCall.oi) maxCall = { oi: c, strike: r.strike };
      if (p > maxPut.oi) maxPut = { oi: p, strike: r.strike };
    });

    const pcr = put / call;

    let signal = "SIDEWAYS";
    if (pcr > 1.2) signal = "BULLISH";
    if (pcr < 0.8) signal = "BEARISH";

    res.json({
      signal,
      pcr: Number(pcr.toFixed(2)),
      support: maxPut.strike,
      resistance: maxCall.strike,
      confidence: 70,
      message: "OI based analysis",
    });
  } catch (err) {
    res.json({ error: "Analyze failed" });
  }
});

// ===============================
app.get("/fo/indices", (req, res) => {
  res.json([
    { label: "NIFTY 50", value: "^NSEI" },
    { label: "BANK NIFTY", value: "^NSEBANK" },
    { label: "FIN NIFTY", value: "NIFTY_FIN_SERVICE.NS" },
  ]);
});

// ===============================
const startServer = async () => {
  await loadStocks();

  app.listen(5000, () => {
    console.log("🚀 Server running http://localhost:5000");
  });
};

startServer();
