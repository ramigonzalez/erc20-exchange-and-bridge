//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './Validations.sol';
import './BlackList.sol';
import './interfaces/ITokenEthereum.sol';

/// @notice This contact is the implementation of an exchange between ERC-20 tokens and ethers
/// @dev Comment follow the Ethereum ´Natural Specification´ language format (´natspec´)
/// Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html
contract Exchange is Validations {
    /// STATE VARIABLES
    uint8 public decimals;
    uint256 public feePercentage;
    address public owner;
    address public tokenVault;
    address public erc20Contract;
    uint256 public feesCollected;

    // Gas optimisation technique. This variable is set after a calculation, so is at the end of variable definition
    uint256 public invariant;

    ITokenEthereum private tokenEthereumContract;

    /**
     * @notice Initialize the state of the Exchange contract.
     * @dev The `invariant` state variable will be initialized by multipliying ethers sent in transaction and `_tokenAmount`
     * @dev Throw if `_tokenAmount` is zero amount. Message: "Invalid _tokenAmount value".
     * @dev Throw if `_tokenVault` is zero address. Message: "Invalid address _tokenVault".
     * @dev Throw if `_erc20Contract` is zero address. Message: "_erc20Contract cannot be zero address".
     * @dev Throw if no ethers were deposited. Message: "No ethers deposited"
     * @dev Throw if `_tokenVault` is not an external owned account (EOA). Message: "_tokenVault cannot be a contract".
     * @dev Throw if `_erc20Contract` is not an internal owned account (IOA). Message: "_erc20Contract is not a contract".
     * @dev Throw if `_tokenVault` has a token balance less or equals than `_tokenAmount`. Message: "Insufficient tokens in the vault".
     * @param _tokenVault is the address where tokens are deposited while liquidity pool is initialized
     * @param _erc20Contract is the address of the ERC-20 token contract
     * @param _tokenAmount is the amount of tokens that will be extracted from the protocol owner address token balance to initialize the Exchange Liquidity Pool
     */
    constructor(
        address _tokenVault,
        address _erc20Contract,
        uint256 _tokenAmount
    ) payable {
        // Checks
        _isZeroAmountWithMessage(_tokenAmount, 'Invalid _tokenAmount value');
        _isZeroAddressInvalidAddress(_tokenVault, '_tokenVault');
        _isZeroAddressCannotBeZero(_erc20Contract, '_erc20Contract');
        _isNoEthersDeposited();
        _isContract(_tokenVault, '_tokenVault');
        _isNotContract(_erc20Contract, '_erc20Contract');

        tokenEthereumContract = ITokenEthereum(_erc20Contract);
        uint256 _tokenVaultBalance = tokenEthereumContract.balanceOf(_tokenVault);
        _hasSufficientBalance(_tokenVaultBalance, _tokenAmount, 'Insufficient tokens in the vault');

        // Effects
        decimals = 18;
        feePercentage = 3 * 10**15; // 0,3% => 0,003 en decimales => 3 * 10 ** 15
        owner = msg.sender;
        tokenVault = _tokenVault;
        erc20Contract = _erc20Contract;

        _setInvariant(_tokenVaultBalance + _tokenAmount);

        // Interact
        tokenEthereumContract.transferFrom(msg.sender, _tokenVault, _tokenAmount);
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// EXTERNAL FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /**
     * @notice Returns the amount of ethers needed to swap `_tokenAmount` amount of tokens
     * @dev Throw if `_tokenAmount` is zero amount. Message: "Invalid _tokenAmount value".
     * @param _tokenAmount is the amount of tokens we want to swap
     */
    function calculateEtherAmount(uint256 _tokenAmount) external view returns (uint256) {
        // Checks
        _isZeroAmountWithMessage(_tokenAmount, 'Invalid _tokenAmount value');

        // Effects
        uint256 stakedTokens = tokenEthereumContract.balanceOf(tokenVault) - _tokenAmount;
        return ((invariant * 1 ether) / stakedTokens) - getExchangeBalance();
    }

    /// @notice Returns the equivalent amount of tokens obtained for 1 ether.
    /// @dev It consider fees over 1 ETH using `feePercentage`state variable
    function getExchangeRate() external view returns (uint256) {
        // Effects
        uint256 oneEtherWithFees = 1 ether - feePercentage;
        return tokenEthereumContract.balanceOf(tokenVault) - ((invariant * 1 ether) / (getExchangeBalance() + oneEtherWithFees));
    }

    /**
     * @notice Receives needed ethers to swap for the amount of tokens sent by parameter
     * @dev If the amount of ethers received is greather than the amount needed, it will transfer back that amount.
     * @dev For `transferFrom` operation, exchange must have sufficient allowance over `tokenVault` tokens to be able to transfer them to `msg.sender` address
     * @dev Throw if `_amountToBuy` is zero amount. Message: "Invalid _amountToBuy value".
     * @dev Throw if `msg.value` is less than the amount needed to swap for tokens + fees. Message: "Insufficient ethers".
     * @param _amountToBuy is the amount of tokens we want to swap for ethers
     */
    function buyToken(uint256 _amountToBuy) external payable {
        // Checks
        _isZeroAmountWithMessage(_amountToBuy, 'Invalid _amountToBuy value');

        uint256 _ethersNeededForTokens = calculateEtherAmountForBuyTokens(_amountToBuy);
        uint256 _txFee = _calculateFee(_ethersNeededForTokens);
        uint256 _ethersNeededForTx = _ethersNeededForTokens + _txFee;
        _hasSentSufficientEthers(_ethersNeededForTx);

        // Effects
        feesCollected += _txFee;

        // Interact
        tokenEthereumContract.transferFrom(tokenVault, msg.sender, _amountToBuy);
        if (msg.value > _ethersNeededForTx) {
            uint256 transferBackEthersAmount = msg.value - _ethersNeededForTx;
            payable(msg.sender).transfer(transferBackEthersAmount);
        }
    }

    /**
     * @notice Exchanges the amount of tokens requested for ethers
     * @dev This ethers are holded by Exchange balance
     * @dev `msg.sender` must approve `_amountToExchange` amount of tokens to be spent by exchange contract in order to exchange be able to transfer them to `tokenVault`
     * @dev Throw if `_amountToExchange` is zero amount. Message: "Invalid _amountToExchange value".
     * @dev Throw if `exchange` ethers balance without fees is less than needed to pay user. Message: "Insufficient balance"
     * @param _amountToExchange is the amount of tokens to swap for ethers requsted by the user
     */
    function buyEther(uint256 _amountToExchange) external {
        // Checks
        _isZeroAmountWithMessage(_amountToExchange, 'Invalid _amountToExchange value');

        uint256 _ethersSwap = getEthersPerTokenAmount(_amountToExchange);
        uint256 _txFee = _calculateFee(_ethersSwap);
        uint256 _ethersSentBack = _ethersSwap - _txFee;
        _hasSufficientBalance(getExchangeBalance(), _ethersSentBack, 'Insufficient balance');

        // Effects
        feesCollected += _txFee;

        // Interact
        tokenEthereumContract.transferFrom(msg.sender, tokenVault, _amountToExchange);
        payable(msg.sender).transfer(_ethersSentBack);
    }

    /**
     * @notice Set the percentage collected by swap operations
     * @dev Throw if `_percentage` is zero amount. Message: "Invalid _percentage value".
     * @dev Throw if `msg.sender` is not the protocol owner. Message: "Not autorized".
     * @dev Throw if `_percentage` is out of range. Message: "Invalid _percentage value. Must be value between 0% - 100%".
     * @param _percentage is the percentage collected by swap operations
     */
    function setFeePercentage(uint256 _percentage) external {
        // Checks
        _isZeroAmountWithMessage(_percentage, 'Invalid _percentage value');
        _isNotProtocolOwner(owner);
        _isNotValidPercentage(_percentage);

        // Effects
        feePercentage = _percentage / 100;
    }

    /**
     * @notice Allows to the protocol's owner to increment liquidity pool by deposits ethers and tokens at same time.
     * @dev Protocol's owner will transfer ethers and the exchange automatically will transfer
     * the correspondant amount of tokens from owner's account to the tokenVault's account.
     * @dev Throw if `msg.sender` is not the protocol owner. Message: "Not autorized".
     * @dev Throw if no ethers were deposited. Message: "No ethers deposited".
     * @dev Throw if sender's balance do not have sufficient token amount. Message: "Insufficient balance".
     */
    function deposit() external payable {
        // Checks
        _isNotProtocolOwner(owner);
        _isNoEthersDeposited();

        uint256 _tokenAmount = getExchangeRateForEthersDeposited();
        uint256 _ownerTokenBalance = tokenEthereumContract.balanceOf(msg.sender);

        _hasSufficientBalance(_ownerTokenBalance, _tokenAmount, 'Insufficient balance');

        // Effects
        uint256 _tokensInStaking = _tokenAmount + _ownerTokenBalance;
        _setInvariant(_tokensInStaking);

        // Interact
        tokenEthereumContract.transferFrom(msg.sender, tokenVault, _tokenAmount);
    }

    /**
     * @notice Set the address of the account from where tokens were stored to make swaps.
     * @dev Throw if `_tokenVault` is zero address. Message: "Invalid address _tokenVault".
     * @dev Throw if `msg.sender` is not the protocol owner. Message: "Not autorized".
     * @dev Throw if `_tokenVault` is not an external owned account (EOA). Message: "_tokenVault cannot be a contract".
     * @dev Throw if `_tokenVault` token balance is less or equals than zero. Message: "_tokenVault has no balance".
     * @dev Throw if `_tokenVault` did not approve that exchange be able to spend its tokens. Message: "Invalid tokenVault address".
     * @param _tokenVault is the account from where tokens were stored to make swaps.
     */
    function setTokenVault(address _tokenVault) external {
        // Checks
        _isZeroAddressInvalidAddress(_tokenVault, '_tokenVault');
        _isNotProtocolOwner(owner);
        _isContract(_tokenVault, '_tokenVault');
        uint256 tokenVaultTokenBalance = tokenEthereumContract.balanceOf(_tokenVault);
        if (tokenVaultTokenBalance <= 0) revert('_tokenVault has no balance');
        if (tokenEthereumContract.allowance(_tokenVault, address(this)) <= 0) revert('Invalid tokenVault address');

        // Effects
        tokenVault = _tokenVault;
        _setInvariant(tokenVaultTokenBalance);
    }

    /// @notice Allows the protocol's owner to withdraw the collected fees
    /// @dev Throw if `msg.sender` is not the protocol owner. Message: "Not autorized".
    /// @dev Throw if `feesCollected` is less or equals than 0.5 ETH. Message: "Insufficient amount of fees".
    function withdrawFeesAmount() external {
        // Checks
        _isNotProtocolOwner(owner);
        if (feesCollected <= 0.5 ether) revert('Insufficient amount of fees');

        // Interact
        uint256 _feesToPay = feesCollected;
        feesCollected = 0;
        payable(msg.sender).transfer(_feesToPay);
    }

    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// PRIVATE FUNCTIONS
    /// ------------------------------------------------------------------------------------------------------------------------------------------
    /// @notice Returns the equivalent amount of ethers obtained for `_tokenAmount` amount of tokens.
    /// @dev This is exact same formula from ethers but using stakedTokens
    /// @dev Staked tokens are calculated by token vault balance token plus token amount that are requested to swap
    /// @param _tokenAmount is the amount of tokens we want to swap for ethers
    function getEthersPerTokenAmount(uint256 _tokenAmount) private view returns (uint256) {
        uint256 _stakedTokens = tokenEthereumContract.balanceOf(tokenVault) + _tokenAmount;
        return getExchangeBalance() - ((invariant * 1 ether) / _stakedTokens);
    }

    /// @notice Returns the exchange ethers balance without considering fees collected.
    function getExchangeBalance() private view returns (uint256) {
        return address(this).balance - feesCollected;
    }

    /// @notice Check if ethers sent in transaction are sufficient for requested amount of tokens
    function _hasSentSufficientEthers(uint256 _ethersNeeded) private view {
        if (msg.value < _ethersNeeded) {
            revert('Insufficient ethers');
        }
    }

    function _isNoEthersDeposited() private view {
        if (msg.value <= 0) {
            revert('No ethers deposited');
        }
    }

    /// @notice Sets the `invariant` state variable based on the exchange contract ehters balance not considering fees collected
    /// and `_tokensInStaking` amount of tokens
    /// @param _tokensInStaking is the total staked tokens on token vault contract
    function _setInvariant(uint256 _tokensInStaking) private {
        invariant = (getExchangeBalance() * _tokensInStaking) / 1 ether;
    }

    function _isNotValidPercentage(uint256 _percentage) private pure {
        if (_percentage > 100 ether) {
            revert('Invalid _percentage value. Must be value between 0% - 100%');
        }
    }

    function _calculateFee(uint256 _ethersSwap) private view returns (uint256) {
        return (_ethersSwap * feePercentage) / 1 ether;
    }

    /// @notice Returns the equivalent amount of tokens obtained for ethers deposited.
    function getExchangeRateForEthersDeposited() private view returns (uint256) {
        // Effects
        return tokenEthereumContract.balanceOf(tokenVault) - ((invariant * 1 ether) / getExchangeBalance());
    }

    /**
     * @notice Calculate the amount of ethers needed for requested amount of tokens
     * @dev Ethers sent on TX `msg.value` are not considered in exchange balance 
     * @dev Throw if `_tokenAmount` is zero amount. Message: "Invalid _tokenAmount value".
     * @param _tokenAmount is the amount of tokens we want to swap for ether
     */
    function calculateEtherAmountForBuyTokens(uint256 _tokenAmount) internal view returns (uint256) {
      _isZeroAmountWithMessage(_tokenAmount, 'Invalid _tokenAmount value');
      uint256 stakedTokens = tokenEthereumContract.balanceOf(tokenVault) - _tokenAmount;
      return ((invariant * 1 ether) / stakedTokens) - (getExchangeBalance() - msg.value);
    }
}
