const ethers = require('ethers');
const crypto = require('crypto');
const fetch = require('node-fetch');

const { NODE_USER, NODE_PASS, NODE_RPC_ENDPOINT } = require('../../config/masterwallet');

let url = { url: NODE_RPC_ENDPOINT, user: NODE_USER, password: NODE_PASS };
let eth_provider = new ethers.providers.JsonRpcProvider(NODE_RPC_ENDPOINT);

function createRandomAddress(chainId) {
    const id = crypto.randomBytes(32).toString('hex');
    console.log('id', id);
    const new_privateKey = "0x" + id;
    const wallet = new ethers.Wallet(new_privateKey);
    const new_address = wallet.address;

    const curdate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    return [
        new_privateKey,
        new_address.toLowerCase(),
        curdate,
        curdate,
        chainId
    ]
}


function traceTransactions(RPC_ENDPOINT, txhash) {
    return new Promise((resolve, reject) => {
        let params = [txhash, { "tracer": "callTracer" }];
        let data = { "jsonrpc": "2.0", "method": "debug_traceTransaction", "params": params, "id": 1 };

        fetch(RPC_ENDPOINT, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-type": "application/json;"
            }
        })
            .then((res) => {
                return res.json();
            })
            .catch(error => reject(error))
            .then((response) => {
                resolve(response);
            })
            .catch(error => reject(error));
    });
}



module.exports = { createRandomAddress, traceTransactions }