// Convex injects `process.env` into the function runtime, but the Convex
// tsconfig deliberately omits @types/node. Declare just what we read.
declare const process: { env: Record<string, string | undefined> };
