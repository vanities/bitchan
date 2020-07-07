import * as React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";

import { Bar } from "./navigation/bar";
import { Home } from "./home";
import { Board } from "./board";
import { Thread } from "./thread/thread";

export function Bitchan () {
  return (
    <div className="Bitchan">
      <Router>
        <Bar />
        <Route path="/" />
        <Route path="/home" component={Home} />
        <Route path="/board" component={Board} />
        <Route path="/thread/:threadId" component={Thread} />
      </Router>
    </div>
  );
}
