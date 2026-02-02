export interface ProtonConfig {
  host?: string;   // Proton server host (default: "localhost")
  port?: number;   // Proton server port (default: 3128)
  username?: string;
  password?: string;
  timeout?: number; // Connection timeout in milliseconds
}

export interface QueryOptions {
  signal?: AbortSignal;
}

export interface QueryResult<T> {
  rows: AsyncIterableIterator<T>;
  abort: () => void;
}

// Result row is a generic object
export type RowData = Record<string, any>;