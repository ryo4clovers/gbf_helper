import { open, realpath } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 1_048_576;

/** Read optional public local assets only. Displaying an image never collects it. */
export function createLocalImageStore(directory: string) {
  return {
    async get(key: string): Promise<{ bytes: Buffer; contentType: string } | undefined> {
      if (!/^(job|character|weapon|summon|ability|bufficon)\/[A-Za-z0-9][A-Za-z0-9_-]*\.(jpg|png)$/.test(key)) return undefined;
      try {
        const root = await realpath(directory);
        const target = await realpath(path.join(root, key));
        const relative = path.relative(root, target);
        if (relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
        const handle = await open(target, "r");
        try {
          const stat = await handle.stat();
          if (!stat.isFile() || stat.size > MAX_BYTES) return undefined;
          // Bound allocation and reject growth after stat() instead of reading an unbounded file.
          const buffer = Buffer.alloc(stat.size + 1);
          let length = 0;
          while (length < buffer.length) {
            const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
            if (!bytesRead) break;
            length += bytesRead;
          }
          if (length > stat.size) return undefined;
          const bytes = buffer.subarray(0, length);
          const png = key.endsWith(".png");
          const valid = png ? bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
            : bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
          return valid ? { bytes, contentType: png ? "image/png" : "image/jpeg" } : undefined;
        } finally { await handle.close(); }
      } catch (error) {
        if (["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) return undefined;
        throw error;
      }
    },
  };
}
