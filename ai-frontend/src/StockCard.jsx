import { Box, Card, Chip, Divider, Typography } from "@mui/material";

function StockCard({ data }) {
  if (!data) return null;

  const isUp = data.price > data.open;

  const signalColor = {
    "STRONG BUY": "success",
    BUY: "success",
    SELL: "error",
    "STRONG SELL": "error",
    HOLD: "warning",
  };

  return (
    <Card
      sx={{
        p: 2,
        borderRadius: 2,
        background: "#0b1220",
        color: "#fff",
        boxShadow: "0 0 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* 🔥 HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography fontSize={13} color="gray">
            {data.symbol}
          </Typography>
          <Typography fontSize={18} fontWeight="bold">
            {data.name}
          </Typography>
        </Box>

        <Box textAlign="right">
          <Typography fontSize={22} fontWeight="bold">
            ₹ {data.price}
          </Typography>
          <Typography fontSize={12} color={isUp ? "#00e676" : "#ff5252"}>
            {isUp ? "▲" : "▼"} {Math.abs(data.price - data.open).toFixed(2)}
          </Typography>
        </Box>
      </Box>
      {/* 🔥 SIGNAL
      <Box mt={2}>
        <Chip
          label={data.finalSignal}
          color={signalColor[data.finalSignal] || "default"}
          size="small"
        />
      </Box> */}
      {/* 🔥 TREND + RISK (PRO STYLE) */}
      <Box mt={1} display="flex" justifyContent="space-between">
        {/* Trend */}
        <Box textAlign="left">
          <Typography fontSize={11} color="gray">
            TREND
          </Typography>
          <Typography
            fontSize={13}
            fontWeight="bold"
            color={
              data.trend?.toLowerCase().includes("bullish")
                ? "#00e676"
                : data.trend?.toLowerCase().includes("bearish")
                  ? "#ff5252"
                  : "#fbc02d"
            }
          >
            {data.trend}
          </Typography>
        </Box>

        {/* Risk */}
        <Box textAlign="right">
          <Typography fontSize={11} color="gray">
            RISK
          </Typography>
          <Typography fontSize={13} fontWeight="bold" color="#cbd5e1">
            {data.risk}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2, borderColor: "#1f2a40" }} />
      {/* 🔥 OHLC */}
      <Box display="flex" justifyContent="space-between">
        <Box>
          <Typography fontSize={11} color="gray">
            OPEN
          </Typography>
          <Typography>₹ {data.open}</Typography>
        </Box>

        <Box>
          <Typography fontSize={11} color="gray">
            HIGH
          </Typography>
          <Typography color="#00e676">₹ {data.high}</Typography>
        </Box>

        <Box>
          <Typography fontSize={11} color="gray">
            LOW
          </Typography>
          <Typography color="#ff5252">₹ {data.low}</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2, borderColor: "#1f2a40" }} />
      <Typography mt={1}>
        Confidence: <b>{data.confidence}%</b>
      </Typography>
      {/* 🔥 SUPPORT / RESISTANCE */}
      <Box display="flex" justifyContent="space-between">
        <Typography fontSize={12}>
          Support: <b>₹ {data.support}</b>
        </Typography>

        <Typography fontSize={12}>
          Resistance: <b>₹ {data.resistance}</b>
        </Typography>
      </Box>
      {/* 🔥 VOLUME */}
      <Box mt={2}>
        <Chip
          label={`Volume:${data.volume} (${data.volumeSignal})`}
          size="small"
          color={data.volumeSignal === "HIGH" ? "success" : "default"}
        />
      </Box>
      <Divider sx={{ my: 2, borderColor: "#1f2a40" }} />
      {/* 🔥 INSIGHTS (CLEAN STYLE) */}
      {data.insights && (
        <Box>
          <Typography fontSize={11} color="gray" gutterBottom>
            INSIGHTS
          </Typography>
          <Typography>{data.smartInsight}</Typography>
          <Typography mt={1}>
            {data.breakout} | {data.momentum}
          </Typography>
          <Typography fontSize={13} color="#cbd5e1">
            {data.insights}
          </Typography>
        </Box>
      )}
      {/* 🔥 SUMMARY */}
      {data.summary && (
        <Box mt={2}>
          <Typography fontSize={11} color="gray" gutterBottom>
            SUMMARY
          </Typography>
          <Typography fontSize={13} color="#cbd5e1">
            {data.summary}
          </Typography>
        </Box>
      )}
      {/* 🔥 FOOTER */}
      <Typography mt={2} fontSize={10} color="gray" textAlign="right">
        {data.latestTime}
      </Typography>
    </Card>
  );
}

export default StockCard;
