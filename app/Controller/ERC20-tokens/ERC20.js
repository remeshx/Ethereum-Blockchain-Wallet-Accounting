const { eth_erc20_abi } = require('../../../config/contracts/eth-erc20');
const Masterwallet = require('../Masterwallet');
const MasterwalletModel = require('../../Models/Masterwallet_model');
const ethers = require('ethers');
const { NODE_RPC_ENDPOINT } = require('../../../config/masterwallet');
const Eth_server_model = require('../../Models/Eth_server_model');
const logger = require('../../helpers/logger');
const { gassspreader_gaslimit, gassspreader_address, gasspreader_abi } = require('../../../config/contracts/gas_spreader');
const masterwallet = require('../../../config/masterwallet');

class ERC20 {

    constructor(token, contract, address, prvkey, senderContractAddress, senderAbi, numberOfDecimals, withdrawLimit) {
        this.contractAddress = contract;
        this.token = token;
        this.withdrawLimit = withdrawLimit;
        this.masterAddress = address;
        this.masterPrvkey = prvkey;
        this.provider = new ethers.providers.JsonRpcProvider(NODE_RPC_ENDPOINT);
        this.wallet = new ethers.Wallet(prvkey, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, eth_erc20_abi, this.wallet);
        this.filter = null;
        this.senderContractAddress = senderContractAddress;
        this.senderContractAbi = senderAbi;
        this.numberOfDecimals = numberOfDecimals;
        this.senderContract = new ethers.Contract(senderContractAddress, senderAbi, this.wallet);
    }

    async start_server() {
        let filterArray = [];
        const addresses = await MasterwalletModel.loadAllAddresses(this.token);
        if (!addresses) {
            console.log('Error Starting', this.token);
            return false;
        }
        // console.log(addresses);
        for await (let row of addresses) {
            filterArray.push(row.address.toLowerCase());
        }

        this.filter = this.contract.filters.Transfer(null, filterArray);

        this.contract.on(this.filter, async (from, to, value, details) => {
            const amount = value / (Math.pow(10, this.numberOfDecimals))
            this.deposit(from, to, amount, details);
        });
    }

    async deposit(from, to, value, details) {
        logger.deposit('new Deposit-------------------------------------------');
        logger.deposit('details', details);
        let amount = value;
        await Masterwallet.updateBlance(this.token, details.blockNumber, to, amount, details.transactionHash, details.transactionIndex);
        logger.deposit(`Incoming internal Trx ${this.token}, ${details.transactionHash}/ trFrom = ${from}/ trTo = ${to} / trAmount = ${amount} `);
        logger.blocks(`Incoming internal Trx ${this.token} , ${details.transactionHash}/ trFrom = ${from}/ trTo = ${to} / trAmount = ${amount} `);

        if (to != this.masterAddress) {
            setTimeout(async () => {
                logger.deposit(`transfering deposit to master ${to}`, value);
                const transferToMaster = await this.transferToMaster(to, amount);
                if (transferToMaster.status) {
                    logger.deposit('incomming transfered to master', transferToMaster.trxid);
                } else {
                    logger.deposit('Error Tansfer to master');
                }
            }, 10000)
        }
    }

    async restartServer() {
        this.contract.removeAllListeners(this.filter);
        setTimeout(() => {
            this.start_server();
        }, 2000);
    }


    async getAddressBalance(address) {
        const balance = await this.contract.balanceOf(address);
        return ethers.utils.formatEther(balance);
    }



    async withdraw(toAddress, amount, which, user_id) {
        //decide to send the withdrawal account based on the balances
        //and return the from address + the address balance
        let fromAddress = {}
        fromAddress.balance = (amount);
        fromAddress.address = this.masterAddress;
        fromAddress.prvkey = await Masterwallet.decodePrvKey(this.token, this.masterPrvkey);


        logger.withdraw('token', this.token);
        logger.withdraw('which', which);
        logger.withdraw('user_id', user_id);
        logger.withdraw('withdraw', amount);
        logger.withdraw('fromAddress', fromAddress);
        let finalRes = {}


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

        logger.withdraw('fromAddress', fromAddress);
        logger.withdraw('amount', amount);
        const result2 = await this.ERC20_withdraw(fromAddress.address, fromAddress.prvkey, toAddress, amount);
        console.log(100);

        if (result.status) {
            logger.withdraw('Withdraw was successfull', result2.details);
            finalRes = {
                'type': 1,
                'data': result2
            }
            await Masterwallet.notifyServer_withdraw(this.token, result2.trxid, user_id, which);
            return finalRes;
        } else {
            logger.withdraw('Withdraw error', result2.msg);
            finalRes = {
                'type': 0,
                'data': result2
            }
            return finalRes;
        }
    }


    async estimageGasForTokenTransfer(fromAddress, toAddress, Amount) {
        let gasPrice = await this.provider.getGasPrice()
        gasPrice = gasPrice.add(1000000000);
        let iface = new ethers.utils.Interface(eth_erc20_abi);
        const data = iface.encodeFunctionData("transfer", [fromAddress, Amount]);

        return new Promise((resolve, reject) => {
            logger.withdraw('data', data);
            this.provider.estimateGas({
                'to': toAddress,
                'data': data,
                'value': 0
            }).then((gas) => {
                logger.withdraw('estimate Token Transfer done', gas)
                let gasLimit = Math.ceil(gas * 3);

                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': gasLimit,
                    'ethtosend': gasPrice.mul(gasLimit).toString()
                });
            }).catch((error) => {
                logger.withdraw('Gas estimates error', error)
                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': gassspreader_gaslimit,
                    'ethtosend': gasPrice.mul(gassspreader_gaslimit).toString()
                });
            });

        });
    }

    async estimageGasForSendingEther(toAddress, Amount) {
        let gasPrice = await this.provider.getGasPrice()
        gasPrice = gasPrice.add(500000000);

        const tx = {
            to: toAddress,
            value: Amount,
            chainId: 0,
            nonce: this.provider.getTransactionCount(this.masterAddress, 'latest')
        }

        let estimate = await this.provider.estimateGas(tx);
        estimate = estimate.add(3000);
        return {
            'gasPrice': gasPrice,
            'gasLimit': estimate
        };
    }

    async sendGas(toAddress, toAmount) {
        var numberOfDecimals = 6;
        var numberOfTokens = ethers.utils.parseUnits(toAmount.toString(), numberOfDecimals);


        console.log(1);
        const estimageGasForTokenTransfer = await this.estimageGasForTokenTransfer(toAddress, this.masterAddress, numberOfTokens);
        console.log(2, estimageGasForTokenTransfer);
        const estimageGasForSendingEther = await this.estimageGasForSendingEther(toAddress, estimageGasForTokenTransfer.ethtosend)
        console.log(3, estimageGasForSendingEther);
        const tx =
        {
            from: this.masterAddress,
            to: toAddress,
            value: estimageGasForTokenTransfer.ethtosend,
            nonce: this.provider.getTransactionCount(this.masterAddress, 'latest'),
            gasLimit: estimageGasForSendingEther.gasLimit, // 100000
            gasPrice: estimageGasForSendingEther.gasPrice
        }
        console.log(4, tx);
        let transaction = await this.wallet.sendTransaction(tx);
        console.log(5, transaction);
        let trxresult = await transaction.wait();
        console.log(6, trxresult);
        return { 'status': true, 'details': trxresult }
    }


    async ERC20_withdraw(fromAddress, fromPrvkey, toAddress, toAmount) {
        let errorMsg = '';
        logger.withdraw('ERC20_withdraw-----------------');
        logger.withdraw('fromPrvkey', fromPrvkey);
        logger.withdraw('fromAddress', fromAddress);
        logger.withdraw('toAmountv', toAmount);


        var numberOfDecimals = this.numberOfDecimals;
        var numberOfTokens = ethers.utils.parseUnits(toAmount.toString(), numberOfDecimals);

        //const gasDetails = await this.calculateTransferGas(fromAddress, numberOfTokens, 2);
        const estimageGasForTokenTransfer = await this.estimageGasForTokenTransfer(toAddress, this.masterAddress, numberOfTokens);

        logger.withdraw('transferToMaster');
        logger.withdraw('fromAddress', fromAddress);
        logger.withdraw('numberOfTokens', numberOfTokens);
        const overrides = { gasLimit: estimageGasForTokenTransfer.gasLimit, gasPrice: estimageGasForTokenTransfer.gasPrice, value: 0 }
        let wallet = new ethers.Wallet(fromPrvkey, this.provider);
        let tokenContract = new ethers.Contract(this.contractAddress, eth_erc20_abi, wallet);

        const token = this.token;
        return new Promise((resolve, reject) => {

            tokenContract.transfer(toAddress, numberOfTokens, overrides).then(function (transaction) {
                logger.withdraw('transaction', transaction)
                transaction.wait().then((res) => {
                    logger.withdraw('withdraw successful', res)

                    Masterwallet.updateBlance(token, 0, fromAddress, (toAmount) * -1, res.transactionHash, 0);

                    resolve({ status: true, trxid: res.transactionHash, 'details': res });
                })
            }).catch(function (e) {
                errorMsg = 'Error sending transaction';
                logger.withdraw('error', errorMsg)
                resolve({ status: false, 'msg': errorMsg, error: e });
            })
        });

    }


    async transferToMaster(fromAddress, balance) {
        logger.deposit('transferToMaster');
        logger.deposit('fromAddress', fromAddress);
        logger.deposit('balance', balance);
        let errorMsg = ''
        const fromPrvkey = await MasterwalletModel.getAddressPrvKey(this.token, fromAddress);
        let wallet = new ethers.Wallet(fromPrvkey, this.provider);
        let tokenContract = new ethers.Contract(this.contractAddress, eth_erc20_abi, wallet);

        const TokenBalance = await tokenContract.balanceOf(fromAddress);
        // let numberOfTokens = ethers.utils.parseUnits(TokenBalance.toString(), this.numberOfDecimals);
        let numberOfTokens = TokenBalance;
        if (numberOfTokens < this.withdrawLimit) {
            logger.deposit(`balance (${numberOfTokens}) not enough. ransfering calceled.`, this.withdrawLimit);
            return false;
        }

        //numberOfTokens = ethers.utils.parseUnits(TokenBalance.toString(), this.numberOfDecimals);


        logger.deposit('numberOfTokens', numberOfTokens);
        logger.deposit('numberOfTokens', numberOfTokens);
        if (fromAddress != this.masterAddress) {
            const sendgas = await this.sendGas(fromAddress, TokenBalance);
            if (!sendgas) {
                errorMsg = 'Error sendGas fails';
                logger.withdraw(errorMsg);
                console.log(errorMsg);
                return ({ 'status': false, 'msg': errorMsg })
            }
        }
        logger.deposit('gas sent successfully ');

        const estimageGasForTokenTransfer = await this.estimageGasForTokenTransfer(fromAddress, this.masterAddress, numberOfTokens);

        const overrides = { gasLimit: estimageGasForTokenTransfer.gasLimit.toString(), gasPrice: estimageGasForTokenTransfer.gasPrice.toString(), value: 0 }


        const token = this.token;
        return new Promise((resolve, reject) => {
            logger.deposit(`Transfering to master wallet ${this.masterAddress} : `, numberOfTokens.toString());
            logger.deposit('overrides ', overrides);
            tokenContract.transfer(this.masterAddress, numberOfTokens, overrides).then(function (transaction) {
                logger.deposit('transaction', transaction)
                transaction.wait().then((res) => {
                    logger.deposit('transfered successfully', res)

                    Masterwallet.updateBlance(token, 0, fromAddress, (balance) * -1, res.transactionHash, 0);

                    resolve({ status: true, trxid: res.transactionHash });
                }).catch(function (e) {
                    logger.deposit('error transfer ', e)
                    resolve({ status: false, error: e });
                })
            }).catch(function (e) {
                logger.deposit('error transfer ', e)
                resolve({ status: false, error: e });
            })
        })
    }



    async calculateTransferGas(gaddress, numberOfTokens) {

        let gasPrice = await this.provider.getGasPrice()
        gasPrice = gasPrice.add(10000000000).toString();

        let iface = new ethers.utils.Interface(eth_erc20_abi);
        const data = await iface.encodeFunctionData("transfer", [gaddress, numberOfTokens]);

        return new Promise((resolve, reject) => {
            this.provider.estimateGas({
                'to': this.contractAddress,
                'data': data,
                'value': 0
            }).then((gas) => {
                let gasLimit = Math.ceil(gas * 1.5);
                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': gasLimit,
                    'ethtosend': gasLimit.mul(Math.ceil(gasPrice))
                });
            }).catch((error) => {
                console.log('ERROR estimateGas')
                resolve({
                    'gasPrice': gasPrice,
                    'gasLimit': 100000,
                    'ethtosend': Math.ceil(100000 * gasPrice)
                });
            });

        });
    }

    async updateAddressBalance(fromAddress) {
        logger.withdraw('updateAddressBalance', fromAddress);
        let prvkey = '';
        let user_id = 0;
        if (!fromAddress) {
            return false;
        }
        const currBalance = await MasterwalletModel.getAddressBalance(this.token, fromAddress.address);
        const result = await this.checkAddressBalance(fromAddress.address, currBalance);
        logger.withdraw('from address balance check :', result);
        if (!result.status) {
            logger.withdraw('balance not match');
            //if balance differs update it
            user_id = await MasterwalletModel.getUserIdFromAddress(fromAddress.address, this.token)
            await MasterwalletModel.resetAddressBalance(this.token, fromAddress.address, result.balance);
            await MasterwalletModel.logBalanceChange(user_id, this.token, -1, 'unmatches balances', fromAddress.address, result.balance, result.balance);
        }
        logger.withdraw('return');
        return true;
    }


    async ERC20_SendTrx(senderContract, toAddress, toAmount) {
        let overrides = {
            value: 0,
            gasLimit: 250000
        };
        let client_amount = ethers.utils.parseEther(toAmount);
        logger.withdraw('ERC20_SendTrx');
        return new Promise((resolve, reject) => {
            senderContract.transfer_token_amount(this.contractAddress, toAddress, client_amount, overrides).then((result) => {
                logger.withdraw('transfer_token_amount', toAddress);
                result.wait().then(function (res) {
                    logger.withdraw('transfer successful', client_amount);
                    resolve(res)
                }).catch((err) => {
                    logger.withdraw('error approve 2', err);
                    resolve(false)
                })
            }).catch((err) => {
                logger.withdraw('error approve 2', err);
                resolve(false)
            })
        })
    }

    async ERC20_SendApprove(tokenContract, senderContractAddress, totalAmount) {

        console.log('senderContractAddress', senderContractAddress);
        console.log('totalAmount', totalAmount);
        let numberOfDecimals = 18;
        let numberOfTokens = ethers.utils.parseUnits(totalAmount.toString(), numberOfDecimals);
        console.log('numberOfTokens', numberOfTokens);
        return new Promise((resolve, reject) => {
            let overrides = {
                gasLimit: 50000
            };
            tokenContract.approve(senderContractAddress, numberOfTokens, overrides).then(function (tx) {
                tx.wait().then(function (result) {
                    logger.withdraw('approved', err);
                    resolve(true);
                }).catch((err) => {
                    logger.withdraw('error approve 2', err);
                    resolve(false)
                })
            }).catch((err) => {
                logger.withdraw('error approve 3', err);
                resolve(false)
            })
        })
    }


    async getWithdrawAddress(amount) {
        let fromAddress = await Eth_server_model.findWithdrawalAddress(this.token, amount);
        logger.withdraw('fromAddress', fromAddress);
        let prvkey = '';

        if (!fromAddress) {
            return false;
        }

        prvkey = await MasterwalletModel.getAddressPrvKey(this.token, fromAddress.address);
        //logger.withdraw('prvkey', prvkey);
        fromAddress.prvkey = await Masterwallet.decodePrvKey(this.token, prvkey);
        const result = await this.checkAddressBalance(fromAddress.address, fromAddress.balance);
        logger.withdraw('fromAddress', fromAddress);
        logger.withdraw('from address balance check :', result);
        if (!result.status) {
            logger.withdraw('balance not match');
            //if balance differs update it
            const user_id = await MasterwalletModel.getUserIdFromAddress(fromAddress.address, this.token)
            await MasterwalletModel.resetAddressBalance(this.token, fromAddress.address, result.balance);
            await MasterwalletModel.logBalanceChange(user_id, this.token, -1, 'unmatches balances', fromAddress.address, result.balance, result.balance);

            if (result.balance < amount) return false;
            fromAddress.balance = result.balance;
        }

        return fromAddress;
    }

    async checkAddressBalance(address, balance) {
        return new Promise((resolve, reject) => {
            console.log('checkAddressBalance', balance);
            const weiBalance = ethers.utils.parseEther(balance.toString());
            console.log('weiBalance', weiBalance);
            this.contract.balanceOf(address).then((realBalance) => {
                // convert a currency unit from wei to ether
                console.log('realBalance', realBalance);
                if (Math.abs(realBalance.sub(weiBalance)) < 100000) resolve({ 'status': true });
                else resolve({ 'status': false, 'balance': ethers.utils.formatEther(realBalance) });
            })
        })

    }


    async addressHasBalance(address, balance) {
        return new Promise((resolve, reject) => {
            console.log('checkAddressBalance', balance);

            this.contract.balanceOf(address).then((realBalance) => {
                // convert a currency unit from wei to ether

                if (realBalance > balance) resolve({ 'status': true });
                else resolve({ 'status': false, 'balance': realBalance });
            })
        })

    }
}

module.exports = ERC20;
