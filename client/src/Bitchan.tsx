import * as React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import { TopNav } from "./nav";
import { Home } from "./home";
import { CreateUser } from "./create_user";
import { Board } from "./board";

export function Bitchan () {
  return (
    <div className="Bitchan">
      <Router>
        <TopNav />
        <Route path="/" />
        <Route path="/home" component={Home} />
        <Route path="/board" component={Board} />
        <Route path="/signup" component={CreateUser} />
      </Router>
    </div>
  );
}
