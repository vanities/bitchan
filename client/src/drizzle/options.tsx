import User from "../contracts/User.json";
import Bitchan from "../contracts/Bitchan.json";

export const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: "ws://127.0.0.1:8545"
    }
  },
  contracts: [Bitchan, User]
};
