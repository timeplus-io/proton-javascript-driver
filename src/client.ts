import { ProtonConfig, QueryOptions, QueryResult, RowData } from "./types";
import { ndjsonStreamParser } from "./parser";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 3218;

export class ProtonClient {
  private url: string;

  constructor(private config: ProtonConfig = {}) {
    const host = config.host || DEFAULT_HOST;
    const port = config.port || DEFAULT_PORT;
    this.url = `http://${host}:${port}`;
  }

  async query<T = RowData>(sql: string, options?: QueryOptions): Promise<QueryResult<T>> {
    if (!sql || !sql.trim()) {
      throw new Error("SQL query cannot be empty");
    }

    // We use JSONEachRow because it's the most reliable for infinite streaming
    const targetUrl = `${this.url}/?default_format=JSONEachRow`;

    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    if (this.config.username) {
      const auth = Buffer.from(
        `${this.config.username}:${this.config.password || ""}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();

    // Link external signal if provided
    if (options?.signal) {
      options.signal.addEventListener("abort", () => abortController.abort());
    }

    // Set up timeout if configured
    let timeoutId: NodeJS.Timeout | undefined;
    if (this.config.timeout) {
      timeoutId = setTimeout(() => abortController.abort(), this.config.timeout);
    }

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        body: sql,
        headers,
        signal: abortController.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proton Error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      return {
        rows: ndjsonStreamParser<T>(response.body.getReader()),
        abort: () => abortController.abort(),
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Query aborted or timed out");
      }
      throw error;
    }
  }
}