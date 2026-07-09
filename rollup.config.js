import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
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
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        plugins: ["babel-plugin-react-compiler"],
        presets: [
          ["@babel/preset-react", { runtime: "automatic", development: false }],
          ["@babel/preset-typescript"],
        ],
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
];
