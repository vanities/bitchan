import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { Web3Provider } from 'react-web3';
import { Web3Unavailable } from './Web3Unavailable';



ReactDOM.render(
  <React.StrictMode>
    <Web3Provider
      web3UnavailableScreen={Web3Unavailable}
      accountUnavailableScreen={Web3Unavailable}
    >
      <App />
    </Web3Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
