import * as React from "react";
import { CardColumns } from "reactstrap";

import { drizzleReactHooks } from "@drizzle/react-plugin";

import { ThreadCard } from "../../thread/retrieve/thread_card";
import { CreateThreadModal } from "../../thread/create/create_thread_modal";

export function getLast20ThreadIndexes (call) {
  const numThreads = 20;
  const threadIndexes = [];
  let index;

  for (let thread = 0; thread <= numThreads; thread++) {
    index = call("Bitchan", "lastThreads", thread);
    if (index) {
      threadIndexes.push(index);
    }
  }
  return threadIndexes;
}
export function getLast20Threads (call, indexes) {
  const threads = [];
  let indexOfThread;

  for (let index = 0; index < indexes.length; index++) {
    indexOfThread = indexes[index];

    if (indexOfThread === "0") {
      return threads;
    }
    threads.push(call("Bitchan", "threads", indexOfThread));
  }
  return threads;
}

export function Catalog (props, context) {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const threadIndexes = useCacheCall(["Bitchan"], (call) =>
    getLast20ThreadIndexes(call)
  );
  const threads = useCacheCall(["Bitchan"], (call) =>
    getLast20Threads(call, threadIndexes)
  );

  let createThread = null;

  createThread = <CreateThreadModal buttonLabel="Create Thread" />;

  return (
    <div className="catalog">
      {createThread}
      <CardColumns style={{ backgroundColor: "black", borderColor: "#333" }}>
        {threads.map((thread) => (
          <ThreadCard
            key=""
            subject={thread ? thread[0] : "loading"}
            text={thread ? thread[1] : "loading"}
            image={thread ? thread[2] : "loading"}
            threadId={thread ? thread[5] : 0}
          />
        ))}
      </CardColumns>
    </div>
  );
}
