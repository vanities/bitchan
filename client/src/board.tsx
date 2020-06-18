import * as React from "react";
import { useState } from "react";
import { Container, Col, Button, Form, FormGroup, Input } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

export function Board (props, context) {
  const { useCacheCall, useCacheSend } = drizzleReactHooks.useDrizzle();
  // const threads = useCacheCall("Bitchan", "lastThreads");
  const { send } = useCacheSend("Bitchan", "createThread");

  const state = useCacheCall("Bitchan", "threadCount");
  const numThreads = state ? state[0] : "loading";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = (event) => {
    send(values.subject, values.text);
    event.preventDefault();
  };
  const [values, setValues] = useState({ subject: "", text: "" });

  return (
    <div>
      Total # of Threads: {numThreads}
      <Container className="createthread">
        <Form onSubmit={handleSubmit}>
          <h3>post a thread</h3>
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
                type="text"
                name="text"
                placeholder="text"
                onChange={handleInputChange}
                value={values.text}
              />
            </FormGroup>
          </Col>
          <Button>Submit</Button>
        </Form>
      </Container>
    </div>
  );
}
