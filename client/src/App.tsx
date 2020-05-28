import React, { Component } from "react";
import { DrizzleContext } from "@drizzle/react-plugin";

import { setupDrizzle } from "./drizzle/drizzleSetup";
import Main from "./Main";

const drizzle = setupDrizzle();

export default class App extends Component {
  render() {
    return (
      <DrizzleContext.Provider drizzle={drizzle}>
        <Main />
      </DrizzleContext.Provider>
    );
  }
}
