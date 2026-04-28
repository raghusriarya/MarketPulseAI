import { useState } from "react";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState(null);

  const fetchStock = async () => {
    const res = await fetch("http://localhost:5000/analyze-stock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    const result = await res.json();
    setData(result);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="TCS / INFY"
      />

      <button onClick={fetchStock}>Analyze</button>

      {data && (
        <div>
          <h3>{data.stock.name}</h3>
          <p>Price: {data.stock.price}</p>
          <p>Change: {data.stock.change}%</p>

          <h4>AI:</h4>
          <p>{data.analysis}</p>
        </div>
      )}
    </div>
  );
}
