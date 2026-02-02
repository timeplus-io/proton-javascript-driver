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