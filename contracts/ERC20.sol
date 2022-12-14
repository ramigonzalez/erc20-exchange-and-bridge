//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';

/// @notice This contact follows the standard for ERC-20 fungible tokens
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
abstract contract ERC20 is Validations {
    /// STATE VARIABLES
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    uint256 public maxSupply;
    address public owner;

    /// STATE MAPPINGS
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// EVENTS
    /**
     * @notice Trigger when tokens are transferred
     * @dev On new tokens creation, trigger with the `from` address set to zero address
     */
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    /**
     * @notice Trigger on any successful call to `approve` method
     */
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    /**
     * @notice Initialize the state of the contract
     * @dev Throw if `_name` is empty. Message: "Invalid parameter: _name"
     * @dev Throw if `_symbol` is empty. Message: "Invalid parameter: _symbol"
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _maxSupply The maximum supply of the token. Zero for unlimited emition
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply
    ) {
        // Checks
        _isEmptyString(_name, '_name');
        _isEmptyString(_symbol, '_symbol');

        // Effects
        name = _name;
        symbol = _symbol;
        decimals = 18;
        totalSupply = _maxSupply;
        maxSupply = _maxSupply;
        owner = msg.sender;
        balanceOf[msg.sender] += _maxSupply;

        // Events
        emit Transfer(address(0), msg.sender, _maxSupply);
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// EXTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /**
     * @notice Transfers `_value` amount of tokens from sender to address `_to`. On success must fire the `Transfer` event.
     * @dev Throw if `_to` is zero address. Message: "_to cannot be zero address"
     * @dev Throw if `_to` is sender account. Message: "Invalid recipient, same as remittent"
     * @dev Throw if remittent account has insufficient balance. Message: "Insufficient balance"
     * @param _to It is the recipient account address
     * @param _value It is the amount of tokens to transfer.
     */
    function transfer(address _to, uint256 _value) external {
        // Checks
        _isZeroAddressCannotBeZero(_to, '_to');
        _isValidRecipient(msg.sender, _to);
        _hasSufficientBalance(balanceOf[msg.sender], _value, 'Insufficient balance');

        // Effects
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;

        // Events
        emit Transfer(msg.sender, _to, _value);
    }

    /**
     * @notice Transfers `_value` amount of tokens from address `_from` to address `_to`. On success must fire the `Transfer` event.
     * @dev Throw if `_from` is zero address. Message: "_from cannot be zero address"
     * @dev Throw if `_to` is zero address. Message: "_to cannot be zero address"
     * @dev Throw if `_to` is the same as `_from` account. Message: "Invalid recipient, same as remittent"
     * @dev Throw if `_from` account has insufficient balance. Message: "Insufficient balance"
     * @dev Throw if an approved address has no sufficient permission to spend the balance of the '_from' account. Message: "Insufficent allowance"
     * @param _from It is the remittent account address
     * @param _to It is the recipient account address
     * @param _value It is the amount of tokens to transfer.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external {
        // Checks
        _isZeroAddressCannotBeZero(_from, '_from');
        _isZeroAddressCannotBeZero(_to, '_to');
        _isValidRecipient(_from, _to);
        _hasSufficientBalance(balanceOf[_from], _value, 'Insufficient balance');
        _isAuthorized(_from, msg.sender, _value);

        // Effects
        if (_from != msg.sender) allowance[_from][msg.sender] -= _value;
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;

        // Events
        emit Transfer(_from, _to, _value);
    }

    /**
     * @notice Allows `_spender` to withdraw from sender account multiple times, up to the `_value` amount
     * On success must fire the `Approval` event.
     * @dev If this function is called multiple times it overwrites the current allowance with `_value`
     * @dev Throw if `_spender` is zero address. Message: "_spender cannot be zero address"
     * @dev Throw if `_value` exceeds the sender's balance. Message: "Insufficient balance"
     * @dev Throw if allowance tries to be set to a new value, higher than zero, for the same spender,
     * with a current allowance different that zero. Message: "Invalid allowance amount. Set to zero first"
     * @param _spender It is the spender account address
     * @param _value It is the allowance amount.
     */
    function approve(address _spender, uint256 _value) external {
        // Checks
        _isZeroAddressCannotBeZero(_spender, '_spender');
        _hasSufficientBalance(balanceOf[msg.sender], _value, 'Insufficient balance');
        if (_value > 0 && allowance[msg.sender][_spender] > 0) {
            revert('Invalid allowance amount. Set to zero first');
        }

        // Effects
        allowance[msg.sender][_spender] = _value;

        // Events
        emit Approval(msg.sender, _spender, _value);
    }

    /// -----------------------------------------------------------------------------------------------------------------------------------------
    /// INTERNAL FUNCTIONS
    /// -----------------------------------------------------------------------------------------------------------------------------------------
    function _isAuthorized(
        address _owner,
        address _spender,
        uint256 _value
    ) internal view {
        if (_owner != _spender && allowance[_owner][_spender] < _value) {
            string memory _message = 'Insufficent allowance';
            revert(_message);
        }
    }
}
