import * as React from "react";
import { NavLink as Link } from "react-router-dom";
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
  threadId: number;
}

export const ThreadCard: React.FunctionComponent<ThreadProps> = ({
  subject,
  text,
  image,
  threadId
}) => {
  return (
    <Card
      body
      inverse
      style={{ backgroundColor: "black", borderColor: "#333" }}
      className="thread"
    >
      <Button>
        <Link to={`/thread/${threadId}`}>
          <CardImg top width="100%" src={image} alt="caption" />
        </Link>
      </Button>
      <CardBody>
        <CardTitle>{subject}</CardTitle>
        <CardText>{text}</CardText>
      </CardBody>
    </Card>
  );
};
