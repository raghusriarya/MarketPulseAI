import { Box, Button, Container, Divider, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useState } from "react";
import FuturesOptions from "./FuturesOptions";
import StockCard from "./StockCard";
import StockSearch from "./StockSearch";
import TopStocksAI from "./TopStocksDashboard";

// function TabPanel({ children, value, index }) {
//   return value === index && <Box sx={{ mt: 3 }}>{children}</Box>;
// }

// ✅ Sample stock list (extend later via API)
const stockOptions = [
  { label: "Infosys", value: "INFY" },
  { label: "Reliance Industries", value: "RELIANCE" },
  { label: "TCS", value: "TCS" },
  { label: "HDFC Bank", value: "HDFCBANK" },
  { label: "ICICI Bank", value: "ICICIBANK" },
  { label: "Wipro", value: "WIPRO" },
  { label: "SBI", value: "SBIN" },
];
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      sx={{ flex: 1, width: "100%" }}
      {...other}
    >
      {value === index && <Box sx={{ p: 3, width: "100%" }}>{children}</Box>}
    </Box>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}
function App() {
  const [tab, setTab] = useState(0);
  const [selectedStock, setSelectedStock] = useState(null);
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const sendMessage = async () => {
    const symbol = selectedStock?.value || input;

    if (!symbol) return;

    setLoading(true);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/chat-stock`, {
      method: "POST",
      body: JSON.stringify({ message: symbol }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await res.json();
    setLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setData(result);
  };

  return (
    <Container maxWidth="lg">
      {/* Header */}
      {/* <Typography variant="h5" fontWeight="bold" align="center">
        MarketPulse AI
      </Typography> */}
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          backgroundColor: "background.default",
          color: "text.primary",
        }}
      >
        {/* 🔥 Sidebar */}
        <Box
          sx={{
            width: 200,
            borderRight: "1px solid #30363d",
            p: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              background: "linear-gradient(270deg, #ff4d4f, #52c41a, #ff4d4f)",
              backgroundSize: "400% 400%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradientMove 4s ease infinite",
              "@keyframes gradientMove": {
                "0%": { backgroundPosition: "0% 50%" },
                "50%": { backgroundPosition: "100% 50%" },
                "100%": { backgroundPosition: "0% 50%" },
              },
            }}
          >
            MarketPulse AI
          </Typography>
          <Divider />
          {["Stock Insights", "F&O", "Equities"].map((item, i) => (
            <Box
              key={i}
              onClick={() => setValue(i)}
              sx={{
                p: 1,
                cursor: "pointer",
                borderRadius: 1,
                fontSize: "14px",
                backgroundColor: value === i ? "#21262d" : "transparent",
                "&:hover": { backgroundColor: "#21262d" },
              }}
            >
              {item}
            </Box>
          ))}
        </Box>

        {/* 🔥 Main Panel */}
        <Box sx={{ flex: 1, p: 2 }}>
          {/* Header */}
          {/* <Typography sx={{ mb: 2, opacity: 0.7 }}>
            Market Terminal
          </Typography> */}

          {/* 🔍 Search */}
          {value === 0 && (
            <>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  border: "1px solid #30363d",
                  p: 2,
                  backgroundColor: "#0d1117",
                }}
              >
                {/* 🔍 Search */}
                <Box sx={{ flex: 1 }}>
                  <StockSearch onSelect={(val) => setSelectedStock(val)} />
                </Box>

                {/* 🚀 Analyze Button */}
                <Button
                  variant="contained"
                  onClick={sendMessage}
                  disabled={loading}
                  sx={{
                    height: 40,
                    minWidth: 120,
                    fontFamily: "JetBrains Mono",
                    textTransform: "none",
                    color: "white",
                    backgroundColor: "#238636",
                    "&:hover": {
                      backgroundColor: "#2ea043",
                    },
                  }}
                >
                  {loading ? "Analyzing..." : "Analyze"}
                </Button>
              </Box>

              {/* 📊 Output */}
              {data && (
                <Box
                  sx={{
                    mt: 2,
                    border: "1px solid #30363d",
                    p: 2,
                  }}
                >
                  <StockCard data={data} />
                </Box>
              )}
            </>
          )}

          {value === 1 && (
            <Box
              sx={{
                minHeight: "600px", // 🔥 IMPORTANT FIX
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <FuturesOptions />
            </Box>
          )}

          {value === 2 && (
            <Box sx={{ border: "1px solid #30363d", p: 2 }}>
              <TopStocksAI />
            </Box>
          )}
        </Box>
      </Box>
      {/* Tabs */}
      {/* <Tabs value={tab} onChange={(e, v) => setTab(v)} centered sx={{ mt: 2 }}>
        <Tab label="Stock Insights" />
        <Tab label="Futures & Options" />
        <Tab label="Equities" />
      </Tabs> */}

      {/* <TabPanel value={tab} index={0}>
        <Paper sx={{ p: 2, display: "flex", gap: 2 }}>
          <StockSearch onSelect={(val) => setSelectedStock(val)} />

          <Button variant="contained" onClick={sendMessage}>
            {loading ? "Loading..." : "Analyze"}
          </Button>
        </Paper>

        {data && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 3,
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 500 }}>
              <StockCard data={data} />
            </Box>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Paper sx={{ p: 3 }}>🚧 Futures & Options coming soon</Paper>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Paper sx={{ p: 3 }}>
          <TopStocksAI />
        </Paper>
      </TabPanel> */}
    </Container>
  );
}

export default App;
