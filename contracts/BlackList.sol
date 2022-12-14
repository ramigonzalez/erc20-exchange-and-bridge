//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';

/// @notice This contact is the implementation of a brige
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract BlackList is Validations {
    /// STATE VARIABLES
    address public owner; // The owner of the bridge protocol

    /// STATE MAPPINGS
    mapping(address => bool) public blackListed;

    /**
     * @notice Allows to add an address to the blacklist.
     * @dev Throw if `_invalidAddress` is zero address. Message: "_invalidAddress cannot be zero address".
     * @dev Throw if `_invalidAddress` is the owner of the protocol. Message: "Invalid address _invalidAddress".
     * @dev Throw if `_invalidAddress` is already added to the blacklist. Message: "Address already in the list".
     * @param _invalidAddress The address to be added to the blacklist.
     */
    function addAddressToBlackList(address _invalidAddress) external {
        // Check
        _isZeroAddressCannotBeZero(_invalidAddress, '_invalidAddress');
        _isInvalidAddress(_invalidAddress, '_invalidAddress');
        _isBlackListedAddress(_invalidAddress, true, 'Address already in the list');

        // Effect
        blackListed[_invalidAddress] = true;
    }

    /**
     * @notice Allows to remove an address from the blacklist.
     * @dev Throw if `_invalidAddress` is zero address. Message: "_invalidAddress cannot be zero address".
     * @dev Throw if `_invalidAddress` is not added to the blacklist. Message: "Address not found".
     * @param _invalidAddress The address to be removed from the blacklist.
     */
    function removeAddressFromBlackList(address _invalidAddress) external {
        // Check
        _isZeroAddressCannotBeZero(_invalidAddress, '_invalidAddress');
        _isBlackListedAddress(_invalidAddress, false, 'Address not found');

        // Effect
        blackListed[_invalidAddress] = false;
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// INTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    function _isBlackListedAddress(
        address _invalidAddress,
        bool exists,
        string memory _parameterName
    ) internal view {
        if (blackListed[_invalidAddress] == exists) {
            string memory _message = _concatMessage(_parameterName, ' address is in blacklist');
            revert(_message);
        }
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    ///  PRIVATE FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    function _isInvalidAddress(address _invalidAddress, string memory _parameterName) private view {
        if (owner == _invalidAddress) {
            string memory _message = _concatMessage('Invalid address ', _parameterName);
            revert(_message);
        }
    }
}
