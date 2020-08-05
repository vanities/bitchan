import React, { useState } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

import "./create_thread_modal.css";
import { CreateThread } from "./create_thread";

export const CreateThreadModal = (props) => {
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
    <div>
      <Button className="createthreadbutton" onClick={toggle}>
        Start a New Thread
      </Button>
      <Modal
        isOpen={modal}
        toggle={toggle}
        className="createthreadmodal"
        external={externalCloseBtn}
        fade={false}
        backdrop={false}
        position="fixed"
      >
        <ModalHeader toggle={toggle} close={closeBtn}>
          New Thread
        </ModalHeader>
        <ModalBody className="creatthreadbody">
          <CreateThread />
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            type="submit"
            form="createthread"
            onClick={toggle}
            style={{ width: true }}
            className="createthreadsubmit"
          >
            Create Thread
          </Button>{" "}
        </ModalFooter>
      </Modal>
    </div>
  );
};
