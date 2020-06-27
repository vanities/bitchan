import * as React from "react";
import {useState} from "react";
import {
  Card,
  CardImg,
  CardText,
  CardBody,
  CardTitle,
  CardSubtitle,
  Button,
  Table,
} from "reactstrap";
import {drizzleReactHooks} from "@drizzle/react-plugin";

function getThreads(call, numThreads) {
  const threads = [];
  for (var thread = 0; thread <= numThreads; thread++) {
    threads.push(call("Bitchan", "threads", thread));
  }
  return threads;
}

const Thread = (subject, text, image) => {
  return (
    <div>
      <Card>
        <CardImg top width="100%" src={img} alt="Card image cap" />
        <CardBody>
          <CardTitle>{subject}</CardTitle>
          <CardSubtitle>Card subtitle</CardSubtitle>
          <CardText>{text}</CardText>
          <Button>Button</Button>
        </CardBody>
      </Card>
    </div>
  );
};

export function Catalog(props, context) {
  const numThreadsGet = 20;
  const {useCacheCall} = drizzleReactHooks.useDrizzle();
  const threads = useCacheCall(["Bitchan"], (call) =>
    getThreads(call, numThreadsGet)
  );
  const threadCount = useCacheCall("Bitchan", "threadCount");
  const numThreads = threadCount ? threadCount[0] : "Loading";
  //const catalog = d;

  return (
    <div>
      <Table bordered>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Text</th>
            <th>Image</th>
          </tr>
        </thead>
        {threads.map((thread) => (
          <tbody>
            <tr>
              Subject: {thread ? thread[0] : "loading"}
              {thread ? thread[1] : "loading"}
              {thread ? thread[2] : "loading"}
            </tr>
          </tbody>
        ))}
      </Table>
    </div>
  );
}
