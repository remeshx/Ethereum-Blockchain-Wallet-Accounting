
const Eth_server = require('./Eth_server')
const ERC20 = require('./ERC20-tokens/ERC20')
const { eth_ERC20_USDT } = require('../../config/ETH_ERC20_USDT');

let _SERVERS = {
    'ETH':
    {
        'Chain': 'ETH',
        'class': Eth_server,
        'instance': null,
        'active': 1
    }
    ,
    'USDT':
    {
        'Chain': 'ETH',
        'token': 'USDT',
        'withdrawLimit': 10,
        'class': ERC20,
        'instance': null,
        'active': 1,
        'numberOfDecimals': 6,
        'contract': eth_ERC20_USDT.contract,
        'address': eth_ERC20_USDT.address,
        'prvkey': eth_ERC20_USDT.prvkey,
        'senderAbi': eth_ERC20_USDT.abi,
        'senderContract': "0x21e474F6003e26D4F09C1bbBAC64cd2699114515"
    }
};


class Servers {
    static start() {
        for (let server in _SERVERS) {
            if (server == 'ETH') _SERVERS[server].instance = new _SERVERS[server].class();
            else _SERVERS[server].instance = new _SERVERS[server].class(
                _SERVERS[server].token,
                _SERVERS[server].contract,
                _SERVERS[server].address,
                _SERVERS[server].prvkey,
                _SERVERS[server].senderContract,
                _SERVERS[server].senderAbi,
                _SERVERS[server].numberOfDecimals,
                _SERVERS[server].withdrawLimit
            );
            setTimeout(function () {
                console.log('server started:', server);
                _SERVERS[server].instance.start_server();
            }, 2000);
        }
    }
}

module.exports = { Servers, _SERVERS };