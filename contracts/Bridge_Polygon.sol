//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';
import './BlackList.sol';
import './interfaces/ITokenPolygon.sol';

contract Bridge_Polygon is Validations, BlackList {
    /// STATE VARIABLES
    address public erc20Contract; // The ERC-20 token address in Polygon

    ITokenPolygon private tokenPolygonContract;

    /// EVENTS
    /**
     * @notice Trigger when a minting tokens
     * @param _to The destination address which the tokens will belong.
     * @param _tokenAmount The amount of ERC-20 tokens to be minted in Polygon.
     */
    event MintOrder(address indexed _to, uint256 _tokenAmount);
    /**
     * @notice Trigger when tokens are transferred from Polygon to Ethereum.
     * @param _from The address that requested the transfer.
     * @param _tokenAmount The amount of tokens to be transferred from Polygon to Ethereum.
     */
    event TransferToEthereum(address indexed _from, uint256 _tokenAmount);

    /**
     * @notice Initialize the state of the contract.
     * @dev Throw if `_erc20Contract` is zero address. Message: "Invalid address _erc20Contract".
     * @dev Throw if `_erc20Contract` is the owner of the protocol. Message: "Invalid address _erc20Contract".
     * @dev Throw if `_erc20Contract` is not an internal owned account (IOA). Message: "_erc20Contract is not a contract".
     * @param _erc20Contract The ERC-20 token address.
     */
    constructor(address _erc20Contract) {
        // Checks
        _isZeroAddressInvalidAddress(_erc20Contract, '_erc20Contract');
        _isProtocolOwner(_erc20Contract, 'Invalid address _erc20Contract');
        _isNotContract(_erc20Contract, '_erc20Contract');

        // Effects
        owner = msg.sender;
        erc20Contract = _erc20Contract;
        tokenPolygonContract = ITokenPolygon(_erc20Contract);
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// EXTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Mints an amount of ERC-20 tokens in Polygon and assigns it to a given address.
     * @dev Throw if the method is not called by the owner. Message: "Not autorized".
     * @dev Throw if `_to` is zero address. Message: "_to cannot be zero address".
     * @dev Throw if `_to` is in the blacklist. Message: "_to address is in blacklist".
     * @dev Throw if `_tokenAmount` is not greater than zero. Message: "_tokenAmount must be greater than zero".
     * @dev Throw if `_tokenAmount` is greater than max supply. Message: "_tokenAmount exceeds max supply".
     * @param _to The destination address to which the tokens will be assigned.
     * @param _tokenAmount The amount of ERC-20 tokens to be minted in Polygon.
     */
    function mintTo(address _to, uint256 _tokenAmount) external {
        // Checks
        _isNotProtocolOwner(owner);
        _isZeroAddressCannotBeZero(_to, '_to');
        _isBlackListedAddress(_to, true, '_to');
        _isZeroAmountGreaterThanZero(_tokenAmount, '_tokenAmount');

        // Effects
        tokenPolygonContract.mint(_to, _tokenAmount);

        // Events
        emit MintOrder(_to, _tokenAmount);
    }

    /**
     * @notice Allows an address to transfer tokens from Polygon to Ethereum.
     * @dev Throw if `_tokenAmount` is not greater than zero. Message: "_tokenAmount must be greater than zero".
     * @dev Throw if `_tokenAmount` is greater than the balance of the sender. Message: "_tokenAmount value exceed balance".
     * @param _tokenAmount The amount of tokens to be transferred from Polygon to Ethereum.
     */
    function transferToEthereum(uint256 _tokenAmount) external {
        // Checks
        _isZeroAmountGreaterThanZero(_tokenAmount, '_tokenAmount');
        require(_tokenAmount <= tokenPolygonContract.balanceOf(msg.sender), '_tokenAmount value exceed balance');

        // Effects
        tokenPolygonContract.transferFrom(msg.sender, address(this), _tokenAmount);
        tokenPolygonContract.burn(_tokenAmount);

        // Events
        emit TransferToEthereum(msg.sender, _tokenAmount);
    }
}
