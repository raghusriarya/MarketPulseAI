import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

function FuturesOptions() {
  const [data, setData] = useState([]);
  const [pcr, setPcr] = useState(null);
  const [insight, setInsight] = useState(null);
  const [indices, setIndices] = useState([]);
  const [selected, setSelected] = useState("^NSEI");
  const [atm, setAtm] = useState(null);

  // 🔥 Fetch indices
  useEffect(() => {
    fetch("http://localhost:5000/fo/indices")
      .then((res) => res.json())
      .then(setIndices);
  }, []);

  // 🔥 Fetch data
  const fetchData = async (symbol = selected) => {
    const res = await fetch(
      `http://localhost:5000/fo/option-chain?symbol=${symbol}`,
    );
    const json = await res.json();

    setData(json.data || []);
    setPcr(json.pcr);
    setAtm(json.atm);
  };

  const [analyzing, setAnalyzing] = useState(false);

  const analyze = async () => {
    if (!data?.length) return;

    setAnalyzing(true);

    try {
      const res = await fetch("http://localhost:5000/fo/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
          symbol: selected, // 👈 useful for backend logic
        }),
      });

      const json = await res.json();

      if (json.error) {
        console.error(json.error);
        return;
      }

      setInsight(json);
    } catch (err) {
      console.error("Analyze API error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 Max OI for heat bars
  const maxCall = useMemo(
    () => Math.max(...data.map((d) => d.call?.oi || 0), 1),
    [data],
  );

  const maxPut = useMemo(
    () => Math.max(...data.map((d) => d.put?.oi || 0), 1),
    [data],
  );

  const Metric = ({ label, value }) => (
    <Box
      sx={{
        border: "1px solid #30363d",
        p: 1,
        textAlign: "center",
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        {label}
      </Typography>
      <Typography fontWeight={600}>{value || "--"}</Typography>
    </Box>
  );
  return (
    <Box
      sx={{
        fontFamily: "JetBrains Mono",
        color: "#c9d1d9",
        height: "90vh",
        overflow: "scroll",
      }}
    >
      {/* 🔥 Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        {/* 📊 PCR */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Typography>
            PCR:{" "}
            <span
              style={{
                color: pcr > 1 ? "#00e676" : "#ff5252",
                fontWeight: 600,
              }}
            >
              {pcr || "--"}
            </span>
          </Typography>

          <Button
            onClick={analyze}
            disabled={analyzing}
            sx={{
              border: "1px solid #30363d",
              color: "#00e676",
              textTransform: "none",
            }}
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Select
            size="small"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              fetchData(e.target.value);
            }}
            sx={{ color: "#c9d1d9" }}
          >
            {indices.map((i) => (
              <MenuItem key={i.value} value={i.value}>
                {i.label}
              </MenuItem>
            ))}
          </Select>

          <Button onClick={() => fetchData()}>↻</Button>
        </Box>
      </Box>

      {insight && (
        <Box
          sx={{
            mt: 3,
            border: "1px solid #30363d",
            p: 2.5,
            background: "linear-gradient(135deg, #0d1117, #111827)",
            borderRadius: 2,
          }}
        >
          {/* HEADER */}
          <Typography sx={{ fontSize: 11, opacity: 0.6, mb: 1 }}>
            🤖 AI MARKET INSIGHT
          </Typography>

          {/* SIGNAL ROW */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography fontSize={18} fontWeight={600}>
              {insight.signal}
            </Typography>

            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: 12,
                background: insight.signal?.includes("BULL")
                  ? "rgba(0,230,118,0.15)"
                  : insight.signal?.includes("BEAR")
                    ? "rgba(255,82,82,0.15)"
                    : "rgba(255,193,7,0.15)",
                color: insight.signal?.includes("BULL")
                  ? "#00e676"
                  : insight.signal?.includes("BEAR")
                    ? "#ff5252"
                    : "#ffc107",
              }}
            >
              {insight.signal}
            </Box>
          </Box>

          {/* METRICS */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
              mb: 2,
            }}
          >
            <Metric label="PCR" value={insight.pcr} />
            <Metric label="Support" value={insight.support} />
            <Metric label="Resistance" value={insight.resistance} />
          </Box>

          {/* CONFIDENCE BAR */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption">Confidence</Typography>
            <Box sx={{ height: 6, background: "#161b22", mt: 1 }}>
              <Box
                sx={{
                  width: `${insight.confidence || 50}%`,
                  height: "100%",
                  background:
                    insight.confidence > 70
                      ? "#00e676"
                      : insight.confidence > 40
                        ? "#ffc107"
                        : "#ff5252",
                }}
              />
            </Box>
          </Box>

          {/* 🔥 AI SUMMARY */}
          <Box
            sx={{
              p: 1.5,
              border: "1px solid #21262d",
              borderRadius: 1,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Typography sx={{ fontSize: 12, opacity: 0.6, mb: 0.5 }}>
              AI Summary
            </Typography>

            <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
              {insight.aiSummary || insight.message}
            </Typography>

            {insight.aiTrade && (
              <Typography sx={{ fontSize: 13, mt: 1, color: "#00e676" }}>
                🎯 {insight.aiTrade}
              </Typography>
            )}

            {insight.aiRisk && (
              <Typography
                sx={{ fontSize: 12, mt: 1, color: "#ff5252", opacity: 0.8 }}
              >
                ⚠ {insight.aiRisk}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      {/* 🔥 TABLE HEADER */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 120px 1fr",
          borderBottom: "1px solid #30363d",
          pb: 1,
          fontSize: 12,
          position: "sticky",
          top: 0,
          background: "#0d1117",
          zIndex: 1,
        }}
      >
        <span>CALL OI</span>
        <span style={{ textAlign: "center" }}>STRIKE</span>
        <span style={{ textAlign: "right" }}>PUT OI</span>
      </Box>

      {/* 🔥 OPTION CHAIN */}
      <Box sx={{ height: "100%", overflowY: "auto" }}>
        {data.map((row, i) => {
          const isATM = row.strike === atm;

          const callPct = (row.call?.oi || 0) / maxCall;
          const putPct = (row.put?.oi || 0) / maxPut;

          return (
            <Box
              key={i}
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 1fr",
                alignItems: "center",
                borderBottom: "1px solid #161b22",
                backgroundColor: isATM ? "#1f2933" : "transparent",
                fontSize: 13,
                position: "relative",
              }}
            >
              {/* CALL SIDE */}
              <Box sx={{ position: "relative", p: 1 }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: `${callPct * 100}%`,
                    background: "rgba(255,82,82,0.2)",
                  }}
                />
                <span>{row.call?.oi}</span>
              </Box>

              {/* STRIKE */}
              <Box
                sx={{
                  textAlign: "center",
                  fontWeight: isATM ? 700 : 400,
                }}
              >
                {row.strike}
              </Box>

              {/* PUT SIDE */}
              <Box sx={{ position: "relative", p: 1, textAlign: "right" }}>
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    inset: 0,
                    width: `${putPct * 100}%`,
                    background: "rgba(0,230,118,0.2)",
                  }}
                />
                <span>{row.put?.oi}</span>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default FuturesOptions;
