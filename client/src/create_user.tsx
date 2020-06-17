import * as React from "react";
import { useState } from "react";
import { Container, Col, Button, Form, FormGroup, Input } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

import "./signup.css";

export function CreateUser () {
  const { useCacheSend } = drizzleReactHooks.useDrizzle();
  const { send } = useCacheSend("User", "create");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = (event) => {
    send(values.username);
    event.preventDefault();
  };
  const [values, setValues] = useState({ username: "" });

  return (
    <Container className="app">
      <Form onSubmit={handleSubmit}>
        <h3>sign up</h3>
        <Col>
          <FormGroup>
            <Input
              type="text"
              name="username"
              placeholder="username, optional"
              onChange={handleInputChange}
              value={values.username}
            />
          </FormGroup>
        </Col>
        <Button>Submit</Button>
      </Form>
    </Container>
  );
}
