import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Poll the chain for new posts/moderation events. Convex runs in the cloud, so
// this only works against a PUBLIC rpc (Sepolia), not a local Anvil node.
crons.interval("index chain", { seconds: 30 }, internal.indexer.poll, {});

export default crons;
