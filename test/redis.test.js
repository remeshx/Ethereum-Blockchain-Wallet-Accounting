const assert = require('assert');
const {redisSet,redisGet,redisDel} = require('../app/helpers/redis');



describe('Testing Redis', async () => {

    it('insert key value', async () => {
        await redisDel('test');
        await redisSet('test','testget');
    
        let getRes = await redisGet('test');
           console.log('redisGet',getRes);
           assert.strictEqual('testget', 'testget');
    });

});