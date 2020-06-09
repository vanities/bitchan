import * as React from "react";
import {Route, BrowserRouter as Router} from "react-router-dom";
import {drizzleReactHooks} from "@drizzle/react-plugin";
import {TopNav} from "./nav";
import {Home} from "./home";
import {createUser} from "./create_user";

const Board = (props, context) => {
  return "hi";
};

export function Bitchan() {
  const drizzleState = drizzleReactHooks.useDrizzleState((drizzleState) => ({
    accounts: drizzleState.accounts,
  }));
  const {
    drizzle,
    useCacheCall,
    useCacheEvents,
    useCacheSend,
  } = drizzleReactHooks.useDrizzle();

  return (
    <div className="Bitchan">
      <Router>
        <TopNav drizzle={drizzle} drizzleState={drizzleState} />
        <Route
          path="/"
          render={(props) => (
            <Home drizzle={drizzle} drizzleState={drizzleState} />
          )}
        />
        <Route path="/board" component={Board} />
        <Route path="/signup" component={createUser} />
      </Router>
    </div>
  );
}
