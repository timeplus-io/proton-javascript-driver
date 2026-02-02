# API Reference

## ProtonClient

The main client class for connecting to Timeplus Proton.

### Constructor

```typescript
const client = new ProtonClient(config: ProtonConfig);
```

#### ProtonConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `host` | `string` | No | `"localhost"` | The Proton server hostname or IP address |
| `port` | `number` | No | `3218` | The Proton server HTTP port |
| `username` | `string` | No | - | Username for basic authentication |
| `password` | `string` | No | `""` | Password for basic authentication |
| `timeout` | `number` | No | - | Connection timeout in milliseconds. If not set, no timeout is applied |

#### Examples

**Default connection (localhost:3218):**
```typescript
const client = new ProtonClient();
```

**Custom host and port:**
```typescript
const client = new ProtonClient({
  host: "proton.example.com",
  port: 8123,
});
```

**With authentication:**
```typescript
const client = new ProtonClient({
  host: "proton.example.com",
  username: "admin",
  password: "secret",
});
```

**With timeout:**
```typescript
const client = new ProtonClient({
  timeout: 30000, // 30 seconds
});
```

**Full configuration:**
```typescript
const client = new ProtonClient({
  host: "proton.example.com",
  port: 3218,
  username: "admin",
  password: "secret",
  timeout: 30000,
});
```

---

## client.query()

Executes a SQL query against Proton and returns a streaming result.

### Signature

```typescript
async query<T = RowData>(
  sql: string,
  options?: QueryOptions
): Promise<QueryResult<T>>
```

### Parameters

#### `sql: string`

The SQL query to execute. Cannot be empty or whitespace-only.

#### `options?: QueryOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `signal` | `AbortSignal` | No | An `AbortSignal` for external cancellation control |

### Return Value

#### `QueryResult<T>`

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `AsyncIterableIterator<T>` | An async iterator that yields parsed rows as they arrive |
| `abort` | `() => void` | Function to cancel the query and close the connection |

### Type Parameter

- `T` - The expected row type. Defaults to `RowData` (`Record<string, any>`)

### Examples

**Basic streaming query:**
```typescript
const { rows } = await client.query("SELECT * FROM my_stream");

for await (const row of rows) {
  console.log(row);
}
```

**With typed results:**
```typescript
interface StockTick {
  symbol: string;
  price: number;
  timestamp: string;
}

const { rows } = await client.query<StockTick>(
  "SELECT symbol, price, _tp_time as timestamp FROM stock_ticks"
);

for await (const tick of rows) {
  console.log(`${tick.symbol}: $${tick.price}`);
}
```

**Abort after timeout:**
```typescript
const { rows, abort } = await client.query("SELECT * FROM my_stream");

// Abort after 10 seconds
setTimeout(() => abort(), 10000);

try {
  for await (const row of rows) {
    console.log(row);
  }
} catch (err) {
  console.log("Stream ended:", err.message);
}
```

**Using external AbortController:**
```typescript
const controller = new AbortController();

const { rows } = await client.query(
  "SELECT * FROM my_stream",
  { signal: controller.signal }
);

// Abort from elsewhere
process.on("SIGINT", () => controller.abort());

for await (const row of rows) {
  console.log(row);
}
```

**Bounded query (non-streaming):**
```typescript
// Use table() function for historical queries
const { rows } = await client.query(
  "SELECT * FROM table(my_stream) LIMIT 100"
);

const results = [];
for await (const row of rows) {
  results.push(row);
}
console.log(`Got ${results.length} rows`);
```

---

## ndjsonStreamParser()

Low-level utility function for parsing NDJSON (newline-delimited JSON) streams. Exported for advanced use cases where you need to parse NDJSON from custom sources.

### Signature

```typescript
async function* ndjsonStreamParser<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncIterableIterator<T>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reader` | `ReadableStreamDefaultReader<Uint8Array>` | A stream reader from `response.body.getReader()` |

### Return Value

An `AsyncIterableIterator<T>` that yields parsed JSON objects.

### Behavior

- Handles partial lines split across chunks
- Properly decodes multi-byte UTF-8 characters
- Flushes remaining buffer when stream ends
- Releases the reader lock when done or on error
- Throws descriptive error if JSON parsing fails

### Example

```typescript
import { ndjsonStreamParser } from "@timeplus/proton-javascript-driver";

const response = await fetch("https://example.com/stream");
const reader = response.body!.getReader();

for await (const item of ndjsonStreamParser<MyType>(reader)) {
  console.log(item);
}
```

---

## Types

### RowData

Default type for query results when no type parameter is provided.

```typescript
type RowData = Record<string, any>;
```

### ProtonConfig

Configuration object for the client constructor.

```typescript
interface ProtonConfig {
  host?: string;     // default: "localhost"
  port?: number;     // default: 3218
  username?: string;
  password?: string;
  timeout?: number;
}
```

### QueryOptions

Options for the `query()` method.

```typescript
interface QueryOptions {
  signal?: AbortSignal;
}
```

### QueryResult

Return type of the `query()` method.

```typescript
interface QueryResult<T> {
  rows: AsyncIterableIterator<T>;
  abort: () => void;
}
```

---

## Error Handling

### HTTP Errors

When Proton returns a non-2xx status code, the client throws an error with the format:

```
Proton Error (${status}): ${errorMessage}
```

### Empty Query

Passing an empty or whitespace-only SQL string throws:

```
SQL query cannot be empty
```

### Abort/Timeout

When a query is aborted (via `abort()`, timeout, or external signal), the error thrown is:

```
Query aborted or timed out
```

### JSON Parse Errors

If the server sends malformed JSON, the parser throws:

```
Failed to parse NDJSON line: ${first100chars}...
```

### Example Error Handling

```typescript
try {
  const { rows } = await client.query("INVALID SQL");
  for await (const row of rows) {
    console.log(row);
  }
} catch (err) {
  if (err.message.includes("Proton Error")) {
    console.error("Query failed:", err.message);
  } else if (err.message.includes("aborted")) {
    console.log("Query was cancelled");
  } else if (err.message.includes("Failed to parse")) {
    console.error("Received invalid data:", err.message);
  } else {
    console.error("Unexpected error:", err);
  }
}
```

---

## Authentication

The client supports HTTP Basic Authentication.

### How It Works

When `username` is provided in the config, the client sends an `Authorization` header with each request:

```
Authorization: Basic <base64(username:password)>
```

### Security Considerations

- Credentials are sent with every request
- Always use HTTPS in production to protect credentials in transit
- Do not log or serialize the `ProtonConfig` object as it contains the password
- Consider using environment variables for credentials:

```typescript
const client = new ProtonClient({
  host: process.env.PROTON_HOST,
  port: process.env.PROTON_PORT ? parseInt(process.env.PROTON_PORT) : undefined,
  username: process.env.PROTON_USER,
  password: process.env.PROTON_PASSWORD,
});
```

---

## Connection Management

### Timeouts

The `timeout` config option applies to the initial connection. Once the stream is established, it can run indefinitely (useful for streaming queries).

For streaming queries where you want to limit total duration, use the `abort()` function:

```typescript
const { rows, abort } = await client.query("SELECT * FROM my_stream");

// Limit total streaming time
setTimeout(() => abort(), 60000); // 1 minute max

for await (const row of rows) {
  process.stdout.write(".");
}
```

### Resource Cleanup

The client automatically cleans up resources:
- Reader lock is released when iteration completes or errors
- Aborting a query closes the underlying HTTP connection

For proper cleanup in all scenarios, use try-finally:

```typescript
const { rows, abort } = await client.query("SELECT * FROM my_stream");

try {
  for await (const row of rows) {
    if (shouldStop(row)) {
      abort();
      break;
    }
    process.stdout.write(".");
  }
} catch (err) {
  console.error("Stream error:", err);
}
```
