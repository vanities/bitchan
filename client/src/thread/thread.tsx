import * as React from "react";
import { Card, CardBody, CardTitle, CardText, CardImg, Col } from "reactstrap";

import "./thread.css";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getReplies (call, indexLastReply) {
  const replies = [];
  for (let replyIndex = 1; replyIndex < indexLastReply; replyIndex++) {
    var reply = call("Bitchan", "replies", replyIndex);
    if (reply) {
      replies.push(reply);
    }
  }
  return replies;
}

interface ThreadProps {
  threadId: number;
}

export function replyCard (media, text, timestamp) {
  return (
    <Col sm="6">
      <Card>
        <CardImg top width="100%" src={media} alt="Card image cap" />
        <CardBody>
          <CardText>{text}</CardText>
          <CardText>
            <small className="text-muted">{timestamp}</small>
          </CardText>
        </CardBody>
      </Card>
    </Col>
  );
}

export function Thread (props, context) {
  const threadId = props.match.params.threadId;

  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const originalPoster = useCacheCall("Bitchan", "threads", threadId);
  const title = originalPoster ? originalPoster[0] : "loading";
  const text = originalPoster ? originalPoster[1] : "loading";
  const media = originalPoster ? originalPoster[2] : "loading";
  const indexFirstReply = originalPoster ? originalPoster[4] : "loading";
  const indexLastReply = originalPoster ? originalPoster[5] : "loading";
  const _threadId = originalPoster ? originalPoster[5] : "loading";
  const epochTime = originalPoster ? originalPoster[6] : 0;
  var timePosted = new Date(0); // The 0 there is the key, which sets the date to the epoch
  timePosted.setUTCSeconds(epochTime);

  const replies = useCacheCall(["Bitchan"], (call) =>
    getReplies(call, indexLastReply)
  );

  console.log(replies);

  const opCard = (
    <Card>
      <CardImg
        top
        width="40%"
        src={media}
        alt="Card image cap"
        className="opcard"
      />
      <CardBody>
        <CardTitle>{title}</CardTitle>
        <CardText>{text}</CardText>
        <CardText>
          <small className="text-muted">{timePosted.toString()}</small>
        </CardText>
      </CardBody>
    </Card>
  );

  return (
    <div>
      <div>{opCard}</div>
      <div> {/* postReplyButton */} </div>
      {replies.map((reply) => replyCard(reply[1], reply[0], reply[4]))}
    </div>
  );
}
