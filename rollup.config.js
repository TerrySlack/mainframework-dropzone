import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import postcss from "rollup-plugin-postcss";

export default [
  {
    input: "src/index.ts",
    treeshake: { moduleSideEffects: true },
    output: {
      file: "dist/index.js",
      format: "es",
      sourcemap: true,
      banner: '"use client";',
    },
    plugins: [
      resolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        browser: true,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        declarationDir: undefined,
      }),
      postcss({
        inject: true,  // Injects CSS into <head> at runtime
        minimize: true, // Minify the CSS
      }),
    ],
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
    ],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: [/\.css$/],
  },
];