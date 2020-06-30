import * as React from "react";
import { CardColumns } from "reactstrap";

import { drizzleReactHooks } from "@drizzle/react-plugin";

import "./thread/thread.css";
import { Thread, getThreads } from "./thread/thread";
import { CreateThreadModal } from "./thread/create_thread_modal";

export function Catalog (props, context) {
  const numThreadsGet = 20;
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const threads = useCacheCall(["Bitchan"], (call) =>
    getThreads(call, numThreadsGet)
  );

  return (
    <div>
      <CreateThreadModal buttonLabel="Create Thread" />
      <CardColumns style={{ backgroundColor: "black", borderColor: "#333" }}>
        {threads.map((thread) => (
          <Thread
            subject={thread ? thread[0] : "loading"}
            text={thread ? thread[1] : "loading"}
            image={thread ? thread[2] : "loading"}
          />
        ))}
      </CardColumns>
    </div>
  );
}
