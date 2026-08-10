package abis

import (
	"github.com/0xsequence/ethkit/ethartifact"
	"github.com/0xsequence/ethkit/ethcontract"
)

var (
	PaymentProxyFactory ethartifact.Artifact
)

func init() {
	PaymentProxyFactory = ethartifact.Artifact{
		ContractName: "OpenSkyPaymentProxy",
		ABI:          ethcontract.MustParseABI(paymentProxyFactoryABIJSON),
	}
}

var paymentProxyFactoryABIJSON = `[
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "_initialOwner",
		  "type": "address"
		}
	  ],
	  "stateMutability": "nonpayable",
	  "type": "constructor"
	},
	{
	  "anonymous": false,
	  "inputs": [
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "spender",
		  "type": "address"
		},
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "itemRecipient",
		  "type": "address"
		},
		{
		  "indexed": true,
		  "internalType": "uint256",
		  "name": "nonce",
		  "type": "uint256"
		},
		{
		  "indexed": false,
		  "internalType": "uint256[]",
		  "name": "itemIDsPurchased",
		  "type": "uint256[]"
		}
	  ],
	  "name": "ItemBurn",
	  "type": "event"
	},
	{
	  "anonymous": false,
	  "inputs": [
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "spender",
		  "type": "address"
		},
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "itemRecipient",
		  "type": "address"
		},
		{
		  "indexed": true,
		  "internalType": "uint256",
		  "name": "nonce",
		  "type": "uint256"
		},
		{
		  "indexed": false,
		  "internalType": "uint256[]",
		  "name": "itemIDsPurchased",
		  "type": "uint256[]"
		}
	  ],
	  "name": "ItemPurchase",
	  "type": "event"
	},
	{
	  "anonymous": false,
	  "inputs": [
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "previousOwner",
		  "type": "address"
		},
		{
		  "indexed": true,
		  "internalType": "address",
		  "name": "newOwner",
		  "type": "address"
		}
	  ],
	  "name": "OwnershipTransferred",
	  "type": "event"
	},
	{
	  "stateMutability": "nonpayable",
	  "type": "fallback"
	},
	{
	  "inputs": [],
	  "name": "getOwner",
	  "outputs": [
		{
		  "internalType": "address",
		  "name": "",
		  "type": "address"
		}
	  ],
	  "stateMutability": "view",
	  "type": "function"
	},
	{
	  "inputs": [],
	  "name": "name",
	  "outputs": [
		{
		  "internalType": "string",
		  "name": "",
		  "type": "string"
		}
	  ],
	  "stateMutability": "view",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "",
		  "type": "address"
		}
	  ],
	  "name": "nonces",
	  "outputs": [
		{
		  "internalType": "uint256",
		  "name": "",
		  "type": "uint256"
		}
	  ],
	  "stateMutability": "view",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "",
		  "type": "address"
		},
		{
		  "internalType": "address",
		  "name": "_from",
		  "type": "address"
		},
		{
		  "internalType": "uint256[]",
		  "name": "_ids",
		  "type": "uint256[]"
		},
		{
		  "internalType": "uint256[]",
		  "name": "_amounts",
		  "type": "uint256[]"
		},
		{
		  "internalType": "bytes",
		  "name": "_data",
		  "type": "bytes"
		}
	  ],
	  "name": "onERC1155BatchReceived",
	  "outputs": [
		{
		  "internalType": "bytes4",
		  "name": "",
		  "type": "bytes4"
		}
	  ],
	  "stateMutability": "nonpayable",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "_operator",
		  "type": "address"
		},
		{
		  "internalType": "address",
		  "name": "_from",
		  "type": "address"
		},
		{
		  "internalType": "uint256",
		  "name": "_id",
		  "type": "uint256"
		},
		{
		  "internalType": "uint256",
		  "name": "_amount",
		  "type": "uint256"
		},
		{
		  "internalType": "bytes",
		  "name": "_data",
		  "type": "bytes"
		}
	  ],
	  "name": "onERC1155Received",
	  "outputs": [
		{
		  "internalType": "bytes4",
		  "name": "",
		  "type": "bytes4"
		}
	  ],
	  "stateMutability": "nonpayable",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "_currencyToken",
		  "type": "address"
		},
		{
		  "internalType": "uint256",
		  "name": "_currencyAmount",
		  "type": "uint256"
		},
		{
		  "internalType": "uint32",
		  "name": "_nonce",
		  "type": "uint32"
		},
		{
		  "internalType": "uint256[]",
		  "name": "_itemIDsPurchased",
		  "type": "uint256[]"
		},
		{
		  "internalType": "address",
		  "name": "_itemRecipient",
		  "type": "address"
		}
	  ],
	  "name": "purchaseItems",
	  "outputs": [],
	  "stateMutability": "nonpayable",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "bytes4",
		  "name": "interfaceID",
		  "type": "bytes4"
		}
	  ],
	  "name": "supportsInterface",
	  "outputs": [
		{
		  "internalType": "bool",
		  "name": "",
		  "type": "bool"
		}
	  ],
	  "stateMutability": "pure",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "_newOwner",
		  "type": "address"
		}
	  ],
	  "name": "transferOwnership",
	  "outputs": [],
	  "stateMutability": "nonpayable",
	  "type": "function"
	},
	{
	  "inputs": [
		{
		  "internalType": "address",
		  "name": "_recipient",
		  "type": "address"
		},
		{
		  "internalType": "address",
		  "name": "_erc20",
		  "type": "address"
		}
	  ],
	  "name": "withdrawERC20",
	  "outputs": [],
	  "stateMutability": "nonpayable",
	  "type": "function"
	}
]`
