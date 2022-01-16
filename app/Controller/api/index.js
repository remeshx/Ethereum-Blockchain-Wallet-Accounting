
const { json } = require('express');
const Masterwallet = require('../Masterwallet');
const Eth_server = require('../Eth_server');
const ApiWallet = require('./ApiWallet');
const MasterwalletModel = require('../../Models/Masterwallet_model');


class Api {
    constructor() {
        this.ApiWallet = new ApiWallet();
    }

    async main(req) {

        let command = '';
        try {
            command = (req.body.cmd) ? req.body.cmd : '';
        } catch {
            return {
                'status': false,
                'type': 0,
                'msg': 'not enough input data'
            }
        }
        command = command.toLowerCase();
        switch (command) {
            case 'getreceiveaddress': return this.ApiWallet.getreceiveaddress(req);
            case 'getaddressinfo': return this.ApiWallet.getaddressinfo(req);
            case 'getbalance': return this.ApiWallet.getAddressBalance(req);
            case 'gettotalbalance': return this.ApiWallet.getTotalBalance(req);
            case 'gettotalwithdrawablebalance': return this.ApiWallet.getTotalWithdrawablwBalance(req);
            case 'send': return this.ApiWallet.withdraw(req);
            case 'gettrx': return this.ApiWallet.getTransaction(req);
            default: return { type: 0, status: false, msg: 'no command found' }
        }

    }

}

module.exports = Api;