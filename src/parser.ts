export async function* ndjsonStreamParser<T>(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncIterableIterator<T> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield parseLine<T>(line);
        }
      }
    }

    // Flush remaining buffer after stream ends
    if (buffer.trim()) {
      yield parseLine<T>(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLine<T>(line: string): T {
  try {
    return JSON.parse(line) as T;
  } catch (e) {
    const preview = line.length > 100 ? line.substring(0, 100) + "..." : line;
    throw new Error(`Failed to parse NDJSON line: ${preview}`);
  }
}