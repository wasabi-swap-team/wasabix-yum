// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";

import {FixedPointMath} from "../libraries/FixedPointMath.sol";
import {IDetailedERC20} from "../interfaces/IDetailedERC20.sol";
import {IVaultAdapterV2} from "../interfaces/IVaultAdapterV2.sol";
import {IIdleToken} from "../interfaces/IIdleToken.sol";
import {IUniswapV2Router02} from "../libraries/uni/IUniswapV2Router02.sol";

/// @title IdleVaultAdapter
///
/// @dev A vault adapter implementation which wraps a IDLE vault.
contract IdleVaultAdapter is IVaultAdapterV2 {
  using FixedPointMath for FixedPointMath.uq192x64;
  using SafeERC20 for IDetailedERC20;
  using SafeMath for uint256;

  /// @dev The vault that the adapter is wrapping.
  IIdleToken public vault;

  /// @dev UniswapV2Router
  IUniswapV2Router02 public uniV2Router;

  /// @dev idleToken
  IDetailedERC20 public idleToken;

  /// @dev wETH
  IDetailedERC20 public wETHToken;

  /// @dev comp
  IDetailedERC20 public compToken;

  /// @dev The address which has admin control over this contract.
  address public admin;

  /// @dev The decimals of the token.
  uint256 public decimals;

  constructor(IIdleToken _vault, address _admin, IUniswapV2Router02 _uniV2Router, IDetailedERC20 _idleToken, IDetailedERC20 _compToken, IDetailedERC20 _wethToken) public {
    vault = _vault;
    admin = _admin;
    uniV2Router = _uniV2Router;
    idleToken = _idleToken;
    wETHToken = _wethToken;
    compToken = _compToken;

    updateApproval();
    decimals = _vault.decimals();
  }

  /// @dev A modifier which reverts if the caller is not the admin.
  modifier onlyAdmin() {
    require(admin == msg.sender, "IdleVaultAdapter: only admin");
    _;
  }

  /// @dev Gets the token that the vault accepts.
  ///
  /// @return the accepted token.
  function token() external view override returns (IDetailedERC20) {
    return IDetailedERC20(vault.token());
  }

  /// @dev Gets the total value of the assets that the adapter holds in the vault.
  ///
  /// @return the total assets.
  function totalValue() external view override returns (uint256) {
    return _sharesToTokens(vault.balanceOf(address(this)));
  }

  /// @dev Deposits tokens into the vault.
  ///
  /// @param _amount the amount of tokens to deposit into the vault.
  function deposit(uint256 _amount) external override {
    vault.mintIdleToken(_amount,true,address(0));
  }

  /// @dev Withdraws tokens from the vault to the recipient.
  ///
  /// This function reverts if the caller is not the admin.
  ///
  /// @param _recipient the account to withdraw the tokes to.
  /// @param _amount    the amount of tokens to withdraw.
  function withdraw(address _recipient, uint256 _amount, bool _isHarvest) external override onlyAdmin {
    // reddem dai + idle
    vault.redeemIdleToken(_tokensToShares(_amount));

    IDetailedERC20 daiToken = IDetailedERC20(vault.token());

    // sell idle if is called from harvest
    if(_isHarvest){
      address[] memory _pathIdle = new address[](3);
      _pathIdle[0] = address(idleToken);
      _pathIdle[1] = address(wETHToken);
      _pathIdle[2] = address(daiToken);

      uniV2Router.swapExactTokensForTokens(idleToken.balanceOf(address(this)),
                                           0,
                                           _pathIdle,
                                           address(this),
                                           block.timestamp+800);
      address[] memory _pathComp = new address[](3);
      _pathComp[0] = address(compToken);
      _pathComp[1] = address(wETHToken);
      _pathComp[2] = address(daiToken);

      uniV2Router.swapExactTokensForTokens(compToken.balanceOf(address(this)),
                                           0,
                                           _pathComp,
                                           address(this),
                                           block.timestamp+800);

    }

    // transfer all the dai in adapter to alchemist
    daiToken.transfer(_recipient,daiToken.balanceOf(address(this)));
  }

  /// @dev Updates the vaults approval of the token to be the maximum value.
  function updateApproval() public {
    address _token = vault.token();
    IDetailedERC20(_token).safeApprove(address(vault), uint256(-1));
    idleToken.safeApprove(address(uniV2Router), uint256(-1));
    compToken.safeApprove(address(uniV2Router), uint256(-1));
  }

  /// @dev Computes the number of tokens an amount of shares is worth.
  ///
  /// @param _sharesAmount the amount of shares.
  ///
  /// @return the number of tokens the shares are worth.

  function _sharesToTokens(uint256 _sharesAmount) internal view returns (uint256) {
    return _sharesAmount.mul(vault.tokenPrice()).div(10**decimals);
  }

  /// @dev Computes the number of shares an amount of tokens is worth.
  ///
  /// @param _tokensAmount the amount of shares.
  ///
  /// @return the number of shares the tokens are worth.
  function _tokensToShares(uint256 _tokensAmount) internal view returns (uint256) {
    return _tokensAmount.mul(10**decimals).div(vault.tokenPrice());
  }
}
