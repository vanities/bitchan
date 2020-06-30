import * as React from "react";
import { useState } from "react";
import { Container, Col, Form, FormGroup, Input } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

export const CreateThread = (props, context) => {
  const { useCacheSend } = drizzleReactHooks.useDrizzle();
  const { send } = useCacheSend("Bitchan", "createThread");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = (event) => {
    send(values.subject, values.text, values.image);
    event.preventDefault();
  };
  const [values, setValues] = useState({ subject: "", text: "", image: "" });

  return (
    <div>
      <Container className="createthread">
        <Form id="createthread" onSubmit={handleSubmit}>
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
              <Input
                type="text"
                name="image"
                placeholder="image"
                onChange={handleInputChange}
                value={values.image}
              />
            </FormGroup>
          </Col>
        </Form>
      </Container>
    </div>
  );
};
