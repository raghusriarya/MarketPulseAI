import { useEffect, useRef, useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userMsg },
      { role: "ai", text: "" },
    ]);

    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      body: JSON.stringify({ message: userMsg }),
      headers: { "Content-Type": "application/json" },
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (let line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (jsonStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              result += content;

              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "ai",
                  text: result,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat</h2>

      {messages.map((m, i) => (
        <div key={i}>
          <b>{m.role}:</b> {m.text}
        </div>
      ))}

      <div ref={bottomRef} />

      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
