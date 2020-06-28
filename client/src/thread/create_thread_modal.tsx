import React, { useState } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

import "./create_thread_modal.css";
import { CreateThread } from "./create_thread";

export const CreateThreadModal = (props) => {
  const { buttonLabel, className } = props;

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
    <div className="createthreadmodal">
      <Button onClick={toggle}>{buttonLabel}</Button>
      <Modal
        isOpen={modal}
        toggle={toggle}
        className={className}
        external={externalCloseBtn}
      >
        <ModalHeader toggle={toggle} close={closeBtn}>
          create a thread
        </ModalHeader>
        <ModalBody>
          <CreateThread />
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            type="submit"
            form="createthread"
            onClick={toggle}
          >
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
