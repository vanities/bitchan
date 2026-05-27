// Runs from web/ (see .husky/pre-commit) so eslint/prettier resolve from
// web/node_modules and find their configs here.
export default {
  "**/*.{ts,tsx}": ["prettier --write", "eslint --fix"],
  "**/*.{json,css,md}": ["prettier --write"],
};
