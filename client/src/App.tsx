import React, { Component } from "react";
import { Drizzle } from '@drizzle/store';
import { DrizzleContext } from "@drizzle/react-plugin";

import { setupDrizzle } from "./drizzle/drizzleSetup.tsx"
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

