// Runs on staged files at commit time (via the husky pre-commit hook).
// eslint uses an explicit --config so it resolves from the repo root.
export default {
  "web/**/*.{ts,tsx}": (files) => [
    `prettier --write ${files.join(" ")}`,
    `eslint --fix --config web/eslint.config.js ${files.join(" ")}`,
  ],
  "web/**/*.{json,css,md}": (files) => `prettier --write ${files.join(" ")}`,
};
