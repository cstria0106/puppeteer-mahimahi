import { promisify } from "util";
import zlib from "zlib";

const unzip = promisify(zlib.unzip);
const inflateRaw = promisify(zlib.inflateRaw);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * Decompress the buffer
 * @param buffer - Buffer to decompress
 * @param contentEncoding - Content encoding
 * @returns - Decompressed buffer
 */
export const decompress = (
  buffer: Buffer,
  contentEncoding?: "gzip" | "deflate" | "br" | string
): Promise<Buffer> => {
  if (contentEncoding === "gzip") {
    return unzip(buffer);
  } else if (contentEncoding === "deflate") {
    if (buffer.length > 0 && (buffer[0] & 0x08) === 0) {
      return inflateRaw(buffer);
    } else {
      return unzip(buffer);
    }
  } else if (contentEncoding === "br") {
    return brotliDecompress(buffer);
  }

  return Promise.resolve(buffer);
};
