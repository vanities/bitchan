import * as React from "react";
import { Card, CardBody, Button, CardTitle, CardText, CardImg } from "reactstrap";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getReplies (call, numThreads) {
  const threads = [];
  for (var thread = 0; thread <= numThreads; thread++) {
    threads.push(call("Bitchan", "threads", thread));
  }
  return threads;
}

export function Thread (props, context) {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const threads = useCacheCall(["Bitchan"], (call) =>
    getReplies(call, numThreadsGet)
  );

  var createThread = null;

  return (
    <div>
      <Card>
        <CardImg top width="100%" src="/assets/318x180.svg" alt="Card image cap" />
        <CardBody>
          <CardTitle>Card Title</CardTitle>
          <CardText>This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</CardText>
          <CardText>
            <small className="text-muted">Last updated 3 mins ago</small>
          </CardText>
        </CardBody>
      </Card>
      );
}
