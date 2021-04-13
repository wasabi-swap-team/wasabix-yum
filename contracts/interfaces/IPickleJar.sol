pragma solidity ^0.6.12;

import {IDetailedERC20} from "./IDetailedERC20.sol";

interface IPickleJar is IDetailedERC20 {
  function token() external view returns (address underlying);

  function deposit(uint256 _amount) external;
  function withdraw(uint256 _shares) external;
  function getRatio() external view returns (uint256 ratio);
  function earn() external;

}
