// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {IDetailedERC20} from "../interfaces/IDetailedERC20.sol";
import {IVaultAdapterV2} from "../interfaces/IVaultAdapterV2.sol";
import {IVesperPool} from "../interfaces/vesper/IVesperPool.sol";
import {IPoolRewards} from "../interfaces/vesper/IPoolRewards.sol";
import {IUniswapV2Router02} from "../libraries/uni/IUniswapV2Router02.sol";

/// @title VesperVaultAdapter
///
/// @dev A vault adapter implementation which wraps a vesper vault.
contract VesperVaultAdapter is IVaultAdapterV2 {
  using SafeERC20 for IDetailedERC20;
  using SafeMath for uint256;

  /// @dev The vault that the adapter is wrapping.
  IVesperPool public vault;

  /// @dev The vsp pool to claim vsp rewards from.
  IPoolRewards public vspPool;

  /// @dev UniswapV2Router
  IUniswapV2Router02 public uniV2Router;

  /// @dev vesperToken
  IDetailedERC20 public vesperToken;

  /// @dev wETH
  IDetailedERC20 public wETHToken;

  /// @dev The address which has admin control over this contract.
  address public admin;

  /// @dev The decimals of the token.
  uint256 public decimals;

  constructor(IVesperPool _vault, IPoolRewards _vspPool, address _admin,
              IUniswapV2Router02 _uniV2Router, IDetailedERC20 _vesperToken, IDetailedERC20 _wethToken) public {
    vault = _vault;
    vspPool = _vspPool;
    admin = _admin;
    uniV2Router = _uniV2Router;
    vesperToken = _vesperToken;
    wETHToken = _wethToken;

    updateApproval();
    decimals = _vault.decimals();
  }

  /// @dev A modifier which reverts if the caller is not the admin.
  modifier onlyAdmin() {
    require(admin == msg.sender, "VesperVaultAdapter: only admin");
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
    vault.deposit(_amount);
  }

  /// @dev Withdraws tokens from the vault to the recipient.
  ///
  /// This function reverts if the caller is not the admin.
  ///
  /// @param _recipient the account to withdraw the tokes to.
  /// @param _amount    the amount of tokens to withdraw.
  function withdraw(address _recipient, uint256 _amount, bool _isHarvest) external override onlyAdmin {
    // redeem original deposited vault token
    vault.withdraw(_tokensToShares(_amount));

    IDetailedERC20 vaultToken = IDetailedERC20(vault.token());

    // claim vesper token from pool rewards
    vspPool.claimReward(address(this));

    uint256 vspRewardsAmount = vesperToken.balanceOf(address(this));

    // sell vesper if is called from harvest and if there're vsp rewards
    if(_isHarvest && vspRewardsAmount > 0){
      address[] memory _pathVesper = new address[](3);
      _pathVesper[0] = address(vesperToken);
      _pathVesper[1] = address(wETHToken);
      _pathVesper[2] = address(vaultToken);

      uniV2Router.swapExactTokensForTokens(vspRewardsAmount,
                                           0,
                                           _pathVesper,
                                           address(this),
                                           block.timestamp+800);
    }

    // transfer all the vault token in adapter to yum vault
    vaultToken.transfer(_recipient, vaultToken.balanceOf(address(this)));
  }

  /// @dev Updates the vaults approval of the token to be the maximum value.
  function updateApproval() public {
    address _token = vault.token();
    IDetailedERC20(_token).safeApprove(address(vault), uint256(-1));
    vesperToken.safeApprove(address(uniV2Router), uint256(-1));
  }

  /// @dev Computes the number of tokens an amount of shares is worth.
  ///
  /// @param _sharesAmount the amount of shares.
  ///
  /// @return the number of tokens the shares are worth.
  function _sharesToTokens(uint256 _sharesAmount) internal view returns (uint256) {
    return vault.convertFrom18(_sharesAmount.mul(vault.convertTo18(vault.totalValue())).div(vault.totalSupply()));
  }

  /// @dev Computes the number of shares an amount of tokens is worth.
  ///
  /// @param _tokensAmount the amount of shares.
  ///
  /// @return the number of shares the tokens are worth.
  function _tokensToShares(uint256 _tokensAmount) internal view returns (uint256) {
    return vault.convertTo18(_tokensAmount).mul(vault.totalSupply()).div(vault.convertTo18(vault.totalValue()));
  }
}
