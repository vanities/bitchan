import React, { Component } from "react";
//import Web3 from 'web3';
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText,
} from "reactstrap";

import { drizzleReactHooks } from '@drizzle/react-plugin'
import PropTypes from "prop-types";

// https://www.dappuniversity.com/articles/ethereum-dapp-react-tutorial
//

export default class TopNav extends Component {
  constructor(props, context) {
    super(props, context);
    this.drizzleState = drizzleReactHooks.useDrizzleState((drizzleState) => ({
      account: drizzleState.accounts[0],
    }));
  }
  render() {
    return (
      <div>
        <Navbar color="dark" dark expand="md">
          <NavbarBrand href="/">bitchan</NavbarBrand>
          <Nav className="mr-auto" navbar>
            <NavItem>
              <NavLink href="/board">Board</NavLink>
            </NavItem>
          </Nav>
          <NavbarText>
            {this.drizzleState.account} on {this.drizzleState.network}
          </NavbarText>
        </Navbar>
      </div>
    );
  }
}

TopNav.contextTypes = {
  web3: PropTypes.object,
};
