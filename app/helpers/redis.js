const util = require('util');
const redis = require('redis');
const redisConfig = require('../../config/redis');


const redisClient = redis.createClient(redisConfig);

redisClient.on('error', err => {
    throw('REDIS Error ' + err);
});

// redisClient.set(["key1", "val1" , "key2" , "val2" , "key3" , "val3"], function (err, res) {

//     redisClient.get('key3', (err, reply) => {
//         if (err) throw err;
//         console.log(reply);
//     });
// });


let redisSet = util.promisify(redisClient.set).bind(redisClient);
let redisGet = util.promisify(redisClient.get).bind(redisClient);
let redisDel = util.promisify(redisClient.del).bind(redisClient);
let redisFlushall = util.promisify(redisClient.flushall).bind(redisClient);

module.exports = {redisClient,redisSet,redisGet,redisFlushall,redisDel};



