import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  format: ["esm", "cjs"],
  splitting: true,
  sourcemap: true,
  minify: false,
  dts: true,
});
