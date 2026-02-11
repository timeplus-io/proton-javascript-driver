# @timeplus/proton-javascript-driver

A streaming REST client for [Timeplus Proton](https://github.com/timeplus-io/proton), designed for real-time SQL queries with infinite result streams.

visit https://timeplus-io.github.io/vistral/ for examples and playground

## Installation

```bash
npm install @timeplus/proton-javascript-driver
```

## Usage

```typescript
import { ProtonClient } from "@timeplus/proton-javascript-driver";

const client = new ProtonClient({
  host: "localhost",  // optional, default: "localhost"
  port: 3218,         // optional, default: 3218
  timeout: 30000,     // optional: connection timeout in ms
});

// Execute a streaming query
const { rows, abort } = await client.query(
  "SELECT * FROM my_stream"
);

// Consume results as they arrive
for await (const row of rows) {
  console.log(row);
}

// Or abort the stream when needed
setTimeout(() => abort(), 10000);
```

## Configuration

```typescript
interface ProtonConfig {
  host?: string;         // Proton server host (default: "localhost")
  port?: number;         // Proton server port (default: 3218)
  username?: string;     // Optional basic auth username
  password?: string;     // Optional basic auth password
  timeout?: number;      // Connection timeout in milliseconds
}
```

## API

### `client.query<T>(sql, options?)`

Executes a SQL query and returns a streaming result.

**Parameters:**
- `sql` - SQL query string
- `options.signal` - Optional `AbortSignal` for external cancellation

**Returns:** `Promise<QueryResult<T>>`
- `rows` - `AsyncIterableIterator<T>` for streaming consumption
- `abort()` - Function to cancel the query

### `ndjsonStreamParser<T>(reader)`

Low-level NDJSON parser exposed for custom use cases.

```typescript
import { ndjsonStreamParser } from "@timeplus/proton-javascript-driver";

const response = await fetch(url);
const reader = response.body.getReader();

for await (const row of ndjsonStreamParser(reader)) {
  console.log(row);
}
```

## Documentation

See [docs/API.md](docs/API.md) for complete API reference including:
- All configuration options
- Authentication setup
- Type definitions
- Error handling
- Connection management

## Requirements

- Node.js >= 16.0.0
- Timeplus Proton server

## License

Apache-2.0
