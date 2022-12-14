//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';
import './BlackList.sol';
import './interfaces/ITokenEthereum.sol';

/// @notice This contact is the implementation of a brige
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract Bridge_Ethereum is Validations, BlackList {
    /// STATE VARIABLES
    address public erc20Contract; // The ERC-20 token address in Ethereum

    ITokenEthereum private tokenEthereumContract;

    /// STATE MAPPINGS
    mapping(address => uint256) public stake;

    /// EVENTS
    /**
     * @notice Triggered when tokens are transferred to Polygon network
     * @param _from The destination address which the tokens will belong.
     * @param _value The amount of ERC-20 tokens to be minted in Polygon.
     */
    event TransferToPolygon(address indexed _from, uint256 _value);

    /**
     * @notice Initialize the state of the Ethereum Bridge contract
     * @dev Throw if `_erc20Contract` is zero address. Message: "_erc20Contract cannot be zero address".
     * @dev Throw if `_erc20Contract` is not an internal owned account (IOA). Message: "_erc20Contract is not a contract".
     * @param _erc20Contract The address of the ethereum ERC-20 token contract
     */
    constructor(address _erc20Contract) {
        // Checks
        _isZeroAddressCannotBeZero(_erc20Contract, '_erc20Contract');
        _isNotContract(_erc20Contract, '_erc20Contract');

        // Effects
        owner = msg.sender;
        erc20Contract = _erc20Contract;
        tokenEthereumContract = ITokenEthereum(_erc20Contract);
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// EXTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /**
     * @notice Transfer `_tokenAmount` tokens from sender to bridge. Then, stakes same amount of tokens identified by sender address.
     * On success must fire the `TransferToPolygon` event.
     * @dev Throw if `_tokenAmount` is zero amount. Message: "_tokenAmount must be greater than zero"
     * @dev Throw if `_maxSupply` is zero amount. Message: "_maxSupply must be greater than zero"
     * @dev Throw if `_tokenAmount` exceed the maximum supply of ERC20_Ethereum. Message: "_tokenAmount exceeds max supply"
     * @dev Throw if `msg.sender` is blacklisted. Message: "Invalid sender"
     * @dev Throw if `msg.sender` account has insufficient balance. Message: "Insufficient balance"
     * @param _tokenAmount It is the amount of tokens to transfer to Polygon network.
     */
    function transferToPolygon(uint256 _tokenAmount) external {
        // Checks
        _isZeroAmountGreaterThanZero(_tokenAmount, '_tokenAmount');
        uint256 _maxSupply = tokenEthereumContract.maxSupply();
        _isZeroAmountGreaterThanZero(_maxSupply, '_maxSupply');
        _isMaxSupplyExceeded(_maxSupply, _tokenAmount, '_tokenAmount');
        _isBlackListedAddress(msg.sender, true, 'Invalid sender');
        _hasSufficientBalance(tokenEthereumContract.balanceOf(msg.sender), _tokenAmount, 'Insufficient balance');

        // Effects
        tokenEthereumContract.transferFrom(msg.sender, address(this), _tokenAmount);
        stake[msg.sender] += _tokenAmount;

        // Events
        emit TransferToPolygon(msg.sender, _tokenAmount);
    }

    /**
     * @notice Unstakes `_tokenAmount` amount of tokens that have been deposited to be transferred to Polygon.
     * @dev Throw if `msg.sender` is not the owner of the protocol. Message: "Not autorized".
     * @dev Throw if `_owner` is the zero address. Message: "_owner cannot be zero address".
     * @dev Throw if `_owner` is blacklisted. Message: "_owner address is in blacklist".
     * @dev Throw if `_owner` has no stake. Message: "_owner address has no stake".
     * @dev Throw if `_tokenAmount` is not greater than zero. Message: "_tokenAmount must be greater than zero".
     * @dev Throw if `_tokenAmount` is greater than staked amount. Message: "_tokenAmount value exceed staking".
     * @param _owner It is the address of the user that is getting the tokens.
     * @param _tokenAmount It is the amount of tokens to be un-staked.
     */
    function unStake(address _owner, uint256 _tokenAmount) external {
        // Checks
        _isNotProtocolOwner(owner);
        _isZeroAddressCannotBeZero(_owner, '_owner');
        _isBlackListedAddress(_owner, true, '_owner');
        require(stake[_owner] > 0, '_owner address has no stake'); // TODO: Migrate to private method
        _isZeroAmountGreaterThanZero(_tokenAmount, '_tokenAmount');
        require(_tokenAmount <= stake[_owner], '_tokenAmount value exceed staking'); // TODO: Migrate to private method

        // Effects
        stake[_owner] -= _tokenAmount;
        tokenEthereumContract.transfer(_owner, _tokenAmount);
    }

    function setTokenEthereumContractAddress(address _ERC20Address) external {
        tokenEthereumContract = ITokenEthereum(_ERC20Address);
    }
}
