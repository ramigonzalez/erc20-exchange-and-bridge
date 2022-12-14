//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './ERC20.sol';

/// @notice This contact follows the standard for ERC-20 fungible tokens
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract ERC20_Polygon is ERC20 {
    /// @notice Trigger on any successful call to `burn` method
    event Burn(address indexed _from, address indexed _commandedBy, uint256 _value);

    /**
     * @notice Initialize the state of the contract ERC-20 Polygon Token contract
     * @dev Throw if `_name` is empty. Message: "Invalid parameter: _name"
     * @dev Throw if `_symbol` is empty. Message: "Invalid parameter: _symbol"
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     */
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol, 0) {}

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// EXTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /**
     * @notice Issues a new amount of tokens at the `_recipient` address
     * @dev Throw if `_amountToMint` is zero. Message: "_amountToMint must be greater than zero"
     * @dev Throw if `_recipient` is zero address. Message: "_recipient cannot be zero address"
     * @param _recipient It is the recipient account for the new tokens
     * @param _amountToMint is the amount of tokens to be minted
     */
    function mint(address _recipient, uint256 _amountToMint) external {
        // Checks
        // FIXME: Not autorized
        _isZeroAmountGreaterThanZero(_amountToMint, '_amountToMint');
        _isZeroAddressCannotBeZero(_recipient, '_recipient');

        // Effects
        totalSupply += _amountToMint;
        balanceOf[_recipient] += _amountToMint;

        // Events
        emit Transfer(address(0), _recipient, _amountToMint);
    }

    /**
     * @notice Burn a `_value` amount of tokens from `msg.sender` address.
     * Since bridge allways owns tokens from who is requesting transfer to Ethereum, there is no need to validate allowance
     * @dev Throw if `msg.sender` is zero address. Message: "msg.sender cannot be zero address"
     * @dev Throw if `_value` is zero. Message: "_value must be greater than zero"
     * @dev Throw if `msg.sender` account has insufficient tokens to burn. Message: "Insufficient balance"
     * @param _value It is the number of new tokens to be burned
     */
    function burn(uint256 _value) external {
        // Checks
        // FIXME: Not autorized
        _isZeroAddressCannotBeZero(msg.sender, 'msg.sender');
        _isZeroAmountGreaterThanZero(_value, '_value');
        _hasSufficientBalance(balanceOf[msg.sender], _value, 'Insufficient balance');

        // Effects
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;

        // Events
        emit Burn(msg.sender, msg.sender, _value); // _from and _commandedBy can be only PolygonBridge contract in this context
    }
}
