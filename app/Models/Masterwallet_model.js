const db = require('./db');

class Masterwallet_model {

    static getExistingAddressesCount(token) {
        return new Promise((resolve, reject) => {
            db.query(
                `SELECT count(*) as acounts from mw_addresses where token=? and user_id is null`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve('');
                    }
                    console.log(response);
                    resolve(response[0].acounts);
                })
        });
    }




    static getRandUnusedAddresse(token) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT id,address from mw_addresses where user_id is null and token=? order by RAND() limit 1`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    console.log('getRandUnusedAddresse', response);
                    if (response.length > 0) resolve(response[0]);
                    else resolve(false);
                })
        });
    }


    static checkTokenExists(token) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT id from mw_tokens where token_id=?`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(true);
                    else resolve(false);
                })
        });
    }


    static loadAllAddresses(token = '') {
        return new Promise((resolve, reject) => {
            // / `SELECT address,token from mw_addresses where updated_at>NOW()-interval 1 month
            let sql = 'SELECT address,token from mw_addresses';
            let inputs = [];
            if (token != '') {
                sql = sql + ' where token=?';
                inputs = [token];
            }
            db.query(
                sql,
                inputs,
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response && response.length > 0) resolve(response);
                    else resolve(false);
                })
        });
    }






    static getUserAddress(user_id, token) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT address from mw_addresses where user_id=? and token=?`,
                [user_id, token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].address);
                    else resolve(false);
                })
        });
    }

    static getUserIdFromAddress(address, token) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT user_id from mw_addresses where address=? and token=?`,
                [address, token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].user_id);
                    else resolve(false);
                })
        });
    }

    static getAddressPrvKey(token, address) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT private_key from mw_addresses where  token=? and address=?`,
                [token, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].private_key);
                    else resolve(false);
                })
        });
    }

    static hasBalanceLog(blkheight, address, trxhash, callId = 0) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT id from mw_balances_log where block_height=? and trx_hash=? and callid=? and address=?`,
                [blkheight, trxhash, callId, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(true);
                    else resolve(false);
                })
        });
    }


    static insertNewAddressesBulk(values) {
        return new Promise((resolve, reject) => {

            db.query(
                `insert into  mw_addresses (private_key,address,created_at,updated_at,token) values ?`,
                [values],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                })
        });
    }

    static logBalanceChange(user_id, token, blkheight, trx_hash, address, deposit, withdraw, notify = 0, callId = 0) {
        return new Promise((resolve, reject) => {

            db.query(
                `insert into mw_balances_log (token,block_height,trx_hash,address,deposit,withdraw,created_at,notify,callid,user_id) values (?,?,?,?,?,?,NOW(),?,?,?)`,
                [token, blkheight, trx_hash, address, deposit, withdraw, notify, callId, user_id],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                })
        });
    }

    static getTransactions(token, trxid) {
        return new Promise((resolve, reject) => {

            db.query(
                `select address,deposit,callid,user_id from mw_balances_log where token=? and trx_hash=? `,
                [token, trxid],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    if (response && response.length > 0) resolve(response);
                    else resolve(false);
                })
        });
    }


    static insertNewAddressBalance(user_id, token, aaddress) {
        return new Promise((resolve, reject) => {

            db.query(
                `insert into  mw_balances (user_id,token,address,balance,updated_at) values (?,?,?,0,NOW())`,
                [user_id, token, aaddress],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                })
        });
    }

    static updateAddressBalance(token, address, value) {
        return new Promise((resolve, reject) => {

            db.query(
                `update mw_balances set balance=balance+(?) where token=? and address=?`,
                [value, token, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                })
        });
    }

    static getAddressBalance(token, address) {
        return new Promise((resolve, reject) => {

            db.query(
                `select balance from mw_balances where token=? and address=?`,
                [token, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].balance);
                    else resolve(false);
                })
        });
    }

    static getTotalBalance(token) {
        return new Promise((resolve, reject) => {

            db.query(
                `select SUM(balance) as totalbalance from mw_balances where token=?`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].totalbalance);
                    else resolve(false);
                })
        });
    }

    static getTotalWithdrawablwBalance(token) {
        return new Promise((resolve, reject) => {

            db.query(
                `select max(balance) as totalbalance from mw_balances where token=?`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].totalbalance);
                    else resolve(false);
                })
        });
    }

    static resetAddressBalance(token, address, balance) {
        return new Promise((resolve, reject) => {

            db.query(
                `update mw_balances set balance=? where token=? and address=?`,
                [balance, token, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                })
        });
    }

    static assignNewAddressToUser(aid, uid, uemail) {
        return new Promise((resolve, reject) => {

            db.query(
                `update mw_addresses set user_id=?, user_email=?,assigned_at=NOW() where id=?`,
                [uid, uemail, aid],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }
                    resolve(response.affectedRows);
                });
        });

    }


    static getChainId(chain) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT id from mw_tokens where token_id=?`,
                [chain],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].id);
                    else resolve(false);
                })
        });
    }

    static getTokenChain(token) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT chain from mw_tokens where token_id=?`,
                [token],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0].chain);
                    else resolve(false);
                })
        });
    }

    static getAddressId(chain_id, address) {
        return new Promise((resolve, reject) => {
            db.query(
                `SELECT id from mw_addresses where token=? and address=?`,
                [chain_id, address],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(flase);
                    }
                    resolve(response[0].id);
                })
        });
    }

}


module.exports = Masterwallet_model;