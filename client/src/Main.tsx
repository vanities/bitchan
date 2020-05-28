import React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import { DrizzleContext } from "@drizzle/react-plugin";
import { TopNav } from "./Nav";
import { Home } from "./Home";

const Board = (props, context) => {
  return "hi";
};

export default () => (
  <DrizzleContext.Consumer>
    {(drizzleContext) => {
      const { drizzle, drizzleState, initialized } = drizzleContext;
      if (!initialized) {
        return "Loading...";
      }

      return (
        <div className="App">
          <Router>
            <TopNav drizzle={drizzle} drizzleState={drizzleState} />
            <Route path="/" component={Home} />
            <Route path="/board" component={Board} />
          </Router>
        </div>
      );
    }}
  </DrizzleContext.Consumer>
);
