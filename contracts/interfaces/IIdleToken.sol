pragma solidity ^0.6.12;

interface IIdleToken {
  function token() external view returns (address underlying);
  function govTokens(uint256) external view returns (address govToken);
  function userAvgPrices(address) external view returns (uint256 avgPrice);
  function mintIdleToken(uint256 _amount, bool _skipWholeRebalance, address _referral) external returns (uint256 mintedTokens);
  function redeemIdleToken(uint256 _amount) external returns (uint256 redeemedTokens);
  function redeemInterestBearingTokens(uint256 _amount) external;
  function rebalance() external returns (bool);
  function rebalanceWithGST() external returns (bool);
  function tokenPrice() external view returns (uint256 price);
  function getAPRs() external view returns (address[] memory addresses, uint256[] memory aprs);
  function getAvgAPR() external view returns (uint256 avgApr);
  function getGovTokensAmounts(address _usr) external view returns (uint256[] memory _amounts);
  function openRebalance(uint256[] calldata _newAllocations) external returns (bool, uint256 avgApr);

  function balanceOf(address owner) external view returns (uint);
  function decimals() external view returns (uint);
}
