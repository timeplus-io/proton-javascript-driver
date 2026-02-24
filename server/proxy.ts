import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8001;
const PROTON_URL = 'http://localhost:3218'; // Change to 8123 if using ClickHouse port

app.use(cors());
app.use(express.text()); // To read the SQL string from the request body

// Handle both / and /query for compatibility with driver and old examples
app.post(['/', '/query'], async (req, res) => {
  try {
    const sql = req.body;

    // Forward the request to Proton
    const response = await fetch(`${PROTON_URL}/?default_format=JSONEachRow`, {
      method: 'POST',
      body: sql,
    });

    if (!response.body) throw new Error("No stream from Proton");

    // Set headers for NDJSON streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the Proton stream directly to the Express response
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy active at http://localhost:${PORT}`);
  console.log(`📡 Forwarding to Proton at ${PROTON_URL}`);
});