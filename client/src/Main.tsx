import React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import { DrizzleContext } from "@drizzle/react-plugin";
import { TopNav } from "./Nav";
import { Home } from "./Home";

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
          </Router>
        </div>
      );
    }}
  </DrizzleContext.Consumer>
);
