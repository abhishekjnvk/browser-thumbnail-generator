import { defineConfig } from "tsup";

export default defineConfig([
  // Standard build (unminified, with sourcemaps)
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "es2020",
    outExtension({ format }) {
      return {
        js: format === "cjs" ? ".cjs" : ".js",
      };
    },
  },
  // Minified ESM build
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    minify: true,
    target: "es2020",
    outExtension() {
      return { js: ".min.js" };
    },
  },
]);
