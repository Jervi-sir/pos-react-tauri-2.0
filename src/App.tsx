import { useState } from "react";
import { runSql } from "./runSql"; // Adjust the path if needed

function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleRunQuery = async () => {
    try {
      const res = await runSql(query);
      setResult(res);
    } catch (err) {
      setResult({ error: err });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Run SQLite Query</h1>
      <textarea
        rows={4}
        cols={60}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type SQL here, e.g. SELECT * FROM users"
      />
      <br />
      <button onClick={handleRunQuery}>Run</button>
      <pre style={{ marginTop: 16, background: "#eee", padding: 12 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

export default App;
