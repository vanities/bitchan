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
    const contract_abi = [
    {
      "inputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "userCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "users",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "getOwner",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "retrieve",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "internalType": "string",
          "name": "_username",
          "type": "string"
        }
      ],
      "name": "create",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
    const UserContract = await new web3.eth.Contract(contract_abi, "0x5197D017Af1847e05e2b21d9EA6babA2F6007418");
    const num_users = UserContract.methods.getNumUsers().call();
    this.setState({ account: accounts[0], network: network, num_users: num_users })
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
