import * as React from "react";
import { Card, CardBody, CardTitle, CardText, CardImg } from "reactstrap";
import Blockies from "react-blockies";
import PropTypes from "prop-types";

import "./thread.css";
import { ReplyModal } from "../../reply/create/reply_modal";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function getReplies (call, indexFirstReply) {
  const replies = [];
  let index = indexFirstReply;

  while (true) {
    if (index === "0" || index === "loading") {
      return replies;
    }
    const reply = call("Bitchan", "replies", index);
    if (reply) {
      const timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
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

export function OpCard (threadInfo, opInfo) {
  const abbreviatedAccount = `${opInfo.addr.slice(0, 5)}...${opInfo.addr.slice(
    -5,
    -1
  )}`;
  return (
    <Card
      style={{ backgroundColor: "#1D250A", color: "#ABBCC3", fontSize: "0.9rem" }}
    >
      <CardImg
        top
        width="40%"
        src={threadInfo.media}
        alt="Card image cap"
        className="opcard"
      />
      <CardBody>
        <CardTitle>
          <b>{threadInfo.title}</b> {opInfo.username} {abbreviatedAccount}{" "}
          <Blockies seed={opInfo.addr} size={8} scale={2} />{" "}
          {threadInfo.timestamp.toString()} No. {threadInfo.threadId}{" "}
        </CardTitle>
        <CardText>{threadInfo.text}</CardText>
      </CardBody>
    </Card>
  );
}

export function replyCard (replyInfo) {
  const abbreviatedAccount = `${replyInfo.address.slice(
    0,
    5
  )}...${replyInfo.address.slice(-5, -1)}`;
  return (
    <Card
      style={{ backgroundColor: "#1D250A", color: "#ABBCC3", fontSize: "0.9rem" }}
    >
      <CardImg
        top
        width="40%"
        src={replyInfo.media}
        alt="Card image cap"
        className="replycard"
      />
      <CardBody>
        <CardTitle>
          {abbreviatedAccount}{" "}
          <Blockies seed={replyInfo.address} size={8} scale={2} />{" "}
          {replyInfo.timestamp.toString()}
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
  const timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
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
  const timestamp = new Date(0); // The 0 there is the key, which sets the date to the epoch
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

Thread.propTypes = {
  // You can declare that a prop is a specific JS type. By default, these
  // are all optional.
  match: PropTypes.object
};
