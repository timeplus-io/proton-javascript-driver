# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build    # Compile TypeScript to dist/
npm run clean    # Remove dist/ directory
npm run start    # Run example.ts with ts-node
```

## Architecture

This is a streaming REST client for Timeplus Proton, a real-time database. The client uses HTTP streaming with NDJSON (newline-delimited JSON) format to handle potentially infinite result streams.

### Core Components

- **ProtonClient** (`src/client.ts`): Main client class. Sends SQL queries via POST to Proton's HTTP interface with `JSONEachRow` format. Returns an async iterator for streaming consumption.

- **ndjsonStreamParser** (`src/parser.ts`): Async generator that parses chunked NDJSON responses. Buffers partial lines across chunks and yields complete JSON objects as they arrive.

- **Types** (`src/types.ts`): Configuration interface (`ProtonConfig`) and row data types.

### Data Flow

1. `ProtonClient.query(sql)` sends POST request to `{baseUrl}/?default_format=JSONEachRow`
2. Response body stream is passed to `ndjsonStreamParser`
3. Parser yields each JSON row as it arrives, enabling `for await...of` consumption
4. Supports optional basic auth via `username`/`password` config

### Query API

`query()` returns a `QueryResult` object with:
- `rows`: AsyncIterableIterator for streaming consumption
- `abort()`: Function to cancel the query and close the connection

Configuration options:
- `host`: Server hostname (default: "localhost")
- `port`: Server port (default: 3128)
- `timeout`: Connection timeout in milliseconds
- `username`/`password`: Optional basic auth credentials
