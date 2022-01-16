const ethers = require('ethers');
const { NODE_USER, NODE_PASS, NODE_RPC_ENDPOINT } = require('../../config/masterwallet');
const Eth_server_model = require('../Models/Eth_server_model');
const { eth_masterwallet } = require('../../config/ETH_wallets')
const Masterwallet = require('./Masterwallet');
const Masterwallet_model = require('../Models/Masterwallet_model');
const Setting_model = require('../Models/Setting_model');
const { traceTransactions } = require('../helpers/eth_wallet');
const { eth_contract_abi, eth_contract_address, eth_contract_gas } = require('../../config/contracts/eth-withdraw');
const logger = require('../helpers/logger');


class Eth_server {

    constructor() {
        this.token = 'ETH';
        this.url = { url: NODE_RPC_ENDPOINT, user: NODE_USER, password: NODE_PASS };
        //logger.blocks('NODE_RPC_ENDPOINT', NODE_RPC_ENDPOINT);
        this.provider = new ethers.providers.JsonRpcProvider(NODE_RPC_ENDPOINT);
    }

    async isAddress(address) {
        return new Promise((resolve, reject) => {
            resolve(ethers.utils.isAddress(address))
        });
    }

    async start_server() {
        await Masterwallet.loadAddresses('ETH');
        this.block_read = await Setting_model.getSetting('eth_block_read');
        this.block_last = await this.provider.getBlockNumber();
        logger.blocks('block_read', this.block_read);
        logger.blocks('block_last', this.block_last);
        this.provider.on('block', (blkheight) => {
            if (blkheight > this.block_last) this.block_last = blkheight - 15;
        });
        this.readBlocks();
    }

    async readNewBlock(blkheight) {
        let blk;
        let hasRecord;
        let code;
        blk = await this.provider.getBlockWithTransactions(blkheight);
        let contracts = [];
        for await (let trx of blk.transactions) {
            logger.blocks('-----------------------------');
            logger.blocks('trx', trx.hash);
            let amount = ethers.utils.formatEther(trx.value.toString());
            logger.blocks('amount', amount);
            if (amount <= 0) continue;
            //check if trx.to is a Contract
            if (trx.to == undefined || trx.to == null || !trx.to) continue;
            if (typeof contracts[trx.to] !== 'undefined' && contracts[trx.to] !== null) code = contracts[trx.to];
            else
                code = await this.provider.getCode(trx.to).catch(error => {
                    logger.blocks('tx to ', trx.to)
                    logger.blocks('tx hash ', trx.hash)
                    logger.blocks('error', error)
                });

            contracts[trx.to] = code;
            if (code != '0x') {
                contracts[trx.to] = code;
                logger.blocks('internal tx');
                await this.readInternalTransactions(blkheight, trx.hash, trx.from);
                continue;
            }
            logger.blocks('external tx');

            let isOurs = await Masterwallet.isAddressOurs(trx.to);
            if (!isOurs.result || isOurs.token != this.token) continue;
            logger.deposit('incomming transaction', trx.hash);

            if (trx.value == 0) {
                logger.deposit('value is zero');
                continue;
            }
            if (!trx.to) {
                logger.deposit('trx.to not set');
                continue;
            }
            let trxReceipt = await this.provider.getTransactionReceipt(trx.hash);
            if (trxReceipt.status == 1) {
                await Masterwallet.updateBlance(this.token, blkheight, trx.to, amount, trx.hash);
                logger.deposit(`Incoming Trx ${trx.hash}/ trFrom = ${trx.from}/ trTo = ${trx.to} / trAmount = ${trx.value} / trHash = ${trx.hash}`);
                logger.blocks(`Incoming Trx ${trx.hash}/ trFrom = ${trx.from}/ trTo = ${trx.to} / trAmount = ${trx.value} / trHash = ${trx.hash}`);
            } else {
                logger.deposit('Error getTransactionReceipt');
                logger.blocks('Error getTransactionReceipt ' + trx.hash);
            }
        }
        contracts.length = 0;
    }

    async readInternalTransactions(blkheight, txhash, txfrom) {
        let traces = await traceTransactions(NODE_RPC_ENDPOINT, txhash);
        // logger.blocks('traces', traces);
        this.checkCalls(blkheight, txhash, traces.result, txfrom);
    }

    async checkCalls(blkheight, txhash, traceResult, txfrom, callId = 0) {
        callId++;
        if (traceResult == undefined || traceResult == null || traceResult == '') {
            //logger.blocks('txhash', txhash)
            logger.blocks('traceResult', traceResult)
            return false;
        }

        if (traceResult.error != undefined && traceResult.error != null) {
            //logger.blocks('txhash', txhash)
            logger.blocks('traceResult Error', traceResult)
            return false;
        }

        const type = traceResult.type;
        if (traceResult.from != txfrom)
            this.processCall(blkheight, txhash, traceResult, callId);
        if (traceResult.calls !== undefined) {
            for await (let trace of traceResult.calls) {
                await this.checkCalls(blkheight, txhash, trace, txfrom, callId);
            }
        }
    }

    async processCall(blkheight, txhash, callResult, callId) {
        let value = 0;
        let type = '';
        // logger.blocks("callResult", callResult);
        if (callResult.value !== undefined) value = parseInt(callResult.value);
        else return false;
        if (callResult.type !== undefined) type = callResult.type;
        else return false;

        if (type.toLowerCase() == 'call' && value > 0) {

            let isOurs = await Masterwallet.isAddressOurs(callResult.to);
            if (!isOurs.result || isOurs.token != this.token) return false;
            if (!callResult.to) {
                logger.deposit('to address is invalid');
                return false;
            }
            let amount = ethers.utils.formatEther(value.toString());
            await Masterwallet.updateBlance(this.token, blkheight, callResult.to, amount, txhash, callId);
            logger.deposit(`Incoming internal Trx ${txhash}/ trFrom = ${callResult.from}/ trTo = ${callResult.to} / trAmount = ${amount} `);
            logger.blocks(`Incoming internal Trx ${txhash}/ trFrom = ${callResult.from}/ trTo = ${callResult.to} / trAmount = ${amount} `);
        }
    }

    async updateAddressBalance(fromAddress) {
        logger.withdraw('updateAddressBalance', fromAddress);
        let prvkey = '';
        let user_id = 0;
        if (!fromAddress) {
            return false;
        }
        const currBalance = await Masterwallet_model.getAddressBalance(this.token, fromAddress.address);
        const result = await this.checkAddressBalance(fromAddress.address, currBalance);
        logger.withdraw('from address balance check :', result);
        if (!result.status) {
            logger.withdraw('balance not match');
            //if balance differs update it
            user_id = await Masterwallet_model.getUserIdFromAddress(fromAddress.address, this.token)
            await Masterwallet_model.resetAddressBalance(this.token, fromAddress.address, result.balance);
            await Masterwallet_model.logBalanceChange(user_id, this.token, -1, 'unmatches balances', fromAddress.address, result.balance, result.balance);
        }
        logger.withdraw('return');
        return true;
    }

    async getWithdrawAddress(amount) {
        let fromAddress = await Eth_server_model.findWithdrawalAddress(this.token, amount);
        logger.withdraw('fromAddress', fromAddress);
        let prvkey = '';

        if (!fromAddress) {
            return false;
        }

        prvkey = await Masterwallet_model.getAddressPrvKey(this.token, fromAddress.address);
        //logger.withdraw('prvkey', prvkey);
        fromAddress.prvkey = await Masterwallet.decodePrvKey(this.token, prvkey);
        const result = await this.checkAddressBalance(fromAddress.address, fromAddress.balance);
        logger.withdraw('fromAddress', fromAddress);
        logger.withdraw('from address balance check :', result);
        if (!result.status) {
            logger.withdraw('balance not match');
            //if balance differs update it
            const user_id = await Masterwallet_model.getUserIdFromAddress(fromAddress.address, this.token)
            await Masterwallet_model.resetAddressBalance(this.token, fromAddress.address, result.balance);
            await Masterwallet_model.logBalanceChange(user_id, this.token, -1, 'unmatches balances', fromAddress.address, result.balance, result.balance);

            if (result.balance < amount) return false;
            fromAddress.balance = result.balance;
        }

        return fromAddress;
    }


    async withdraw(toAddress, amount, which, user_id) {
        //decide to send the withdrawal account based on the balances
        //and return the from address + the address balance
        let fromAddress = await this.getWithdrawAddress(amount);
        logger.withdraw('user_id', user_id);
        logger.withdraw('which', which);
        logger.withdraw('token', this.token);
        logger.withdraw('withdraw', amount);
        logger.withdraw('fromAddress', fromAddress);
        let finalRes = {}

        if (!fromAddress) {
            fromAddress = {};
            logger.withdraw('address not found withdraw from main wallet');
            fromAddress.balance = (amount * 1.1);
            fromAddress.address = eth_masterwallet.address;
            fromAddress.prvkey = await Masterwallet.decodePrvKey(this.token, eth_masterwallet.prvkey);

            const result = await this.addressHasBalance(fromAddress.address, fromAddress.balance);
            logger.withdraw('from address balance check :', result);
            if (!result.status) {
                logger.withdraw('Error : master Wallet balance insufficient', result.balance);
                finalRes = {
                    'type': 0,
                    'data': {
                        'status': false,
                        'msg': 'Error : master Wallet balance insufficient'
                    }
                }
                return finalRes;
            }
        }

        const result = await this.eth_contract_withdraw(fromAddress.address, fromAddress.prvkey, toAddress, amount, fromAddress.balance);
        console.log(100);

        if (result.status) {
            logger.withdraw('Withdraw was successfull', result.details);
            finalRes = {
                'type': 1,
                'data': result
            }
            await Masterwallet.notifyServer_withdraw(this.token, result.trxid, user_id, which);
            return finalRes;
        } else {
            logger.withdraw('Withdraw error', result.msg);
            finalRes = {
                'type': 0,
                'data': result
            }
            return finalRes;
        }
    }

    async addressHasBalance(address, balance) {
        return new Promise((resolve, reject) => {
            console.log('checkAddressBalance', balance);
            const weiBalance = ethers.utils.parseEther(balance.toString());

            this.provider.getBalance(address).then((realBalance) => {
                // convert a currency unit from wei to ether
                if (realBalance.gt(weiBalance)) resolve({ 'status': true });
                else resolve({ 'status': false, 'balance': ethers.utils.formatEther(realBalance) });
            })
        })

    }

    async checkAddressBalance(address, balance) {
        return new Promise((resolve, reject) => {
            console.log('checkAddressBalance', balance);
            const weiBalance = ethers.utils.parseEther(balance.toString());

            this.provider.getBalance(address).then((realBalance) => {
                // convert a currency unit from wei to ether
                if (Math.abs(realBalance.sub(weiBalance)) < 100000) resolve({ 'status': true });
                else resolve({ 'status': false, 'balance': ethers.utils.formatEther(realBalance) });
            })
        })

    }

    async getAddressBalance(address) {
        return new Promise((resolve, reject) => {

            //const weiBalance = ethers.utils.parseEther(balance.toString());

            this.provider.getBalance(address).then((realBalance) => {
                // convert a currency unit from wei to ether
                resolve(ethers.utils.formatEther(realBalance));
            }).catch((error) => {
                resolve(false);
            })
        })
    }

    async calculateGasprice(total, amount, toAddress) {
        let toAmount = ethers.utils.parseEther(amount.toString());
        let totalamount = ethers.utils.parseEther(total.toString());
        logger.withdraw('calculateGasprice');

        let iface = new ethers.utils.Interface(eth_contract_abi);
        const data = await iface.encodeFunctionData("transfer_amount", [toAmount, toAddress]);
        let gasPrice = await this.provider.getGasPrice();
        gasPrice = gasPrice.add(1000000000).toString();
        return new Promise((resolve, reject) => {
            logger.withdraw('data', data);
            this.provider.estimateGas({
                'to': eth_contract_address,
                'data': data,
                'value': totalamount
            }).then((gas) => {
                logger.withdraw('Gas estimates done', gas)
                let gasLimit = Math.ceil(gas * 1.2);
                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': gasLimit
                });
            }).catch((error) => {
                logger.withdraw('Gas estimates error', gas)
                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': eth_contract_gas
                });
            });

        });
    }


    async eth_contract_withdraw(fromAddress, fromPrvKey, toAddress, toAmount, totalBalance) {
        const gasDetails = await this.calculateGasprice(totalBalance, toAmount, toAddress);
        logger.withdraw('gasDetails', gasDetails);
        return new Promise((resolve, reject) => {
            let wallet = new ethers.Wallet(fromPrvKey, this.provider);
            // let wallet = new ethers.Wallet('ceae6e598c9430a6a2fae8eaf3c19b6cfe7445f208187405cc2acf72a700ad40', this.provider);
            let contract = new ethers.Contract(eth_contract_address, eth_contract_abi, wallet);

            const client_amount = ethers.utils.parseEther(toAmount.toString()); // toAmount is in ether
            const client_address = toAddress;


            let gasValue = Math.ceil(gasDetails.gasLimit * gasDetails.gasPrice * 1.2);

            let total_amount = ethers.utils.parseEther(parseFloat(totalBalance).toFixed(15).toString()); // totalBalance is in Ether

            if (fromAddress == eth_masterwallet.address) {
                total_amount = total_amount.add(gasValue);
            } else {
                total_amount = total_amount.sub(gasValue); // totalBalance is in Ether
            }
            logger.withdraw('total_amount', total_amount);

            logger.withdraw('eth_contract_gas', gasDetails.gasLimit);
            logger.withdraw('gasPrice', gasDetails.gasPrice);
            logger.withdraw('gasValue', gasValue);


            const overrides = {
                value: total_amount,
                gasLimit: gasDetails.gasLimit,
                gasPrice: gasDetails.gasPrice
            };
            logger.withdraw('overrides', overrides);
            logger.withdraw('gasValue', gasValue);
            logger.withdraw(`Transfering ${total_amount} to smart contract... `);
            logger.withdraw(`fromAddress`, fromAddress);
            logger.withdraw(`eth_masterwallet.address`, eth_masterwallet.address);


            // if (fromAddress == eth_masterwallet.address) {
            //     const params = [{
            //         from: fromAddress,
            //         to: client_address,
            //         value: client_amount
            //     }];
            //     this.provider.send('eth_sendTransaction', params).then((result) => {
            //         logger.withdraw('Final Result master address', result);
            //         const txhash = result.transactionHash;
            //         Masterwallet.updateBlance(this.token, 0, fromAddress, ethers.utils.formatEther(client_amount) * -1, txhash, 0)
            //         resolve({ 'status': true, 'trxid': result.transactionHash, 'details': result })
            //     }).catch((error) => {
            //         logger.withdraw('error details 5', error);
            //         resolve({ 'status': false, 'msg': errormsg, 'details': error })
            //     })
            // } else {
            // contract.get_master_wallet_open().then((masterWalletAddress) => {
            // if(masterWallet==eth_masterwallet.address) {
            //logger.withdraw('contract masterWallet', masterWalletAddress);
            logger.withdraw('node masterWallet', eth_masterwallet.address);

            contract.transfer_amount(client_amount, client_address, overrides).then((result) => {
                logger.withdraw('transfer_amount result', result);
                result.wait().then(
                    (result) => {
                        logger.withdraw('Final Result', result);
                        const txhash = result.transactionHash;

                        Masterwallet.updateBlance(this.token, 0, fromAddress, ethers.utils.formatEther(total_amount) * -1, txhash, 0)
                        //await Masterwallet_model.logBalanceChange(this.token, 0, txhash, fromAddress, 0, total_amount);

                        const fromAddressObj = { address: fromAddress }
                        this.updateAddressBalance(fromAddressObj).then(() => {
                            logger.withdraw('balance updated ', fromAddress);
                        }).catch(error => {
                            logger.withdraw('updateAddressBalance error 36', error);
                        });
                        resolve({ 'status': true, 'trxid': result.transactionHash, 'details': result })
                    }
                ).catch(error => {
                    let errormsg = '';
                    // logger.withdraw('Final Error0', error);
                    // logger.withdraw('Final Error01', error.receipt);
                    // logger.withdraw('Final Error02', error.receipt.gasUsed);
                    logger.withdraw('Final Error03', error.receipt.gasUsed.toNumber());
                    const gasUsed = error.receipt.gasUsed.toNumber();
                    if (gasUsed >= gasDetails.gasLimit) errormsg = 'Out Of Gas';
                    else errormsg = 'Trx Fails';
                    logger.withdraw('error details 3', error);
                    resolve({ 'status': false, 'msg': errormsg, 'details': error })
                })

            }).catch(error => {
                // logger.withdraw('Final Error1', error);
                // logger.withdraw('Final Error2', error.body.message);
                // logger.withdraw('Final Error3', error.body);
                logger.withdraw('Final Error4', JSON.parse(error.body).error.message);
                resolve({ 'status': false, 'msg': JSON.parse(error.body).error.message, 'details': error })
            })
            // } else resolve({'status':false, 'msg':'Master Wallet is not equal ' + masterWallet});
        });
        //}
        // });
    }

    static eth_direct_withdraw() {

    }


    async readBlocks() {
        if (this.block_read < this.block_last) {
            this.block_read++;
            logger.blocks(`reading ${this.block_read} / ${this.block_last}  `);
            await this.readNewBlock(this.block_read);
            logger.blocks('end of block', this.block_read);
            await Setting_model.updateSetting('eth_block_read', this.block_read);
            this.readBlocks();
            return true;
        }

        var ins = this;
        setTimeout(
            function () {
                ins.readBlocks();
            }
            , 30000);
        logger.blocks('scheduled...')
        return true;
    }
}

module.exports = Eth_server;
