import * as React from 'react';
import { Button, Form, FormGroup, Label, Input, FormText } from 'reactstrap';
import {drizzleReactHooks} from "@drizzle/react-plugin";

function signUp(){
    return (<Form>
      <FormGroup>
        <Label for="exampleEmail">Email</Label>
        <Input type="text" name="username" id="username" placeholder="enter" />
      </FormGroup>
    </Form>)
}

export function createUser(props) {
  const {useCacheCall} = drizzleReactHooks.useDrizzle();

  return signUp()

}
