const assert = require('assert');
const { createRandomAddress } = require('../app/helpers/eth_wallet');
const { redisSet, redisGet, redisDel } = require('../app/helpers/redis');
const Masterwallet = require('../app/Controller/Masterwallet');
const { NODE_USER, NODE_PASS, NODE_RPC_ENDPOINT } = require('../config/masterwallet');
const ethers = require('ethers');

describe('Testing Redis', async () => {

    it('Creating new address', async () => {
        let res = await createRandomAddress('ETH');
        assert.notStrictEqual(res[1], '');
    });


    //Masterwallet.isAddressOurs()
    it('Check address is Ours', async () => {
        let res = await createRandomAddress('ETH');
        let res2 = await createRandomAddress('ETH');

        await redisSet(res[1].toLowerCase(), 'ETH');
        const val = await Masterwallet.isAddressOurs(res[1])
        const val2 = await Masterwallet.isAddressOurs(res2[1])
        assert.strictEqual(val.token, 'ETH');
        assert.strictEqual(val2.result, false);
    });

    it('ETH - Check unsuccessfull transactions', async () => {
        const url = { url: NODE_RPC_ENDPOINT, user: NODE_USER, password: NODE_PASS };
        let provider = new ethers.providers.JsonRpcProvider(NODE_RPC_ENDPOINT);
        let trxReceipt = await provider.getTransactionReceipt('0x000');
        await assert.strictEqual(trxReceipt.status, 1);

        trxReceipt = await provider.getTransactionReceipt('0x000');
        await assert.strictEqual(trxReceipt.status, 0);
    });

});