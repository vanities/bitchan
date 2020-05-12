import React, { Component } from 'react'
import { View, Text } from 'react-native'
import Web3 from 'web3'
import { Navbar, Nav } from 'react-bootstrap';

// https://www.dappuniversity.com/articles/ethereum-dapp-react-tutorial

class App extends Component {
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
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand href="#home">bitchan</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
          </Nav>
          <View>
            <Text>Account: {this.state.account}</Text>
            <Text>{this.state.network}</Text>
          </View>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default App;
