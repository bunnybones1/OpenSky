package abis

import (
	"github.com/0xsequence/ethkit/ethartifact"
	"github.com/0xsequence/ethkit/ethcontract"
)

var GoldRewardFactory ethartifact.Artifact

func init() {
	GoldRewardFactory = ethartifact.Artifact{
		ContractName: "GoldRewardFactory",
		ABI:          ethcontract.MustParseABI(goldRewardFactoryABIJSON),
	}
}

var goldRewardFactoryABIJSON = `[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_initialOwner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_assetsAddr",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_periodLength",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_periodMintLimit",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_whitelistOnly",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "disabledIds",
          "type": "uint256[]"
        }
      ],
      "name": "AssetsDisabled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "enabledIds",
          "type": "uint256[]"
        }
      ],
      "name": "AssetsEnabled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "previousTier",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "newTier",
          "type": "uint256"
        }
      ],
      "name": "OwnershipGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "oldMintingLimit",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newMintingLimit",
          "type": "uint256"
        }
      ],
      "name": "PeriodMintLimitChanged",
      "type": "event"
    },
    {
      "stateMutability": "nonpayable",
      "type": "fallback"
    },
    {
      "inputs": [],
      "name": "PERIOD_LENGTH",
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
          "name": "_address",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_tier",
          "type": "uint256"
        }
      ],
      "name": "assignOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_to",
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
      "name": "batchMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "_disabledIds",
          "type": "uint256[]"
        }
      ],
      "name": "disableMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "_enabledIds",
          "type": "uint256[]"
        }
      ],
      "name": "enableMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAvailableSupply",
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
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "getOwnerTier",
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
      "inputs": [],
      "name": "livePeriod",
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
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "mintWhitelist",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "periodMintLimit",
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
      "inputs": [],
      "name": "openskyAssets",
      "outputs": [
        {
          "internalType": "contract IOpenSkyAssets",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
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
          "internalType": "uint256",
          "name": "_newPeriodMintLimit",
          "type": "uint256"
        }
      ],
      "name": "updatePeriodMintLimit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]`
