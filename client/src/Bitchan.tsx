import * as React from "react";
import {Route, BrowserRouter as Router} from "react-router-dom";
import {DrizzleContext} from "@drizzle/react-plugin";
import {TopNav} from "./Nav";
import {Home} from "./Home";

const Board = (props, context) => {
  return "hi";
};

export function Bitchan() {
  return (
    <DrizzleContext.Consumer>
      {(drizzleContext) => {
        const {drizzle, drizzleState, initialized} = drizzleContext;
        if (!initialized) {
          return "Loading...";
        }

        return (
          <div className="Bitchan">
            <Router>
              <TopNav drizzle={drizzle} drizzleState={drizzleState} />
              <Route
                path="/"
                render={(props) => <Home {...drizzleContext} />}
              />
              <Route path="/board" component={Board} />
            </Router>
          </div>
        );
      }}
    </DrizzleContext.Consumer>
  );
}
