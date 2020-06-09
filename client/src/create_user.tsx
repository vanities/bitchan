import * as React from 'react';
import { Container, Col, Button, Form, FormGroup, Label, Input  } from 'reactstrap';
import {drizzleReactHooks} from "@drizzle/react-plugin";
import "./signup.css"

function signUp(){

  const handleSubmit = event => {
    alert("ok")
    event.preventDefault()
  }
    return (
 <Container className="app">
    <Form onSubmit={handleSubmit}>
      <h3>sign up
      </h3>
  <Col>
      <FormGroup>
        <Label for="username">username</Label>
        <Input type="text" name="username" id="username" placeholder="enter" />
      </FormGroup>
  </Col>
<Button>Submit</Button>
    </Form>
 </Container>

        )
}

export function createUser(props) {
  const {useCacheCall} = drizzleReactHooks.useDrizzle();

  return signUp()

}
