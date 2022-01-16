const db = require('./db');

class Eth_server_model {

    static findWithdrawalAddress(token, amount) {
        return new Promise((resolve, reject) => {

            db.query(
                `SELECT address,balance from mw_balances where token=? and balance>=? and user_id>0 order by balance DESC limit 1`,
                [token, amount],
                (error, response) => {
                    if (error) {
                        console.log('error 11', error);
                        resolve(false);
                    }

                    if (response.length > 0) resolve(response[0]);
                    else resolve(false);
                })
        });
    }




}

module.exports = Eth_server_model;