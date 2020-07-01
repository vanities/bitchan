import * as React from "react";
import { Card, CardImg, CardText, CardBody, CardTitle, Button } from "reactstrap";

import "./thread_card.css";

export function getThreads (call, numThreads) {
  const threads = [];
  for (var thread = 0; thread <= numThreads; thread++) {
    threads.push(call("Bitchan", "threads", thread));
  }
  return threads;
}

interface ThreadProps {
  subject: string;
  text: string;
  img: string;
}

export const ThreadCard: React.FunctionComponent<ThreadProps> = ({
  subject,
  text,
  image
}) => {
  return (
    <Card
      body
      inverse
      style={{ backgroundColor: "black", borderColor: "#333" }}
      className="thread"
    >
      <Button>
        <CardImg top width="100%" src={image} alt="caption" />
      </Button>
      <CardBody>
        <CardTitle>{subject}</CardTitle>
        <CardText>{text}</CardText>
      </CardBody>
    </Card>
  );
};
