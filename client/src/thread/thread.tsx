import * as React from "react";
import { Card, CardBody, CardTitle, CardText, CardImg } from "reactstrap";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getReplies (call, indexFirstReply) {
  const replies = [];
  var nextIndex = indexFirstReply;
  while (true) {
    var reply = call("Bitchan", "replies", nextIndex);
    if (reply === undefined) {
      break;
    }
    nextIndex = reply[3];
    replies.push(reply);
  }
  return replies;
}

interface ThreadProps {
  threadId: number;
}

export function Thread (props, context) {
  const threadId = props.match.params.threadId;

  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const originalPoster = useCacheCall("Bitchan", "threads", threadId);
  const title = originalPoster ? originalPoster[0] : "loading";
  const text = originalPoster ? originalPoster[1] : "loading";
  const media = originalPoster ? originalPoster[2] : "loading";
  const indexFirstReply = originalPoster ? originalPoster[4] : "loading";
  const _threadId = originalPoster ? originalPoster[5] : "loading";
  const epochTime = originalPoster ? originalPoster[6] : 0;
  var timePosted = new Date(0); // The 0 there is the key, which sets the date to the epoch
  timePosted.setUTCSeconds(epochTime);

  const replies = useCacheCall(["Bitchan"], (call) =>
    getReplies(call, indexFirstReply)
  );

  const opCard = (
    <Card>
      <CardImg top width="100%" src={media} alt="Card image cap" />
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

      {replies.map((reply) => (
        <div>
          <Card>
            <CardImg
              top
              width="100%"
              src="/assets/318x180.svg"
              alt="Card image cap"
            />
            <CardBody>
              <CardTitle>Card Title</CardTitle>
              <CardText>
                This is a wider card with supporting text below as a natural
                lead-in to additional content. This content is a little bit
                longer.
              </CardText>
              <CardText>
                <small className="text-muted">Last updated 3 mins ago</small>
              </CardText>
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
}
