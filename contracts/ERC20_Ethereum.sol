//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';
import './ERC20.sol';

/// @notice This contact follows the standard for ERC-20 fungible tokens
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract ERC20_Ethereum is ERC20 {
    /**
     * @notice Initialize the state of the ERC-20 Ethereum Token contract
     * @dev Throw if `_name` is empty. Message: "Invalid parameter: _name"
     * @dev Throw if `_symbol` is empty. Message: "Invalid parameter: _symbol"
     * @dev Throw if `_maxSupply` is zero amount. Message: "_maxSupply must be greater than zero"
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _maxSupply The maximum supply of the token. Zero for unlimited emition
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply
    ) ERC20(_name, _symbol, _maxSupply) {}
}
