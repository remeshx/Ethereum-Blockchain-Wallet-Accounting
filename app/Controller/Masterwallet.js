const MasterwalletModel = require('../Models/Masterwallet_model');
const { createRandomAddress } = require('../helpers/eth_wallet');
const { id } = require('ethers/lib/utils');
const { redisSet, redisGet } = require('../helpers/redis');
const { MIN_SPARE_ADDRESS } = require('../../config/masterwallet');
const { _NOTIFY_SERVER_URL, _NOTIFY_SERVER_WITHDRAW_URL } = require('../../config/server');
const fetch = require('node-fetch');
const { eth_masterwallet } = require('../../config/ETH_wallets');
const logger = require('../helpers/logger');

class Masterwallet {

    static async isAddressOurs(address) {
        const key = await redisGet(address.toLowerCase());
        if (key == null || key == '') return { result: false, token: false }
        else return { result: true, token: key }
    }

    static async generateNewSpareAddresses(token, address_count) {
        let sql = '';
        let wallets = [];
        let newaddress = [];
        console.log('address_count', address_count);
        for (let i = 0; i < address_count; i++) {
            newaddress = createRandomAddress(token);
            wallets.push(newaddress);
            redisSet(newaddress[1], token);
        };
        console.log(wallets);
        MasterwalletModel.insertNewAddressesBulk(wallets);
    }


    static async assignNewAddress(user_id, user_email, token) {

        let aid;
        let aaddress;
        const randAddress = await MasterwalletModel.getRandUnusedAddresse(token);

        if (typeof randAddress !== 'undefined') {
            console.log('==============');
            aid = randAddress.id;
            aaddress = randAddress.address;
        } else return false;

        console.log('address_id', aid);

        const assign_result = await MasterwalletModel.assignNewAddressToUser(aid, user_id, user_email);
        if (!assign_result) {
            return false;
        }

        await MasterwalletModel.insertNewAddressBalance(user_id, token, aaddress);

        return aaddress;
    }

    static async loadAddresses(token) {
        console.log('loadAddresses');
        const addressess = await MasterwalletModel.loadAllAddresses(token);
        if (addressess)
            for await (let row of addressess) {
                redisSet(row.address.toLowerCase(), row.token);
            }
    }

    static async updateBlance(token, blkheight, address, value, txhash, callId = 0) {
        let notify = 0;
        address = address.toLowerCase();
        let hasRecord = await MasterwalletModel.hasBalanceLog(blkheight, address, txhash, callId);
        if (hasRecord) return false;
        if (value == 0) return false;
        let user_id = 0;
        const arow = await MasterwalletModel.updateAddressBalance(token, address, value)
        user_id = await MasterwalletModel.getUserIdFromAddress(address, token)

        if (!arow || arow <= 0) {
            console.log('insertNewAddressBalance', txhash);
            await MasterwalletModel.insertNewAddressBalance(user_id, token, address);
        }

        if (value > 0 && address != eth_masterwallet.address) notify = await this.notifyServer(token, txhash, value, address, user_id, callId);
        else notify = 1;

        let deposit = 0;
        let withdraw = 0;
        if (value > 0) {
            deposit = Math.abs(value);
            withdraw = 0;
        } else {
            deposit = 0;
            withdraw = Math.abs(value);
        }
        MasterwalletModel.logBalanceChange(user_id, token, blkheight, txhash, address, deposit, withdraw, notify, callId);
    }

    static async notifyServer(token, txhash, value, address, user_id, callId) {
        const result = {
            'type': 2,
            'data': {
                'currency': token,
                'trxid': txhash,
                'value': value,
                'user_id': user_id,
                'address': address,
                'vout': callId,
                'network': 'ETH'
            }
        }
        logger.deposit('notify', result);

        fetch(_NOTIFY_SERVER_URL, {
            method: "POST",
            body: JSON.stringify(result),
            headers: {
                "Content-type": "application/json;"
            }
        })
            .then((res) => {
                return res.json();
            })
            .catch(error => resolve(0))
            .then((response) => {
                if (responce.type == 1) resolve(1);
                else resolve(0);
            })
            .catch(error => { });
    }

    static async notifyServer_withdraw(token, txhash, user_id, which) {
        const result = {
            'type': 2,
            'data': {
                'currency': token,
                'trxid': txhash,
                'userid': user_id,
                'which': which
            }
        }
        logger.withdraw('notify', result);

        fetch(_NOTIFY_SERVER_WITHDRAW_URL, {
            method: "POST",
            body: JSON.stringify(result),
            headers: {
                "Content-type": "application/json;"
            }
        })
            .then((res) => {
                return res.json();
            })
            .catch(error => resolve(0))
            .then((response) => {
                if (responce.type == 1) resolve(1);
                else resolve(0);
            })
            .catch(error => { });
    }

    static decodePrvKey(token, prvkey) {
        return prvkey;
    }





}


module.exports = Masterwallet;
