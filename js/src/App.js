import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import TopNav from './Nav';

function Home() {
  return <h3>Home</h3>;
}

function Board() {
  return <h3>Board</h3>;
}

export default class App extends React.Component {

    constructor(props) {
      super(props)
      this.state = { account: "", network: "" }
    }

    render() {    
      return (
        <div className="App">
          <Router>
            <div>
              <TopNav />
              <Switch>
                <Route exact path="/">
                  <Home />
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
