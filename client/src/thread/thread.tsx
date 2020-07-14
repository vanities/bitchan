import * as React from "react";
import {Card, CardBody, CardTitle, CardText, CardImg, Col} from "reactstrap";

import "./thread.css";
import {ReplyModal} from "./reply_modal";

import {drizzleReactHooks} from "@drizzle/react-plugin";

export function getReplies(call, indexLastReply) {
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

export function OpCard(threadInfo, opInfo) {
  return (
    <Card>
      <CardImg
        top
        width="40%"
        src={threadInfo.media}
        alt="Card image cap"
        className="opcard"
      />
      <CardBody>
        <CardTitle>
          {threadInfo.title} {opInfo.username} {opInfo.addr}{" "}
          {threadInfo.timestamp.toString()} No. {threadInfo.threadId}{" "}
        </CardTitle>
        <CardText>{threadInfo.text}</CardText>
      </CardBody>
    </Card>
  );
}

export function replyCard(
  media,
  title,
  username,
  account,
  timestamp,
  postNumber,
  text
) {
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

function getThreadInfo(thread) {
  const title = thread ? thread[0] : "loading";
  const text = thread ? thread[1] : "loading";
  const media = thread ? thread[2] : "loading";
  // const indexFirstReply = originalPoster ? originalPoster[4] : "loading";
  const indexLastReply = thread ? thread[4] : "loading";
  const threadId = thread ? thread[5] : "loading";
  const epochTime = thread ? thread[6] : 0;
  const opAddress = thread ? thread[7] : 0;
  var timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
  timestamp.setUTCSeconds(epochTime);
  return {media, title, timestamp, threadId, text, opAddress, indexLastReply};
}
function getOpInfo(user) {
  const id = user ? user[0] : "loading";
  const addr = user ? user[1] : "loading";
  const username = user ? user[2] : "loading";
  const active = user ? user[3] : "loading";
  const canVote = user ? user[4] : "loading";
  return {id, addr, username, active, canVote};
}

export function Thread(props, context) {
  const threadId = props.match.params.threadId;
  const {useCacheCall} = drizzleReactHooks.useDrizzle();

  const thread = useCacheCall("Bitchan", "threads", threadId);
  const threadInfo = getThreadInfo(thread);

  const op = useCacheCall("User", "usersAddress", threadInfo.opAddress);
  const opInfo = getOpInfo(op);

  const replies = useCacheCall(["Bitchan"], (call) =>
    getReplies(call, threadInfo.indexLastReply)
  );

  console.log(replies);

  return (
    <div className="thread">
      <div className="threadHeader">
        <ReplyModal
          buttonLabel="Reply"
          indexLastReply={threadInfo.indexLastReply}
        />
      </div>
      <div>{OpCard(threadInfo, opInfo)}</div>
      {replies.map((reply) => replyCard(reply[1], reply[0], reply[4]))}
    </div>
  );
}
