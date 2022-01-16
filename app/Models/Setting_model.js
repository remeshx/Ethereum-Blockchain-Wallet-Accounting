const db = require('./db');

class Setting_model {

    static  getSetting(varName) {
        return new Promise((resolve,reject) => {
            
            db.query(
                `SELECT varValue from mw_settings where varName=?`,
                [varName],
                (error,response)=>{
                    if (error) {
                        console.log('error 11',error);
                        resolve(false);
                    }
                    console.log('getRandUnusedAddresse',response);
                    if (response.length>0) resolve(response[0].varValue);
                    else resolve(false);
                })
        });
    }

    static updateSetting(varName, varValue) {
        return new Promise((resolve,reject) => {
            
            db.query(
                `update mw_settings set varValue=? where varName=?`,
                [varValue,varName],
                (error,response)=>{
                    if (error) {
                        console.log('error 11',error);
                        resolve(false);
                    }                    
                    resolve(response.affectedRows);
                })
        });
    }



}

module.exports = Setting_model;