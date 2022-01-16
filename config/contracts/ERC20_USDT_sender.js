exports.abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "get_master_wallet_open",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },

    {
        "constant": true,
        "inputs": [],
        "name": "get_master_wallet",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "set_master_wallet",
        "type": "function",
        "payable": false,
        "stateMutability": "nonpayable",
        "inputs": [
            {
                "type": "address",
                "name": "new_master_wallet",
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "address",
                "name": "",
                "type": "address"
            }
        ]
    },
    {
        "constant": true,
        "inputs": [],
        "name": "get_sender_wallet",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "transfer_amount",
        "type": "function",
        "payable": true,
        "stateMutability": "payable",
        "inputs": [
            {
                "type": "uint256",
                "name": "client_amount"
            }, {
                "type": "address",
                "name": "client_address"
            }
        ],
        "outputs": [
            {
                "type": "uint256",
                "name": ""
            }
        ]
    },
    {
        "name": "transfer_token_amount",
        "type": "function",
        "payable": true,
        "stateMutability": "payable",
        "inputs": [
            {
                "type": "address",
                "name": "token_address"
            },
            {
                "type": "address",
                "name": "client_address"
            },
            {
                "type": "uint256",
                "name": "client_amount"
            }
        ],
        "outputs": [
            {
                "type": "bool",
                "name": ""
            }
        ]

    },
    {
        "name": "set_token_balance",
        "type": "function",
        "payable": false,
        "stateMutability": "nonpayable",
        "inputs": [
            {
                "type": "address",
                "name": "token_address"
            }
        ],
        "outputs": []

    },
    {
        "constant": true,
        "name": "get_token_balance",
        "type": "function",
        "payable": false,
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {
                "type": "uint256",
                "name": ""
            }
        ]
    }
];
