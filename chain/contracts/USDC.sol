pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import "@0xsequence/erc20-meta-token/contracts/mocks/ERC20Mock.sol";

contract USDC is ERC20Mock {
  uint256 constant decimals = 6;
}