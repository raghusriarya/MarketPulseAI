import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

function StockChart({ prices }) {
  const chartRef = useRef();

  useEffect(() => {
    if (!prices || prices.length === 0) return;

    const chart = createChart(chartRef.current, {
      height: 400,
      layout: {
        background: { color: "#0b0f19" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
      },

      // ✅ FIX: IST TIME
      localization: {
        timeFormatter: (time) =>
          new Date(time * 1000).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          }),
      },
    });

    // ✅ Candlestick
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00c853",
      downColor: "#ff5252",
      borderUpColor: "#00c853",
      borderDownColor: "#ff5252",
      wickUpColor: "#00c853",
      wickDownColor: "#ff5252",
    });

    // ✅ Volume (separate scale)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    });

    // ✅ Separate layout (NO OVERLAP)
    chart.priceScale("right").applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.3,
      },
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    // ✅ CLEAN DATA
    const formatted = prices
      .filter(
        (p) =>
          p &&
          !isNaN(p.time) &&
          p.open != null &&
          p.high != null &&
          p.low != null &&
          p.close != null,
      )
      .map((p) => ({
        time: Number(p.time),
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
        volume: Number(p.volume || 0),
      }))
      .sort((a, b) => a.time - b.time);

    if (!formatted.length) return;

    // ✅ Set candle data
    candleSeries.setData(formatted);

    // ✅ Set volume data
    volumeSeries.setData(
      formatted.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "#00c853" : "#ff5252",
      })),
    );

    chart.timeScale().fitContent();

    // =========================
    // ✅ TOOLTIP (OHLC + Volume)
    // =========================
    const toolTip = document.createElement("div");
    toolTip.style = `
      position: absolute;
      display: none;
      padding: 8px;
      background: #111827;
      color: white;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
    `;
    chartRef.current.appendChild(toolTip);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        toolTip.style.display = "none";
        return;
      }

      const price = param.seriesPrices.get(candleSeries);
      const volume = param.seriesPrices.get(volumeSeries);

      if (!price) return;

      toolTip.style.display = "block";
      toolTip.style.left = param.point.x + 10 + "px";
      toolTip.style.top = param.point.y + 10 + "px";

      toolTip.innerHTML = `
        <div><b>O:</b> ${price.open.toFixed(2)}</div>
        <div><b>H:</b> ${price.high.toFixed(2)}</div>
        <div><b>L:</b> ${price.low.toFixed(2)}</div>
        <div><b>C:</b> ${price.close.toFixed(2)}</div>
        <div><b>V:</b> ${volume || 0}</div>
      `;
    });

    return () => chart.remove();
  }, [prices]);

  return <div ref={chartRef} style={{ width: "100%" }} />;
}

export default StockChart;
