pragma solidity >=0.6.2;

interface I3CRVPool {
  function add_liquidity(uint256[3] memory amounts, uint256 min_mint_amount) external;
  function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
}
