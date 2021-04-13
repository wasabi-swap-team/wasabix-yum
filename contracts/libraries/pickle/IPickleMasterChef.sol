pragma solidity >=0.6.2;

// pid 14 = p3crv pool

interface IPickleMasterChef {
  function deposit(uint256 _pid, uint256 _amount) external;
  function withdraw(uint256 _pid, uint256 _amount) external;
}
