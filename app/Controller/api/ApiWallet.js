
const MasterwalletModel = require('../../Models/Masterwallet_model');
const Masterwallet = require('../Masterwallet');
const { MIN_SPARE_ADDRESS } = require('../../../config/masterwallet');
const { json } = require('express');
const { _SERVERS } = require('../Servers');


class ApiWallet {

    constructor() {
        this.Eth = _SERVERS['ETH'].instance;
        this.ERC20_USDT = _SERVERS['USDT'].instance;
    }

    async getTotalWithdrawablwBalance(req) {
        let user_token = '';

        let msg = '';
        try {
            user_token = (req.body.currency === undefined) ? '' : req.body.currency;
        } catch (error) {
            msg = error;
        }

        const tokenExists = await MasterwalletModel.checkTokenExists(user_token);
        if (user_token == '' || !tokenExists) {
            return (await this.createError('error token'));
        }

        //if (user_token == 'ETH') {
        const totalBalance = await MasterwalletModel.getTotalWithdrawablwBalance(user_token);
        //}
        if (totalBalance) return { 'status': true, 'type': 1, 'data': { 'token': user_token, 'balance': totalBalance } }
        else return { 'status': false, 'type': 0, 'data': {} }
    }


    async getTotalBalance(req) {
        let user_token = '';
        let totalBalance = 0;
        let msg = '';
        try {
            user_token = (req.body.currency === undefined) ? '' : req.body.currency;
        } catch (error) {
            msg = error;
        }

        const tokenExists = await MasterwalletModel.checkTokenExists(user_token);
        if (user_token == '' || !tokenExists) {
            return (await this.createError('error token'));
        }

        //const user_token_chain = MasterwalletModel.getTokenChain(user_token);

        //if (user_token == 'ETH') {
        totalBalance = await MasterwalletModel.getTotalBalance(user_token);
        //}


        if (totalBalance == 0 || totalBalance) return { 'status': true, 'type': 1, 'data': { 'token': user_token, 'balance': totalBalance } }
        else return { 'status': false, 'type': 0, 'data': {} }
    }

    async getAddressBalance(req) {
        let user_token = '';
        let user_address = '';
        let balance = false;
        let msg = '';
        try {
            user_token = (req.body.currency === undefined) ? '' : req.body.currency;
            user_address = (req.body.address === undefined) ? '' : req.body.address;
        } catch (error) {
            msg = error;
        }


        const tokenExists = await MasterwalletModel.checkTokenExists(user_token);
        if (user_address == '' || user_token == '' || !tokenExists) {
            return (await this.createError('error input values. ' + msg));
        }

        const user_token_chain = await MasterwalletModel.getTokenChain(user_token);

        if (user_token_chain == 'ETH') {
            switch (user_token) {
                case 'ETH': balance = await this.Eth.getAddressBalance(user_address); break;
                case 'USDT': balance = await this.ERC20_USDT.getAddressBalance(user_address); break;
                default: balance = false;
            }
        }

        if (balance) return { 'status': true, 'type': 1, 'data': { 'token': user_token, 'balance': balance } }
        else return { 'status': false, 'type': 0, 'data': {} }
    }


    async getaddressinfo(req) {
        console.log('getaddressinfo');
        let user_token = '';
        let user_address = '';
        let isAddress = false;
        let msg = '';
        try {
            user_token = (req.body.currency === undefined) ? '' : req.body.currency;
            user_address = (req.body.address === undefined) ? '' : req.body.address;
        } catch (error) {
            msg = error;
        }

        const tokenExists = await MasterwalletModel.checkTokenExists(user_token);
        if (user_address == '' || user_token == '' || !tokenExists) {
            return (await this.createError('error input values. ' + msg));
        }

        const user_token_chain = await MasterwalletModel.getTokenChain(user_token);
        console.log('user_token', user_token);
        console.log('user_token_chain', user_token_chain);
        if (user_token_chain == 'ETH') isAddress = await this.Eth.isAddress(user_address);

        const result = {
            'status': isAddress,
            'type': (isAddress) ? 1 : 0,
            'data': {}
        }
        return (result);
    }



    async createError(msg) {
        return {
            'status': false,
            'type': 0,
            'msg': msg
        }
    }

    async getreceiveaddress(req) {
        let user_id = '';
        let user_email = '';
        let user_token = '';
        let msg = '';
        try {
            user_token = (req.body.currency === undefined) ? '' : req.body.currency;
            user_id = (req.body.userid === undefined) ? '' : req.body.userid;
            user_email = (req.body.username === undefined) ? '' : req.body.username;
        } catch (error) {
            msg = error;
        }

        const tokenExists = await MasterwalletModel.checkTokenExists(user_token);
        console.log('checkTokenExists', tokenExists);
        if (user_token == '' || !tokenExists) {
            console.log(await this.createError('error input values. ' + msg));
            return (await this.createError('error token' + msg));
        }

        if (user_id == '' || user_email == '' || user_token == '') {
            console.log(`error input values. ` + msg);

            return (await this.createError('error input values. ' + msg));
        }
        console.log(`getAddress(${user_id},${user_email})`);


        //check if new addresses exists? if not create a set of new addresses;
        const totalAddresses = await MasterwalletModel.getExistingAddressesCount(user_token);
        console.log('ExistingAddressesCount:', totalAddresses);
        if (totalAddresses <= MIN_SPARE_ADDRESS) {
            console.log('generate spare addresses...');
            await Masterwallet.generateNewSpareAddresses(user_token, MIN_SPARE_ADDRESS);
            await Masterwallet.loadAddresses('ETH');
            await this.reloadServer(user_token);
        }


        let user_address = await MasterwalletModel.getUserAddress(user_id, user_token);

        console.log('user_id:', user_id);

        if (!user_address || user_address == '') {
            console.log('create new address...');
            user_address = await Masterwallet.assignNewAddress(user_id, user_email, user_token);
        }

        console.log('user_address:', user_address);
        const result = {
            'status': true,
            'type': 1,
            'data': {
                'user_id': user_id,
                'user_email': user_email,
                'address': user_address
            }
        }
        return ((result));
    }

    async reloadServer(token) {
        for (let server in _SERVERS) {
            if (_SERVERS[server].instance.token == token) {
                _SERVERS[server].instance.restartServer();
                console.log('Server Restarted', token);
            }
        }
    }

    async withdraw(req) {
        let token = '';
        let amount = '';
        let address = '';
        let which = '';
        let subtractfee = true;
        let result
        let msg = '';
        let user_id = '';
        try {
            token = (req.body.currency === undefined) ? '' : req.body.currency;
            amount = (req.body.amount === undefined) ? '' : req.body.amount;
            address = (req.body.address === undefined) ? '' : req.body.address;
            subtractfee = (req.body.subtractfee === undefined) ? '' : req.body.subtractfee;
            which = (req.body.which === undefined) ? '' : req.body.which;
            user_id = (req.body.userid === undefined) ? '' : req.body.userid;
        } catch (error) {
            msg = error;
        }


        const tokenExists = await MasterwalletModel.checkTokenExists(token);
        if (token == '' || !tokenExists) {
            return (await this.createError('error token' + msg));
        }

        if (token == '' || amount == '' || address == '') {
            console.log(`error input values. ` + msg);
            return (await this.createError('error input values.' + msg));
        }

        if (token == 'ETH') {
            this.Eth.withdraw(address, amount, which, user_id);
            result = {
                'type': 1,
                'data': {
                    'status': true,
                    'msg': 'Request has sent. will notify the result after process'
                }
            }
        }
        if (token == 'USDT') {
            this.ERC20_USDT.withdraw(address, amount, which, user_id);
            result = {
                'type': 1,
                'data': {
                    'status': true,
                    'msg': 'Request has sent. will notify the result after process'
                }
            }
        }


        return ((result));
    }


    async getTransaction(req) {
        let token = '';
        let trxid = '';

        let msg = '';
        try {
            token = (req.body.currency === undefined) ? '' : req.body.currency;
            trxid = (req.body.trxid === undefined) ? '' : req.body.trxid;
        } catch (error) {
            msg = error;
        }

        if (token == '' || trxid == '') {
            console.log(`error input values. ` + msg);
            const result = {
                'status': false,
                'type': 0,
                'msg': 'error input values. ' + msg
            }
            return (result);
        }

        let details = [];

        // if (token == 'ETH') {
        let amount = 0;
        let result = {};
        const trxs = await MasterwalletModel.getTransactions(token, trxid);
        if (!trxs) {
            return {
                'type': 0,
                'data': {}
            }
        }

        for await (const trx of trxs) {
            details.push({
                'category': 'receive',
                'label': trx.user_id,
                'vout': trx.callid,
                'amount': trx.deposit,
                'address': trx.address
            });
            amount += trx.deposit;
        }
        if (details.length > 0) {
            result = {
                'type': 1,
                'data': {
                    'report': {
                        'confirmations': 15,
                        'amount': amount,
                        'details': details
                    }
                }
            }
        } else {
            result = {
                'type': 0,
                'data': {}
            }
        }
        return result;
        // }

    }
}

module.exports = ApiWallet;