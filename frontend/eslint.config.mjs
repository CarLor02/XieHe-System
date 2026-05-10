import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript 相关规则
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "off", // 在 Next.js 中通常不需要

      // 代码质量
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": "off", // 使用 TypeScript 版本
      "no-console": "warn",
      "no-debugger": "error",

      // 命名规范
      "camelcase": ["error", { "properties": "never", "ignoreDestructuring": true }],

      // React 相关
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js 相关
      "@next/next/no-img-element": "error"
    }
  }
];

export default eslintConfig;
