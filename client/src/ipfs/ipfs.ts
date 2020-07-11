// using the infura.io node, otherwise ipfs requires you to run a //daemon on your own computer/server.const
import * as ipfsClient from "ipfs-http-client";
export const ipfs = ipfsClient("http://localhost:5001"); // (the default in Node.js)

// const ipfsApi = require(‘ipfs-api’);
// const ipfs = new ipfsApi(‘localhost’, ‘5001’, {protocol:‘http’});
