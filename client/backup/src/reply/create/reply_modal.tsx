import React, { useState } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import PropTypes from "prop-types";

import "./reply_modal.css";
import { Reply } from "./reply";

export const ReplyModal = (props) => {
  const { buttonLabel, className, indexThread } = props;

  const [modal, setModal] = useState(false);

  const toggle = () => setModal(!modal);

  const externalCloseBtn = (
    <button
      className="close"
      style={{ position: "absolute", top: "15px", right: "15px" }}
      onClick={toggle}
    >
      &times;
    </button>
  );
  const closeBtn = (
    <button className="close" onClick={toggle}>
      &times;
    </button>
  );
  return (
    <div className="replymodal">
      <Button onClick={toggle}>{buttonLabel}</Button>
      <Modal
        isOpen={modal}
        toggle={toggle}
        className={className}
        external={externalCloseBtn}
      >
        <ModalHeader toggle={toggle} close={closeBtn}>
          reply
        </ModalHeader>
        <ModalBody>
          <Reply indexThread={indexThread} />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" type="submit" form="reply" onClick={toggle}>
            Submit
          </Button>{" "}
          <Button color="secondary" onClick={toggle}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

ReplyModal.propTypes = {
  buttonLabel: PropTypes.string,
  className: PropTypes.string,
  indexThread: PropTypes.number
};
