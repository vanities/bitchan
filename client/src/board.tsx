import * as React from "react";

import { Catalog } from "./catalog";
// import ReactCSSTransitionGroup from "react-transition-group";

export function Board (props, context) {
  return (
    /*
    <ReactCSSTransitionGroup
      transitionName="example"
      transitionEnterTimeout={500}
      transitionLeaveTimeout={300}
    >
     */
    <div>
      <Catalog />
    </div>
    /*
    </ReactCSSTransitionGroup>
    */
  );
}
