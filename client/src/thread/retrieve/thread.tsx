import * as React from "react";
import { Card, CardBody, CardTitle, CardText, CardImg } from "reactstrap";

import "./thread.css";
import { ReplyModal } from "../../reply/create/reply_modal";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getReplies (call, indexFirstReply) {
  const replies = [];
  var index = indexFirstReply;

  while (true) {
    if (index === "0" || index === "loading") {
      return replies;
    }
    var reply = call("Bitchan", "replies", index);
    if (reply) {
      var timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
      timestamp.setUTCSeconds(reply[4].epochTime);
      reply.timestamp = timestamp;
      replies.push(reply);
      index = reply[3]; // next reply
    } else {
      return replies;
    }
    console.log(reply);
  }
}

interface ThreadProps {
  threadId: number;
}

export function OpCard (threadInfo, opInfo) {
  return (
    <Card style={{ backgroundColor: "black", color: "#ddd" }}>
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

export function replyCard (replyInfo) {
  return (
    <Card style={{ backgroundColor: "black", color: "#ddd" }}>
      <CardImg
        top
        width="40%"
        src={replyInfo.media}
        alt="Card image cap"
        className="replycard"
      />
      <CardBody>
        <CardTitle>
          {replyInfo.address} {replyInfo.timestamp.toString()}
        </CardTitle>
        <CardText>{replyInfo.text}</CardText>
      </CardBody>
    </Card>
  );
}

function getThreadInfo (thread) {
  const title = thread ? thread[0] : "loading";
  const text = thread ? thread[1] : "loading";
  const media = thread ? thread[2] : "loading";
  const indexLastReply = thread ? thread[3] : "loading";
  const indexFirstReply = thread ? thread[4] : "loading";
  const threadId = thread ? thread[5] : "loading";
  const epochTime = thread ? thread[6] : 0;
  const opAddress = thread ? thread[7] : 0;
  var timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
  timestamp.setUTCSeconds(epochTime);
  return {
    media,
    title,
    timestamp,
    threadId,
    text,
    opAddress,
    indexFirstReply,
    indexLastReply
  };
}
function getOpInfo (user) {
  const id = user ? user[0] : "loading";
  const addr = user ? user[1] : "loading";
  const username = user ? user[2] : "loading";
  const active = user ? user[3] : "loading";
  const canVote = user ? user[4] : "loading";
  const opInfo = { id, addr, username, active, canVote };
  return opInfo;
}
function getReplyInfo (reply) {
  const text = reply ? reply[0] : "loading";
  const media = reply ? reply[1] : "loading";
  const replyTo = reply ? reply[2] : "loading";
  const nextReply = reply ? reply[3] : "loading";
  const epochTime = reply ? reply[4] : "loading";
  const address = reply ? reply[5] : "loading";
  var timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
  timestamp.setUTCSeconds(epochTime);
  return {
    text,
    media,
    replyTo,
    nextReply,
    timestamp,
    address
  };
}

export function Thread (props, context) {
  const threadId = props.match.params.threadId;
  const { useCacheCall } = drizzleReactHooks.useDrizzle();

  const thread = useCacheCall("Bitchan", "threads", threadId);
  const threadInfo = getThreadInfo(thread);

  const op = useCacheCall("User", "usersAddress", threadInfo.opAddress);
  const opInfo = getOpInfo(op);

  const replies = useCacheCall(["Bitchan"], (call) =>
    getReplies(call, threadInfo.indexFirstReply)
  );

  return (
    <div className="thread">
      <div className="threadHeader">
        <ReplyModal buttonLabel="Reply" indexThread={threadId} />
      </div>
      <div>{OpCard(threadInfo, opInfo)}</div>
      {replies.map((reply) => replyCard(getReplyInfo(reply)))}
    </div>
  );
}
