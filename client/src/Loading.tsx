import React, { Component, Children } from "react";

export default class Loading extends Component {
  constructor(props, context) {
    super(props);
  }

  render() {
    if (this.props.web3.status === "failed") {
      return (
        // Display a web3 warning.
        <main>
          <h1>⚠️</h1>
          <p>
            This browser has no connection to the Ethereum network. Please use
            the Chrome/FireFox extension MetaMask, or dedicated Ethereum
            browsers Mist or Parity.
          </p>
        </main>
      );
    }

    if (this.props.drizzleStatus.initialized) {
      // Load the dapp.
      return Children.only(this.props.children);
    }

    return (
      // Display a loading indicator.
      <main>
        <h1>⚙️</h1>
        <p>Loading dapp...</p>
      </main>
    );
  }
}
