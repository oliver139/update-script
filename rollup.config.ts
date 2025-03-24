import json from "@rollup/plugin-json";
import del from "rollup-plugin-delete";
import { dts } from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        dir: "dist/cjs",
        format: "cjs",
        sourcemap: false,
      },
      {
        dir: "dist/esm",
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [
      del({ targets: "dist/*" }),
      esbuild({
        minify: true,
        drop: ["console", "debugger"],
      }),
      json(),
    ],
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/cjs/index.d.cts",
        format: "cjs",
      },
      {
        file: "dist/esm/index.d.ts",
        format: "esm",
      },
    ],
    plugins: [dts({
      // https://github.com/Swatinem/rollup-plugin-dts/issues/143
      compilerOptions: { preserveSymlinks: false },
      respectExternal: true,
    })],
  },
];
