export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): string[] {
      buffer += chunk;
      const payloads: string[] = [];
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          if (payload.length > 0) payloads.push(payload);
        }
        newline = buffer.indexOf("\n");
      }
      return payloads;
    },
  };
}
