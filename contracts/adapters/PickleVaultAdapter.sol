// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";

import {FixedPointMath} from "../libraries/FixedPointMath.sol";
import {IDetailedERC20} from "../interfaces/IDetailedERC20.sol";
import {IVaultAdapterV2} from "../interfaces/IVaultAdapterV2.sol";
import {IPickleJar} from "../interfaces/IPickleJar.sol";
import {IUniswapV2Router02} from "../libraries/uni/IUniswapV2Router02.sol";
import {I3CRVPool} from "../libraries/curve/I3CRVPool.sol";
import {IPickleMasterChef} from "../libraries/pickle/IPickleMasterChef.sol";

/// @title PickleJarAdapter
///
/// @dev A vault adapter implementation which wraps a pickle vault.
contract PickleVaultAdapter is IVaultAdapterV2 {
  using FixedPointMath for FixedPointMath.uq192x64;
  using SafeERC20 for IDetailedERC20;
  using SafeMath for uint256;

  /// @dev The vault that the adapter is wrapping.
  IPickleJar public vault;

  /// @dev The masterchef for pickle
  IPickleMasterChef public pickleMasterChef;

  /// @dev 3crv pool contract
  I3CRVPool public crvPool;

  /// @dev UniswapV2Router
  IUniswapV2Router02 public uniV2Router;

  /// @dev dai token
  IDetailedERC20 public daiToken;

  /// @dev 3crv token
  IDetailedERC20 public crvToken;

  /// @dev pickle
  IDetailedERC20 public pickleToken;

  /// @dev wETH
  IDetailedERC20 public wETHToken;

  /// @dev The address which has admin control over this contract.
  address public admin;

  /// @dev The decimals of the token.
  uint256 public decimals;

  constructor(IPickleJar _vault, IPickleMasterChef _pickleMasterChef, address _admin, I3CRVPool _crvPool, IUniswapV2Router02 _uniV2Router, IDetailedERC20 _crvToken, IDetailedERC20 _daiToken, IDetailedERC20 _pickleToken, IDetailedERC20 _wethToken) public {
    vault = _vault;
    pickleMasterChef = _pickleMasterChef;
    admin = _admin;
    crvPool = _crvPool;
    uniV2Router = _uniV2Router;

    crvToken = _crvToken;
    daiToken = _daiToken;
    pickleToken = _pickleToken;
    wETHToken = _wethToken;

    updateApproval();
    decimals = _vault.decimals();
  }

  /// @dev A modifier which reverts if the caller is not the admin.
  modifier onlyAdmin() {
    require(admin == msg.sender, "PickleJarAdapter: only admin");
    _;
  }

  /// @dev Gets the token that the vault accepts.
  ///
  /// @return the accepted token.
  function token() external view override returns (IDetailedERC20) {
    return daiToken;
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
    // dai to 3crv
    crvPool.add_liquidity([_amount,0,0],0);
    // 3crv to p3crv
    vault.deposit(crvToken.balanceOf(address(this)));
    // stake p3crv
    pickleMasterChef.deposit(14,vault.balanceOf(address(this)));

  }

  /// @dev Withdraws tokens from the vault to the recipient.
  ///
  /// This function reverts if the caller is not the admin.
  ///
  /// @param _recipient the account to withdraw the tokes to.
  /// @param _amount    the amount of tokens to withdraw.
  function withdraw(address _recipient, uint256 _amount, bool _isHarvest) external override onlyAdmin {
    //unstake p3crv
    pickleMasterChef.withdraw(14,_tokensToShares(_amount));
    // withdraw 3crv
    vault.withdraw(_tokensToShares(_amount));
    // 3crv to dai
    crvPool.remove_liquidity_one_coin(_tokensToShares(_amount),0,0);

    // sell pickle if is called from harvest
    if(_isHarvest){
      address[] memory _pathPickle = new address[](3);
      _pathPickle[0] = address(pickleToken);
      _pathPickle[1] = address(wETHToken);
      _pathPickle[2] = address(daiToken);

      uniV2Router.swapExactTokensForTokens(pickleToken.balanceOf(address(this)),
                                           0,
                                           _pathPickle,
                                           address(this),
                                           block.timestamp+800);

    }

    // transfer all the dai in adapter to alchemist
    daiToken.transfer(_recipient,daiToken.balanceOf(address(this)));
  }

  /// @dev Updates the vaults approval of the token to be the maximum value.
  function updateApproval() public {
    address _token = address(crvToken);

    // approve 3crv for deposit into pickle
    IDetailedERC20(_token).safeApprove(address(vault), uint256(-1));
    // approve dai for converting to 3crv
    daiToken.safeApprove(address(crvPool), uint256(-1));

    // approve p3crv for staking into masterchef
    IDetailedERC20(address(vault)).safeApprove(address(pickleMasterChef), uint256(-1));

    // approve pickleToken for uniswap trade
    pickleToken.safeApprove(address(uniV2Router), uint256(-1));

  }

  /// @dev Computes the number of tokens an amount of shares is worth.
  ///
  /// @param _sharesAmount the amount of shares.
  ///
  /// @return the number of tokens the shares are worth.

  function _sharesToTokens(uint256 _sharesAmount) internal view returns (uint256) {
    return _sharesAmount.mul(vault.getRatio()).div(10**decimals);
  }

  /// @dev Computes the number of shares an amount of tokens is worth.
  ///
  /// @param _tokensAmount the amount of shares.
  ///
  /// @return the number of shares the tokens are worth.
  function _tokensToShares(uint256 _tokensAmount) internal view returns (uint256) {
    return _tokensAmount.mul(10**decimals).div(vault.getRatio());
  }
}
