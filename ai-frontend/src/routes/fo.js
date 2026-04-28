// routes/fo.js
import express from "express";
const router = express.Router();

const FO_INDICES = [
  { label: "NIFTY 50", value: "^NSEI" },
  { label: "BANK NIFTY", value: "^NSEBANK" },
  { label: "FIN NIFTY", value: "NIFTY_FIN_SERVICE.NS" },
  { label: "MIDCAP NIFTY", value: "NIFTY_MID_SELECT.NS" },
];
const FO_EXPIRIES = {
  "^NSEI": ["2026-04-30", "2026-05-07", "2026-05-28"],
  "^NSEBANK": ["2026-04-30", "2026-05-07"],
  "NIFTY_FIN_SERVICE.NS": ["2026-04-30"],
};
app.get("/fo/expiries", (req, res) => {
  const { symbol = "^NSEI" } = req.query;

  res.json(FO_EXPIRIES[symbol] || []);
});
app.get("/fo/indices", (req, res) => {
  res.json(FO_INDICES);
});
router.get("/option-chain", async (req, res) => {
  const { symbol = "NIFTY" } = req.query;

  // 🔥 Mock data (replace later with NSE scraper)
  const strikes = [21800, 21850, 21900, 21950, 22000];

  const data = strikes.map((strike) => ({
    strike,
    call: {
      oi: Math.floor(Math.random() * 200000),
      changeOi: Math.floor(Math.random() * 20000),
      ltp: Math.floor(Math.random() * 200),
      iv: (10 + Math.random() * 10).toFixed(2),
    },
    put: {
      oi: Math.floor(Math.random() * 200000),
      changeOi: Math.floor(Math.random() * 20000),
      ltp: Math.floor(Math.random() * 200),
      iv: (10 + Math.random() * 10).toFixed(2),
    },
  }));

  const totalCallOI = data.reduce((a, b) => a + b.call.oi, 0);
  const totalPutOI = data.reduce((a, b) => a + b.put.oi, 0);

  const pcr = (totalPutOI / totalCallOI).toFixed(2);

  res.json({
    symbol,
    pcr,
    atm: 21900,
    data,
  });
});

export default router;
// router.post("/analyze", (req, res) => {
//   const { data } = req.body;

//   const maxCall = data.reduce((a, b) => (a.call.oi > b.call.oi ? a : b));

//   const maxPut = data.reduce((a, b) => (a.put.oi > b.put.oi ? a : b));

//   res.json({
//     resistance: maxCall.strike,
//     support: maxPut.strike,
//     bias: "Sideways",
//     message: `Resistance at ${maxCall.strike}, Support at ${maxPut.strike}`,
//   });
// });
