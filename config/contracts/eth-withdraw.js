
const eth_contract_address = '0x74f32E0f195C9AF7C1f7285E9835bC1794EF12D4';
//const eth_contract_address = '0x9e569CC5b47287f9e2Bd5eA86fF8ACF10a1288f3';
const eth_contract_gas = 30000;
const eth_contract_abi = [
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
];

module.exports = { eth_contract_abi, eth_contract_address, eth_contract_gas }