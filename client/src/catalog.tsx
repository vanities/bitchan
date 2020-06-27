import * as React from "react";
import {
  Card,
  CardImg,
  CardText,
  CardBody,
  CardTitle,
  CardGroup,
  Button
} from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

function getThreads (call, numThreads) {
  const threads = [];
  for (var thread = 0; thread <= numThreads; thread++) {
    threads.push(call("Bitchan", "threads", thread));
  }
  return threads;
}

const Thread = (props) => {
  return (
    <div>
      <Card body inverse style={{ backgroundColor: "#333", borderColor: "#333" }}>
        <Button>
          <CardImg top width="10%" src={props.image} alt="caption" />
        </Button>
        <CardBody>
          <CardTitle>{props.subject}</CardTitle>
          <CardText>{props.text}</CardText>
        </CardBody>
      </Card>
    </div>
  );
};

export function Catalog (props, context) {
  const numThreadsGet = 20;
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const threads = useCacheCall(["Bitchan"], (call) =>
    getThreads(call, numThreadsGet)
  );
  const threadCount = useCacheCall("Bitchan", "threadCount");
  const numThreads = threadCount ? threadCount[0] : "Loading";
  // const catalog = d;

  return (
    <div>
      <CardGroup>
        {threads.map((thread) => (
          <Thread
            subject={thread ? thread[0] : "loading"}
            text={thread ? thread[1] : "loading"}
            image={thread ? thread[2] : "loading"}
          />
        ))}
      </CardGroup>
    </div>
  );
}
