import React from 'react';
import Web3 from 'web3';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import TopNav from './Nav';
import * as User  from './contracts/User.json';
//import { SignUp } from './SignUp';

function Board() {
  return <h3>Board</h3>;
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { numUsers: 0 };
    this.Home = this.Home.bind(this);
  }

  componentWillMount() {
    this.loadBlockchainData();
  }

  async loadBlockchainData() {
    const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
    // TODO: max this contract Address automatic
    const contractAddress = '0x695f57efefbf06623ea23bffc43909b2e268c5f4';
    const UserContract = new web3.eth.Contract(User.abi, contractAddress);
    const numUsers = await UserContract.methods.getNumUsers().call();
    this.state = { numUsers: numUsers };
  }

  Home() {
    return <h3>Number of users: {this.state.numUsers}</h3>;
  }

  render() {
    return (
      <div className="App">
        <Router>
          <div>
            <TopNav />
            <Switch>
              <Route exact path="/">
                <this.Home />
              </Route>
              <Route exact path="/board">
                <Board />
              </Route>
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}
