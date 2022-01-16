exports.gassspreader_gaslimit = '100000'
exports.gassspreader_address = '0x00'
exports.gasspreader_abi = [
    {
        "name": "sendgas",
        "type": "function",
        "payable": false,
        "stateMutability": "nonpayable",
        "inputs": [
            {
                "type": "uint256",
                "name": "gamount"
            }, {
                "type": "address",
                "name": "gaddress"
            }
        ],
        "outputs": [
            {
                "type": "bool",
                "name": ""
            }
        ]
    }
];
