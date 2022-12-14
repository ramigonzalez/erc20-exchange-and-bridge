//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/// @notice This contact is the implementation of a brige
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract Validations {
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// PRIVATE FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    function _concatMessage(string memory _parameterName, string memory _message) internal pure returns (string memory) {
        return string.concat(_parameterName, _message);
    }

    function _isEmptyString(string memory _value, string memory _parameterName) internal pure {
        if (bytes(_value).length == 0) {
            string memory _message = _concatMessage('Invalid parameter: ', _parameterName);
            revert(_message);
        }
    }

    function _isZeroAddressCannotBeZero(address _address, string memory _parameterName) internal pure {
        if (_address == address(0)) {
            string memory _message = _concatMessage(_parameterName, ' cannot be zero address');
            revert(_message);
        }
    }

    function _isZeroAddressInvalidAddress(address _address, string memory _parameterName) internal pure {
        if (_address == address(0)) {
            string memory _message = _concatMessage('Invalid address ', _parameterName);
            revert(_message);
        }
    }

    function _isZeroAmountGreaterThanZero(uint256 _value, string memory _parameterName) internal pure {
        if (_value == 0) {
            string memory _message = _concatMessage(_parameterName, ' must be greater than zero');
            revert(_message);
        }
    }

    function _isZeroAmountWithMessage(uint256 _value, string memory _message) internal pure {
        if (_value == 0) {
            revert(_message);
        }
    }

    function _isValidRecipient(address _remittent, address _recipient) internal pure {
        if (_recipient == _remittent) {
            string memory _message = 'Invalid recipient, same as remittent';
            revert(_message);
        }
    }

    function _isZeroTxnValue() internal {
        if (msg.value == 0) {
            string memory _message = 'Invalid ether amount';
            revert(_message);
        }
    }

    function _isInternalOwnedAccount(address _contractAddress) private view returns (bool) {
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;

        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(_contractAddress)
        }

        return (codeHash != accountHash && codeHash != 0x0);
    }

    function _isContract(address _erc20Contract, string memory _parameterName) internal view {
        if (_isInternalOwnedAccount(_erc20Contract)) {
            string memory _message = _concatMessage(_parameterName, ' cannot be a contract');
            revert(_message);
        }
    }

    function _isNotContract(address _erc20Contract, string memory _parameterName) internal view {
        if (!_isInternalOwnedAccount(_erc20Contract)) {
            string memory _message = _concatMessage(_parameterName, ' is not a contract');
            revert(_message);
        }
    }

    function _isNotProtocolOwner(address _ownerAddress) internal view {
        if (msg.sender != _ownerAddress) {
            revert('Not autorized');
        }
    }

    function _isProtocolOwner(address _address, string memory _errorMessage) internal view {
        if (msg.sender == _address) {
            revert(_errorMessage);
        }
    }

    function _isMaxSupplyExceeded(
        uint256 _maxSupply,
        uint256 _tokenAmount,
        string memory _parameterName
    ) internal pure {
        if (_tokenAmount >= _maxSupply) {
            string memory _message = _concatMessage(_parameterName, ' exceeds max supply');
            revert(_message);
        }
    }

    function _hasSufficientBalance(
        uint256 _balance,
        uint256 _value,
        string memory _message
    ) internal pure {
        if (_balance < _value) {
            revert(_message);
        }
    }
}
