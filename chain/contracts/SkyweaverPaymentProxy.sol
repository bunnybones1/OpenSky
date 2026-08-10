pragma solidity 0.7.4;

import "@0xsequence/payment-proxy/contracts/PaymentProxy.sol";

contract OpenSkyPaymentProxy is PaymentProxy {
  constructor(
    address _initialOwner
  ) PaymentProxy(_initialOwner, "OpenSky Payment Proxy") public {}
}