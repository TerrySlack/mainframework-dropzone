module.exports = {
  plugins: [
    require("postcss-prefix-selector")({
      prefix: ".file-selector-scope",
      transform(prefix, selector) {
        if (selector.startsWith(prefix)) return selector;
        if (selector === ":root") return prefix;
        return `${prefix} ${selector}`;
      },
    }),
  ],
};
