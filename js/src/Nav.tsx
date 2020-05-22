import React, { Component } from 'react';
//import Web3 from 'web3';
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText,
} from 'reactstrap';
import PropTypes from 'prop-types';

// https://www.dappuniversity.com/articles/ethereum-dapp-react-tutorial
//

class TopNav extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      account: context.web3.selectedAccount,
      network: context.web3.network,
    };
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
            {this.state.account} on {this.state.network}
          </NavbarText>
        </Navbar>
      </div>
    );
  }
}

TopNav.contextTypes = {
  web3: PropTypes.object,
};

export default TopNav;
