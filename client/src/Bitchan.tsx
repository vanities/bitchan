import * as React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";

import { Bar } from "./navigation/bar";
import { Home } from "./home";
import { Thread } from "./thread/retrieve/thread";
import { Catalog } from "./catalog/retrieve/catalog";

import "./bitchan.css";

export function Bitchan () {
  return (
    <div className="bitchan">
      <Router>
        <Bar />
        <Route path="/" />
        <Route path="/home" component={Home} />
        <Route path="/catalog" component={Catalog} />
        <Route path="/thread/:threadId" component={Thread} />
      </Router>
    </div>
  );
}
