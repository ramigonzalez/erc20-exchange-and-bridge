//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IERC20 {
    function decimals() external pure returns (uint8);

    function maxSupply() external pure returns (uint256);

    function balanceOf(address _owner) external view returns (uint256);

    function allowance(address _owner, address _spender) external view returns (uint256);

    function transfer(address _to, uint256 _value) external;

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external;

    function approve(address _spender, uint256 _value) external;
}
