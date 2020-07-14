import * as React from "react";
import {useState} from "react";
import {Container, Col, Form, FormGroup, Input} from "reactstrap";
import {drizzleReactHooks} from "@drizzle/react-plugin";

export const Reply = (props, context) => {
  const {indexLastReply} = props;
  const {useCacheSend} = drizzleReactHooks.useDrizzle();
  const {send} = useCacheSend("Bitchan", "replyPost");

  const handleInputChange = (e) => {
    const {name, value} = e.target;
    setValues({...values, [name]: value});
  };

  const handleSubmit = (event) => {
    console.log(values.index + 1, values.text, values.image);
    send(values.index, values.text, values.image);
    event.preventDefault();
  };
  const [values, setValues] = useState({index: 0, text: "", image: ""});

  return (
    <div>
      <Container className="reply">
        <Form id="reply" onSubmit={handleSubmit}>
          <Col>
            <FormGroup>
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
