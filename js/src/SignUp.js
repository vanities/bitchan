import React from 'react';
import { Button, Form, FormGroup, Label, Input } from 'reactstrap';

const SignUp = (props) => {
  return (
    <Form>
      <FormGroup>
        <Label for="username">Username</Label>
        <Input
          type="username"
          name="username"
          id="username"
          placeholder="a username, optional"
        />
      </FormGroup>
      <Button>Submit</Button>
    </Form>
  );
};

export default SignUp;
