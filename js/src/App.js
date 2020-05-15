import React from 'react';
import Web3 from 'web3';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import TopNav from './Nav';
import { userAbi } from './user_abi';

function Board() {
  return <h3>Board</h3>;
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { numUsers: 0 };
  }

  componentWillMount() {
    this.loadBlockchainData();
  }

  async loadBlockchainData() {
    const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
    const contractAddress = '0x0C42Db7ae6230c778B1F6e05AfDF278216EA1B8B';
    const UserContract = new web3.eth.Contract(userAbi, contractAddress);
    const numUsers = await UserContract.methods.getNumUsers().call();
    this.state = { numUsers: numUsers };
  }

  Home() {
    return <h3>Number of users: {() => this.state.numUsers}</h3>;
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
