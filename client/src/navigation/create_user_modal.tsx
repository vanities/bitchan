import * as React from "react";
import { useState } from "react";

import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { CreateUser } from "../create_user";
import "./create_user_modal.css";

export function CreateUserModal (props, context) {
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
    <div className={className}>
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
          <CreateUser />
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            type="submit"
            form="createuser"
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
}
