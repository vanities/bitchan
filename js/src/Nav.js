import React, { Component } from 'react'
import Web3 from 'web3'
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText
} from 'reactstrap';

// https://www.dappuniversity.com/articles/ethereum-dapp-react-tutorial
//

class TopNav extends Component {
  componentWillMount() {
    this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
    const accounts = await web3.eth.getAccounts()
    const network = await web3.eth.net.getNetworkType()
    this.setState({ account: accounts[0], network })
  }

  constructor(props) {
    super(props)
    this.state = { account: "", network: "" }
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

export default TopNav;
