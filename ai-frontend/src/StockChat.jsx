import { useState } from "react";

export default function StockChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    const res = await fetch("http://localhost:5000/chat-stock", {
      method: "POST",
      body: JSON.stringify({ message: input }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "ai", text: data.reply },
    ]);

    setInput("");
  };
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h2>📊 AI Stock Assistant</h2>

      <div style={{ minHeight: 300 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "8px 0" }}>
            <b>{m.role}:</b> {m.text}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Analyze TCS / INFY / RELIANCE"
        style={{ width: "100%", padding: 10 }}
      />

      <button onClick={sendMessage} style={{ marginTop: 10 }}>
        Send
      </button>
    </div>
  );
}
