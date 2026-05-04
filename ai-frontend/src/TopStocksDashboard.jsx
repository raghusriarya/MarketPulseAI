import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import { useState } from "react";

const buttons = [
  { label: "Uptrend", value: "uptrend" },
  { label: "Downtrend", value: "downtrend" },
  { label: "Breakouts", value: "breakout" },
  { label: "52W High", value: "high52" },
  { label: "52W Low", value: "low52" },
];

export default function TopStocksAI() {
  const [type, setType] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStocks = async (selectedType) => {
    setType(selectedType);
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/top-stocks?type=${selectedType}`,
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <Box p={2}>
      {/* 🔥 BUTTONS */}
      <Box mb={2} display="flex" gap={1} flexWrap="wrap">
        {buttons.map((btn) => (
          <Button
            key={btn.value}
            variant={type === btn.value ? "contained" : "outlined"}
            onClick={() => fetchStocks(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </Box>

      {/* 🔄 LOADING */}
      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {data?.map((stock, i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 3,
                  height: "100%",
                }}
              >
                <CardContent>
                  {/* 📊 HEADER */}
                  <Typography variant="h6" fontWeight="bold">
                    {stock.symbol}
                  </Typography>

                  <Typography color="text.secondary">₹{stock.price}</Typography>

                  {/* 📈 CHANGE */}
                  <Chip
                    label={`${stock.change}%`}
                    color={stock.change >= 0 ? "success" : "error"}
                    size="small"
                    sx={{ mt: 1 }}
                  />

                  {/* 📊 LEVELS */}
                  <Box mt={1}>
                    <Typography variant="body2">
                      52W High: ₹{stock.high52}
                    </Typography>
                    <Typography variant="body2">
                      52W Low: ₹{stock.low52}
                    </Typography>
                  </Box>

                  {/* 🤖 AI SUMMARY */}
                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      AI Summary
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stock.aiSummary}
                    </Typography>
                  </Box>

                  {/* 💡 INSIGHTS */}
                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Insights
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stock.aiInsights}
                    </Typography>
                  </Box>

                  {/* ⚠ WATCHOUT */}
                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ⚠ Watchout
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#d32f2f" }}>
                      {stock.aiWatchout}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 🪫 NO DATA */}
      {!loading && data?.length === 0 && (
        <Box textAlign="center" mt={5}>
          <Typography>No stocks found</Typography>
        </Box>
      )}
    </Box>
  );
}
