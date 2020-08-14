import * as React from "react";
import { useState } from "react";
import { Container, Col, Form, FormGroup, Input } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ipfsClient } from "ipfs-http-client";

async function saveToIpfs ([file]) {
  try {
    console.log("CONNECTING");
    const ipfs = ipfsClient({
      host: "localhost",
      port: "5001",
      protocol: "http",
      apiPath: "/ipfs"
    });
    console.log("CONNECTED");
    const added = await ipfs.add(file, {
      progress: (prog) => console.log(`received: ${prog}`)
    });
    console.log(added);
    return added.cid.toString();
  } catch (err) {
    console.error(err);
  }
}

export const CreateThread = (props, context) => {
  const { useCacheSend } = drizzleReactHooks.useDrizzle();
  const { send } = useCacheSend("Bitchan", "createThread");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const hash = await saveToIpfs([values.upload]);
    // send(values.subject, values.text, values.upload);
  };
  const [values, setValues] = useState({
    subject: "",
    text: "",
    upload: ""
  });

  return (
    <div>
      <Container className="createthread">
        <Form
          id="createthread"
          onSubmit={handleSubmit}
          method="POST"
          enctype="multipart/form-data"
        >
          <Col>
            <FormGroup>
              <Input
                type="text"
                name="subject"
                placeholder="subject"
                onChange={handleInputChange}
                value={values.subject}
              />
              <Input
                type="textarea"
                name="text"
                onChange={handleInputChange}
                value={values.text}
              />
              <Input
                type="file"
                name="upload"
                id="upload"
                onChange={handleInputChange}
              />
            </FormGroup>
          </Col>
        </Form>
      </Container>
    </div>
  );
};
