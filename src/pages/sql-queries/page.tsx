import { useState } from "react";
import { runSql } from "../../runSql";
import { Button } from "@/components/ui/button";

function SqlQueriesPage() {
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
      <div className="flex flex-col items-start">
        <textarea
          rows={4}
          cols={60}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type SQL here, e.g. SELECT * FROM users"
          className="border rounded-xl p-2"
        />
        <br />
        <Button variant={'secondary'} onClick={handleRunQuery}>Run</Button>
        <br />
        <pre className="border rounded-xl p-4" >
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default SqlQueriesPage;
