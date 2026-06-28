import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

function withoutReactPlugin(config) {
  const plugins = { ...(config.plugins ?? {}) };
  delete plugins.react;

  return {
    ...config,
    plugins,
    rules: Object.fromEntries(
      Object.entries(config.rules ?? {}).filter(([rule]) => !rule.startsWith("react/"))
    )
  };
}

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "next-env.d.ts"
    ]
  },
  ...nextVitals.map(withoutReactPlugin),
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;
