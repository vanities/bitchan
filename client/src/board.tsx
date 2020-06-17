import * as React from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";

export function Board (props, context) {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const threads = useCacheCall("Bitchan", "lastThreads");

  return <div>{threads}</div>;
}
