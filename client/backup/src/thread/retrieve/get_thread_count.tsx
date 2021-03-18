import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getThreadCount () {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const state = useCacheCall("Bitchan", "threadCount");
  const numThreads = state ? state[0] : "loading";
  return { numThreads };
}
