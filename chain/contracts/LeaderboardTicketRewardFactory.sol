pragma solidity 0.7.4;

import "@horizongames/skyweaver-contracts/contracts/factories/RewardFactory.sol";

contract LeaderboardTicketRewardFactory is RewardFactory {
  constructor(
    address _initialOwner,
    address _assetsAddr,
    uint256 _periodLength,
    uint256 _periodMintLimit,
    bool _whitelistOnly
  ) RewardFactory(_initialOwner, _assetsAddr, _periodLength, _periodMintLimit, _whitelistOnly) public {}
}