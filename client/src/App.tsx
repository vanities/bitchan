import React from "react";
import {DrizzleContext} from "@drizzle/react-plugin";

import {setupDrizzle} from "./drizzle/drizzleSetup";
import {Bitchan} from "./Bitchan";

const drizzle = setupDrizzle();

export default class App extends React.Component {
  render() {
    return (
      <DrizzleContext.Provider drizzle={drizzle}>
        <Bitchan />
      </DrizzleContext.Provider>
    );
  }
}
