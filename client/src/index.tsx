import { createWeb3ReactRoot, Web3ReactProvider } from "@web3-react/core";
import "inter-ui";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom";
import ReactGA from "react-ga";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import Blocklist from "./components/Blocklist";
import { NetworkContextName } from "./constants";
import App from "./pages/App";
import store from "./state";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import ApplicationUpdater from "./state/application/updater";
import ListsUpdater from "./state/lists/updater";
import MulticallUpdater from "./state/multicall/updater";
import TransactionUpdater from "./state/transactions/updater";
import UserUpdater from "./state/user/updater";
import ThemeProvider, { FixedGlobalStyle, ThemedGlobalStyle } from "./theme";
import getLibrary from "./utils/getLibrary";

const Web3ProviderNetwork = createWeb3ReactRoot(NetworkContextName);

if (!!window.ethereum) {
  window.ethereum.autoRefreshOnNetworkChange = false;
}

window.addEventListener("error", error => {
  ReactGA.exception({
    description: `${error.message} @ ${error.filename}:${error.lineno}:${error.colno}`,
    fatal: true,
  });
});

function Updaters() {
  return (
    <>
      <ListsUpdater />
      <UserUpdater />
      <ApplicationUpdater />
      <TransactionUpdater />
      <MulticallUpdater />
    </>
  );
}

ReactDOM.render(
  <StrictMode>
    <FixedGlobalStyle />
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderNetwork getLibrary={getLibrary}>
        <Blocklist>
          <Provider store={store}>
            <Updaters />
            <ThemeProvider>
              <ThemedGlobalStyle />
              <HashRouter>
                <App />
              </HashRouter>
            </ThemeProvider>
          </Provider>
        </Blocklist>
      </Web3ProviderNetwork>
    </Web3ReactProvider>
  </StrictMode>,
  document.getElementById("root")
);

serviceWorkerRegistration.unregister();
