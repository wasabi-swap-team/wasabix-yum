// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;

import {Math} from "@openzeppelin/contracts/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";

import {FixedPointMathD8} from "../FixedPointMathD8.sol";
import {IDetailedERC20} from "../../interfaces/IDetailedERC20.sol";
import "hardhat/console.sol";

/// @title CDPD8
///
/// @dev A library which provides the CDPD8 data struct and associated functions.
library CDPD8 {
  using CDPD8 for Data;
  using FixedPointMathD8 for FixedPointMathD8.uq192x64;
  using SafeERC20 for IDetailedERC20;
  using SafeMath for uint256;

  struct Context {
    FixedPointMathD8.uq192x64 collateralizationLimit;
    FixedPointMathD8.uq192x64 accumulatedYieldWeight;
  }

  struct Data {
    uint256 totalDeposited;
    uint256 totalDebt;
    uint256 totalCredit;
    uint256 lastDeposit;
    FixedPointMathD8.uq192x64 lastAccumulatedYieldWeight;
  }

  function update(Data storage _self, Context storage _ctx) internal {
    uint256 _earnedYield = _self.getEarnedYield(_ctx);
    if (_earnedYield > _self.totalDebt) {
      uint256 _currentTotalDebt = _self.totalDebt;
      _self.totalDebt = 0;
      _self.totalCredit = _earnedYield.sub(_currentTotalDebt);
    } else {
      _self.totalDebt = _self.totalDebt.sub(_earnedYield);
    }
    _self.lastAccumulatedYieldWeight = _ctx.accumulatedYieldWeight;
  }

  /// @dev Assures that the CDPD8 is healthy.
  ///
  /// This function will revert if the CDPD8 is unhealthy.
  function checkHealth(Data storage _self, Context storage _ctx, string memory _msg) internal view {
    require(_self.isHealthy(_ctx), _msg);
  }

  /// @dev Gets if the CDPD8 is considered healthy.
  ///
  /// A CDPD8 is healthy if its collateralization ratio is greater than the global collateralization limit.
  ///
  /// @return if the CDPD8 is healthy.
  function isHealthy(Data storage _self, Context storage _ctx) internal view returns (bool) {
    return _ctx.collateralizationLimit.cmp(_self.getCollateralizationRatio(_ctx)) <= 0;
  }

  function getUpdatedTotalDebt(Data storage _self, Context storage _ctx) internal view returns (uint256) {
    uint256 _unclaimedYield = _self.getEarnedYield(_ctx);
    if (_unclaimedYield == 0) {
      return _self.totalDebt;
    }

    uint256 _currentTotalDebt = _self.totalDebt;
    if (_unclaimedYield >= _currentTotalDebt) {
      return 0;
    }

    return _currentTotalDebt - _unclaimedYield;
  }

  function getUpdatedTotalCredit(Data storage _self, Context storage _ctx) internal view returns (uint256) {
    uint256 _unclaimedYield = _self.getEarnedYield(_ctx);
    if (_unclaimedYield == 0) {
      return _self.totalCredit;
    }

    uint256 _currentTotalDebt = _self.totalDebt;
    if (_unclaimedYield <= _currentTotalDebt) {
      return 0;
    }

    return _self.totalCredit + (_unclaimedYield - _currentTotalDebt);
  }

  /// @dev Gets the amount of yield that a CDPD8 has earned since the last time it was updated.
  ///
  /// @param _self the CDPD8 to query.
  /// @param _ctx  the CDPD8 context.
  ///
  /// @return the amount of earned yield.
  function getEarnedYield(Data storage _self, Context storage _ctx) internal view returns (uint256) {
    FixedPointMathD8.uq192x64 memory _currentAccumulatedYieldWeight = _ctx.accumulatedYieldWeight;
    FixedPointMathD8.uq192x64 memory _lastAccumulatedYieldWeight = _self.lastAccumulatedYieldWeight;

    if (_currentAccumulatedYieldWeight.cmp(_lastAccumulatedYieldWeight) == 0) {
      return 0;
    }

    return _currentAccumulatedYieldWeight
      .sub(_lastAccumulatedYieldWeight)
      .mul(_self.totalDeposited)
      .decode();
  }

  /// @dev Gets a CDPD8s collateralization ratio.
  ///
  /// The collateralization ratio is defined as the ratio of collateral to debt. If the CDPD8 has zero debt then this
  /// will return the maximum value of a fixed point integer.
  ///
  /// This function will use the updated total debt so an update before calling this function is not required.
  ///
  /// @param _self the CDPD8 to query.
  ///
  /// @return a fixed point integer representing the collateralization ratio.
  function getCollateralizationRatio(Data storage _self, Context storage _ctx)
    internal view
    returns (FixedPointMathD8.uq192x64 memory)
  {
    uint256 _totalDebt = _self.getUpdatedTotalDebt(_ctx);
    if (_totalDebt == 0) {
      return FixedPointMathD8.maximumValue();
    }
    return FixedPointMathD8.fromU256(_self.totalDeposited).div(_totalDebt);
  }
}