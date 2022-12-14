//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './IERC20.sol';

interface ITokenPolygon is IERC20 {
    function mint(address _recipient, uint256 _amountToMint) external payable;

    function burn(uint256 _value) external;
}
