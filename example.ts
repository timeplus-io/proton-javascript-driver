import { ProtonClient } from "./src";

// Example: Streaming query from Timeplus Proton
//
// Prerequisites:
//   docker run -d -p 3218:3218 timeplus/proton:latest

async function run() {
  const client = new ProtonClient({
    host: "localhost",  // default: "localhost"
    port: 3218,         // default: 3218
    timeout: 30000,     // 30 second connection timeout
  });

  console.log("Connecting to Proton at localhost:3218...");
  try {
    // Ensure the random stream exists
    console.log("Setting up random stream 'us_market_data'...");
    const setupSql = `
      CREATE RANDOM STREAM IF NOT EXISTS us_market_data (
        symbol string default ['AAPL', 'MSFT', 'GOOGL'][rand()%3+1],
        price float64 default rand()%1000/100 + 150
      ) SETTINGS eps=10
    `;
    const { rows: setupRows } = await client.query(setupSql);
    for await (const _ of setupRows) {
      // Wait for setup to complete
    }

    const { rows, abort } = await client.query("SELECT * FROM us_market_data");

    // Example: abort after 10 seconds
    const timeoutId = setTimeout(() => {
      console.log("--- Aborting stream after timeout ---");
      abort();
    }, 10000);

    console.log("--- Streaming results ---");
    try {
      for await (const row of rows) {
        console.log(row);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err.cause?.code === "ECONNREFUSED") {
      console.error("Connection refused. Is Proton running?");
      console.error("Start with: docker run -d -p 3218:3218 timeplus/proton:latest");
    } else if (err.message?.includes("aborted")) {
      console.log("--- Stream ended (aborted) ---");
    } else {
      console.error("Stream failed:", err.message);
    }
  }
}

run();