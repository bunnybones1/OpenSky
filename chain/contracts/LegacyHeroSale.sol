pragma solidity 0.7.4;

import "@horizongames/skyweaver-contracts/contracts/factories/BondingCurveFactory.sol";

contract LegacyHeroSale is BondingCurveFactory {
  constructor(
    address _firstOwner,
    uint256 _usdc,
    address _openskyAssetsAddress,
    uint256 _itemRangeMin,
    uint256 _itemRangeMax,
    uint256 _costInItems,
    uint256 _usdcCurveConstant,
    uint256 _usdcCurveScaleDown,
    uint256 _usdcCurveTickSize
  ) BondingCurveFactory(_firstOwner, _usdc, _openskyAssetsAddress, _itemRangeMin, _itemRangeMax, _costInItems, _usdcCurveConstant, _usdcCurveScaleDown, _usdcCurveTickSize) public {}
}