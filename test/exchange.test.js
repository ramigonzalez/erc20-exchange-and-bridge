const { ethers } = require('hardhat');
const { expect, use } = require('chai');
const { solidity, deployMockContract } = require('ethereum-waffle');
use(solidity);

const { ZERO_ADDRESS, deployContract, getContractAbi, preCalculateFutureContractAddress, ONE_ETHER, calculateSpentGas } = require('./utils');
const constants = require('./utils/constants');

const contracts = constants.contracts;

let wallet, walletTo, tokenVault, noBalanceWallet;
let exchageDefault;
let dummyContract;

/**
 * Initializa ERC20_Ethereum and Exchange contracts. After execute this method `tokenVault` address
 * will have double `tokensToInitExchange` amount of tokens in his balance
 * @param {*} wallet
 * @param {*} tokenVault
 * @param {*} ethersToSendToExchange
 * @param {*} tokensToInitExchange
 * @returns {Object} An object containing ERC20_Ethereum and Exchange contracts initialized
 */
const initExchangeContract = async (wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange) => {
    // 1. Wallet will have positiva balance after deploying ERC20_Ethereum contract
    const tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
        constants.defaultTokenEthereum.name,
        constants.defaultTokenEthereum.symbol,
        constants.defaultTokenEthereum.maxSupply,
    ]);

    // 2. Precalculate Exchange future address for a contract that will be deployed 2 TXs ahead
    const txnsAhead = 2;
    const exchangeContractFutureAddress = await preCalculateFutureContractAddress(wallet, txnsAhead);

    // 3. [TX #1] Approve certain value for exchange be able to transfer founds while is being deployed
    await tokenEthereumContract.approve(exchangeContractFutureAddress, tokensToInitExchange);

    // 4. [TX #2] Make sure that tokenVault has a greater or equals token balance than `_tokenAmount`
    await tokenEthereumContract.transfer(tokenVault.address, tokensToInitExchange);

    // 5. Deploy exchange contract.
    const txOptions = { value: ethersToSendToExchange };
    exchangeContract = await deployContract(wallet, contracts.EXCHANGE, [tokenVault.address, tokenEthereumContract.address, tokensToInitExchange], txOptions);
    return { tokenEthereumContract, exchangeContract };
};

const buyEthersCall = async ({ tokenEthereumContract, exchangeContract, wallet }, tokenAmountToExchangeForEthers) => {
    const provider = ethers.provider;

    // 2. Calculate `tokenVault` token balance BEFORE buyEthers()
    const tokenVaultTokenBalance_before = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);

    // 3. Calculate `wallet` token balance BEFORE buyEthers()
    const walletBalance_before = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);

    // 4. Calculate fees collected BEFORE buyEthers()
    const feesCollected_beforeTx = await exchangeContract.connect(provider).feesCollected();

    // 5. Calculate exchange ethers balance before Tx
    const exchange_ethersBalance_before_withoutFees = (await provider.getBalance(exchangeContract.address)).sub(feesCollected_beforeTx);

    // 6. Calculate equivalence [ethers - tokens] balance ecuation
    const invariant = await exchangeContract.connect(provider).invariant();
    const stakedTokensAtInitofBuyEthersTx = tokenVaultTokenBalance_before.add(tokenAmountToExchangeForEthers);

    // invariant (i) / staked_tokens (t)
    const invariantDividedByStakedTokens = invariant.mul(ONE_ETHER).div(stakedTokensAtInitofBuyEthersTx);

    // exchange ethers balance without fees (e)
    // balance equation: e - [ e - (i/t) ]
    const expectedEthersToPay = exchange_ethersBalance_before_withoutFees.sub(invariantDividedByStakedTokens);

    // 7. Calculate `wallet` ethers balance BEFORE buyEthers()
    const wallet_ethersBalance_before = await provider.getBalance(wallet.address);

    // 8. Call exchange buyEther() method
    const tx_buyEthers = await exchangeContract.buyEther(tokenAmountToExchangeForEthers);

    // 9. Calculate SPENT GAS
    const gasSpent = await calculateSpentGas(tx_buyEthers);

    // 10. Calculate fees collected
    const feesCollectedAfterTx = await exchangeContract.connect(provider).feesCollected();

    return {
        tokenVaultTokenBalance_before: tokenVaultTokenBalance_before,
        walletBalance_before: walletBalance_before,
        exchange_ethersBalance_before: exchange_ethersBalance_before_withoutFees,
        wallet_ethersBalance_before: wallet_ethersBalance_before,
        expectedEthersToPay: expectedEthersToPay,
        gasSpent: gasSpent,
        feesCollectedAfterTx: feesCollectedAfterTx,
    };
};

const buyTokensCall = async ({ tokenEthereumContract, exchangeContract, wallet }, tokenAmountToBuy, ethersToSendSwapForTokens) => {
    const provider = ethers.provider;

    // 2. Calculate `tokenVault` token balance BEFORE buyEthers()
    const tokenVaultTokenBalance_before = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);

    // 3. Calculate `wallet` token balance BEFORE buyEthers()
    const walletBalance_before = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);

    // 4. Calculate fees collected BEFORE buyEthers()
    const feesCollected_beforeTx = await exchangeContract.connect(provider).feesCollected();

    // 5. Calculate exchange ethers balance before Tx
    const exchange_ethersBalance_before_withoutFees = (await provider.getBalance(exchangeContract.address)).sub(feesCollected_beforeTx);

    // 6. Calculate equivalence [ethers - tokens] balance ecuation
    const invariant = await exchangeContract.connect(provider).invariant();

    // 7. Substract `tokenAmountToBuy` tokens from `tokenVault` token balance
    const stakedTokensAtInitofBuyEthersTx = tokenVaultTokenBalance_before.sub(tokenAmountToBuy);

    // invariant (i) / staked_tokens (t)
    const invariantDividedByStakedTokens = invariant.mul(ONE_ETHER).div(stakedTokensAtInitofBuyEthersTx);

    // exchange ethers balance without fees (e)
    // ethers set on transaction (e_tx)
    // 8. Ether balance (eb_f)
    // Token cost in ethers: [ (i/t) - (eb_f) ]
    const tokenCostInEther_withoutFees = invariantDividedByStakedTokens.sub(exchange_ethersBalance_before_withoutFees);

    // 7. Calculate `wallet` ethers balance BEFORE buyEthers()
    const wallet_ethersBalance_before = await provider.getBalance(wallet.address);

    // 8. Call exchange buyEther() method
    const tx = { value: ethersToSendSwapForTokens };
    const tx_buyToken = await exchangeContract.buyToken(tokenAmountToBuy, tx);

    // 9. Calculate SPENT GAS
    const gasSpent = await calculateSpentGas(tx_buyToken);

    // 10. Calculate fees collected
    const feesCollected_after = await exchangeContract.connect(provider).feesCollected();

    return {
        tokenVaultTokenBalance_before,
        walletBalance_before,
        exchange_ethersBalance_before_withoutFees,
        wallet_ethersBalance_before,
        tokenCostInEther_withoutFees,
        gasSpent,
        feesCollected_after,
    };
};

describe(contracts.EXCHANGE, async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', contracts.EXCHANGE, 'Contract Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [wallet, walletTo, tokenVault, noBalanceWallet] = await ethers.getSigners();
        provider = ethers.provider;

        dummyContract = await deployMockContract(wallet, getContractAbi(contracts.TOKEN_ETHEREUM));

        exchageDefault = {
            tokenVault,
            erc20Contract: ZERO_ADDRESS,
            tokenAmount: ethers.utils.parseEther('50'),
        };
    });

    let exchangeContract, tokenEthereumContract;

    describe('constructor()', async () => {
        describe('Ok scenarios', async () => {
            before(async () => {
                const ethersToSendToExchange = ethers.utils.parseEther('5');
                const tokensToInitExchange = ethers.utils.parseEther('50');
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });

            it('Exchange `decimals` should be: 18', async () => {
                const tokenDecimal = await exchangeContract.decimals();
                expect(tokenDecimal).to.be.equal(18);
            });

            const FEE_PERCENTAGE = 3 * 10 ** 15;
            it(`Exchange 'feePercentage' should be: 0,3% => ${FEE_PERCENTAGE}`, async () => {
                const feePercentage = await exchangeContract.feePercentage();
                expect(feePercentage).to.be.equal(FEE_PERCENTAGE);
            });

            it('Exchange `owner` should be: `msg.signer`', async () => {
                const owner = await exchangeContract.owner();
                expect(owner).to.be.equal(wallet.address);
            });

            it('Exchange `tokenVault` should be: `_tokenVault`', async () => {
                expect(await exchangeContract.tokenVault()).to.be.equal(tokenVault.address);
            });

            it('Exchange `erc20Contract` should be: `_erc20Contract`', async () => {
                expect(await exchangeContract.erc20Contract()).to.be.equal(tokenEthereumContract.address);
            });

            it('Exchange `invatiant` should be: `500` - Same amount of TOKENS & ETHERS sent', async () => {
                const invariant = await exchangeContract.invariant();
                const tokensStaked = ethers.utils.parseEther('100'); // vault balance token
                const exchangeEthersBalance = ethers.utils.parseEther('5');
                const expectedInvariant = tokensStaked.mul(exchangeEthersBalance);
                const expectedInvariantWithFixedDecimals = expectedInvariant.div(ONE_ETHER);
                expect(invariant).to.be.equal(expectedInvariantWithFixedDecimals);
            });

            it('TokenVault should have `_tokenAmount` tokens in his balance', async () => {
                const tokenVaultTokenBalance = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                const tokensStaked = ethers.utils.parseEther('100');
                expect(parseInt(tokenVaultTokenBalance)).to.be.equal(parseInt(tokensStaked));
            });

            it('Contract deployer `wallet` should have `totalSupply` minus `_tokenAmount` tokens in his balance', async () => {
                const walletBalance = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);
                const tokensStaked = ethers.utils.parseEther('100');
                const expectedWalletBalance = constants.defaultTokenEthereum.maxSupply.sub(tokensStaked);
                expect(parseInt(walletBalance)).to.be.equal(parseInt(expectedWalletBalance));
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_tokenAmount` is zero amount', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [ZERO_ADDRESS, ZERO_ADDRESS, 0])).to.be.revertedWith('Invalid _tokenAmount value');
            });
            it('Throw if `_tokenVault` is zero address', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [ZERO_ADDRESS, ZERO_ADDRESS, exchageDefault.tokenAmount])).to.be.revertedWith(
                    'Invalid address _tokenVault'
                );
            });
            it('Throw if `_tokenVault` is zero address', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [tokenVault.address, ZERO_ADDRESS, exchageDefault.tokenAmount])).to.be.revertedWith(
                    '_erc20Contract cannot be zero address'
                );
            });
            it('Throw if no ethers were deposited', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [tokenVault.address, tokenEthereumContract.address, 1])).to.be.revertedWith('No ethers deposited');
            });
            it('Throw if `_tokenVault` is not an external owned account (EOA)', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [dummyContract.address, wallet.address, exchageDefault.tokenAmount], { value: 1 })).to.be.revertedWith(
                    '_tokenVault cannot be a contract'
                );
            });
            it('Throw if `_erc20Contract` is not an internal owned account (IOA)', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [tokenVault.address, wallet.address, exchageDefault.tokenAmount], { value: 1 })).to.be.revertedWith(
                    '_erc20Contract is not a contract'
                );
            });

            before(async () => {
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
            });
            it('Throw if `_tokenVault` has a token balance less or equals than `_tokenAmount', async () => {
                await expect(deployContract(wallet, contracts.EXCHANGE, [tokenVault.address, tokenEthereumContract.address, 1], { value: 1 })).to.be.revertedWith(
                    'Insufficient tokens in the vault'
                );
            });
        });
    });

    describe('buyEthers()', async () => {
        const ethersToSendToExchange = ethers.utils.parseEther('5');
        const tokensToInitExchange = ethers.utils.parseEther('50');
        const initialInvatiantConstant = ethers.utils.parseEther('500');
        const tokenAmountToExchangeForEthers = ethers.utils.parseEther('7');

        describe('Ok scenarios - Transaction BuyEthers(): \n\t - buy 7 tokens of ethers \n\t - 0,3% as fee percentage', async () => {
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                // 1. Approve exchange to transfer ethers on `wallet` behalf TXs of a total of 14 tokens
                await tokenEthereumContract.approve(exchangeContract.address, tokenAmountToExchangeForEthers.mul(2));
            });

            let exchange_ethersBalance_before;
            let gasSpent;
            let walletBalance_before;
            let tokenVaultTokenBalance_before;

            let wallet_ethersBalance_before_tx_1, wallet_ethersBalance_before_tx_2;
            let wallet_ethersBalance_after_tx_1;
            let expectedEthersToPay_txn_1, expectedEthersToPay_txn_2;
            let feesCollectedAfterTx_1, feesCollectedAfterTx_2;

            describe('#1 TX - 0 as fees collected', async () => {
                it('Before buyEthers() - Should have collected 0 `feesCollected`', async () => {
                    const feesCollected = await exchangeContract.connect(provider).feesCollected();
                    const expectedFeesCollected = ethers.utils.parseEther('0');
                    expect(parseInt(feesCollected)).to.be.equal(parseInt(expectedFeesCollected));
                });

                it('Before buyEthers() - Should have initial `invariant`', async () => {
                    const invariant = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it('Before buyEthers() - `tokenVault` should have initial staked tokens', async () => {
                    const stakedTokens = tokensToInitExchange.mul(2);
                    const expectedStakedTokensBeforeTransaction = ethers.utils.parseEther('100');
                    expect(parseInt(stakedTokens)).to.be.equal(parseInt(expectedStakedTokensBeforeTransaction));
                });

                it('Before buyEthers() - Should have exchange ethers balance', async () => {
                    const exchange_ethersBalance_before = await provider.getBalance(exchangeContract.address);
                    expect(parseInt(exchange_ethersBalance_before)).to.be.equal(parseInt(ethersToSendToExchange));
                });

                it('Executing buyEthers() transaction with 7 tokens', async () => {
                    ({
                        tokenVaultTokenBalance_before,
                        walletBalance_before,
                        exchange_ethersBalance_before,
                        wallet_ethersBalance_before: wallet_ethersBalance_before_tx_1,
                        expectedEthersToPay: expectedEthersToPay_txn_1,
                        gasSpent,
                        feesCollectedAfterTx: feesCollectedAfterTx_1,
                    } = await buyEthersCall({ exchangeContract, tokenEthereumContract, wallet }, tokenAmountToExchangeForEthers));
                });

                it('Exchange contract should collect 0,3% ETH on fees', async () => {
                    const feePercentage = await exchangeContract.connect(provider).feePercentage();
                    const feesCollected_expected = expectedEthersToPay_txn_1.mul(feePercentage).div(ONE_ETHER);
                    expect(parseInt(feesCollectedAfterTx_1)).to.be.equal(parseInt(feesCollected_expected));
                });

                it(`Exchange ethereum balance should be decreased [- ETH]`, async () => {
                    // 1. Calculate `exchange` ethers balance AFTER buyEthers()
                    const exchange_ethersBalance_after = await provider.getBalance(exchangeContract.address);

                    // 2. `exchange` balance AFTER = `exchange` balance BEFORE - expectedEthersToPay_txn_1 - feesCollected
                    const expected_exchange_ethersBalance = exchange_ethersBalance_before.sub(expectedEthersToPay_txn_1).add(feesCollectedAfterTx_1);
                    expect(parseInt(exchange_ethersBalance_after)).to.be.equal(parseInt(expected_exchange_ethersBalance));
                });

                it('Exchange invariant balance should maintain equals as before buyEthers() transaction', async () => {
                    const invariant_after_operation = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant_after_operation)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it(`Wallet ether balance shoud be increased [+ ETH]`, async () => {
                    // 1. Calculate `wallet` ethers balance AFTER buyEthers()
                    wallet_ethersBalance_after_tx_1 = await provider.getBalance(wallet.address);

                    // 2. wallet balance EXPECTED = wallet balance BEFORE + expectedEthersToRetrieve - gasSpent - feesCollected
                    const expected_wallet_ethersBalance = wallet_ethersBalance_before_tx_1.add(expectedEthersToPay_txn_1).sub(gasSpent).sub(feesCollectedAfterTx_1);

                    expect(parseInt(wallet_ethersBalance_after_tx_1)).to.be.equal(parseInt(expected_wallet_ethersBalance));
                });

                it('Wallet token balance should be decreased by 7 tokens [- Tokens]', async () => {
                    const walletBalance_after = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);
                    const walletBalance_expected = walletBalance_before.sub(tokenAmountToExchangeForEthers);
                    expect(parseInt(walletBalance_after)).to.be.equal(parseInt(walletBalance_expected));
                });

                it('TokenVault token balance should be increased by 7 tokens [+ Tokens]', async () => {
                    const tokenVaultTokenBalance_after = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                    const tokenVaultTokenBalance_expected = tokenVaultTokenBalance_before.add(tokenAmountToExchangeForEthers);
                    expect(parseInt(tokenVaultTokenBalance_after)).to.be.equal(parseInt(tokenVaultTokenBalance_expected));
                });
            });

            describe('#2 TX - with fees collected', async () => {
                it('Before buyEthers() - Should have collected `feesCollected` greater than 0', async () => {
                    const feesCollected = await exchangeContract.connect(provider).feesCollected();
                    const feePercentage = await exchangeContract.connect(provider).feePercentage();
                    const expectedFeesCollected = expectedEthersToPay_txn_1.mul(feePercentage).div(ONE_ETHER);
                    expect(parseInt(feesCollected)).to.be.equal(parseInt(expectedFeesCollected));
                });

                it('Before buyEthers() - Should have initial `invariant`', async () => {
                    const invariant = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it('Before buyEthers() - `tokenVault` should have initial staked tokens', async () => {
                    const stakedTokens = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                    const expectedStakedTokensBeforeTransaction = ethers.utils.parseEther('107');
                    expect(parseInt(stakedTokens)).to.be.equal(parseInt(expectedStakedTokensBeforeTransaction));
                });

                it('Before buyEthers() - Should have exchange ethers balance', async () => {
                    const exchange_ethersBalance_before_txn_2 = (await provider.getBalance(exchangeContract.address)).sub(feesCollectedAfterTx_1);
                    const exchange_ethersBalance_expected = exchange_ethersBalance_before.sub(expectedEthersToPay_txn_1);
                    expect(parseInt(exchange_ethersBalance_before_txn_2)).to.be.equal(parseInt(exchange_ethersBalance_expected));
                });

                it('Executing buyEthers() transaction with 7 tokens', async () => {
                    ({
                        tokenVaultTokenBalance_before,
                        walletBalance_before,
                        exchange_ethersBalance_before,
                        wallet_ethersBalance_before: wallet_ethersBalance_before_tx_2,
                        expectedEthersToPay: expectedEthersToPay_txn_2,
                        gasSpent: gasSpent_tx_2,
                        feesCollectedAfterTx: feesCollectedAfterTx_2,
                    } = await buyEthersCall({ exchangeContract, tokenEthereumContract, wallet }, tokenAmountToExchangeForEthers));
                });

                it('Exchange contract should collect 0,3% ETH on fees', async () => {
                    const feePercentage = await exchangeContract.connect(provider).feePercentage();
                    const feesCollected_expected = expectedEthersToPay_txn_2.mul(feePercentage).div(ONE_ETHER).add(feesCollectedAfterTx_1);
                    expect(parseInt(feesCollectedAfterTx_2)).to.be.equal(parseInt(feesCollected_expected));
                });

                it(`Exchange ethereum balance should be decreased [- ETH]`, async () => {
                    // 1. Calculate `exchange` ethers balance AFTER buyEthers()
                    const exchange_ethersBalance_after = await provider.getBalance(exchangeContract.address);

                    // 2. `exchange` balance AFTER = `exchange` balance BEFORE - expectedEthersToPay_txn_2 - feesCollected
                    const expected_exchange_ethersBalance = exchange_ethersBalance_before.sub(expectedEthersToPay_txn_2).add(feesCollectedAfterTx_2);
                    expect(parseInt(exchange_ethersBalance_after)).to.be.equal(parseInt(expected_exchange_ethersBalance));
                });

                it('Exchange invariant balance should maintain equals as before buyEthers() transaction', async () => {
                    const invariant_after_operation = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant_after_operation)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it(`Wallet ether balance shoud be increased [+ ETH]`, async () => {
                    // 1. Calculate `wallet` ethers balance AFTER buyEthers()
                    const wallet_ethersBalance_after = await provider.getBalance(wallet.address);
                    expect(parseInt(wallet_ethersBalance_after_tx_1)).to.be.equal(parseInt(wallet_ethersBalance_before_tx_2));

                    // 2. wallet balance EXPECTED = wallet balance BEFORE + expectedEthersToPay_txn_2 - gasSpent_tx_2 - feesCollectedAfterTx_2 + feesCollectedAfterTx_1
                    const expected_wallet_ethersBalance = wallet_ethersBalance_before_tx_2
                        .add(expectedEthersToPay_txn_2)
                        .sub(gasSpent_tx_2)
                        .sub(feesCollectedAfterTx_2)
                        .add(feesCollectedAfterTx_1);
                    expect(parseInt(wallet_ethersBalance_after)).to.be.equal(parseInt(expected_wallet_ethersBalance));
                });

                it('Wallet token balance should be decreased by 7 tokens [- Tokens]', async () => {
                    const walletBalance_after = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);
                    const walletBalance_expected = walletBalance_before.sub(tokenAmountToExchangeForEthers);
                    expect(parseInt(walletBalance_after)).to.be.equal(parseInt(walletBalance_expected));
                });

                it('TokenVault token balance should be increased by 7 tokens [+ Tokens]', async () => {
                    const tokenVaultTokenBalance_after = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                    const tokenVaultTokenBalance_expected = tokenVaultTokenBalance_before.add(tokenAmountToExchangeForEthers);
                    expect(parseInt(tokenVaultTokenBalance_after)).to.be.equal(parseInt(tokenVaultTokenBalance_expected));
                });
            });
        });

        describe('Ok scenarios - Transaction BuyEthers(): \n\t - buy 7 tokens of ethers \n\t - 10% as fee percentage  \n\t - 0 as fees collected', async () => {
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                // 1. Approve exchange to transfer ethers on `wallet` behalf
                await tokenEthereumContract.approve(exchangeContract.address, tokenAmountToExchangeForEthers);

                // 2. Set percentage to 10%
                const percentage = ethers.utils.parseEther('10');
                await exchangeContract.setFeePercentage(percentage);
            });

            it('Before buyEthers() - Should have collected 0 `feesCollected`', async () => {
                const feesCollected = await exchangeContract.connect(provider).feesCollected();
                const expectedFeesCollected = ethers.utils.parseEther('0');
                expect(parseInt(feesCollected)).to.be.equal(parseInt(expectedFeesCollected));
            });

            it('Before buyEthers() - Should have initial `invariant`', async () => {
                const invariant = await exchangeContract.connect(provider).invariant();
                expect(parseInt(invariant)).to.be.equal(parseInt(initialInvatiantConstant));
            });

            it('Before buyEthers() - `tokenVault` should have initial staked tokens', async () => {
                const stakedTokens = await tokenEthereumContract.balanceOf(tokenVault.address);
                const expectedStakedTokensBeforeTransaction = ethers.utils.parseEther('100');
                expect(parseInt(stakedTokens)).to.be.equal(parseInt(expectedStakedTokensBeforeTransaction));
            });

            it('Before buyEthers() - Should have exchange ethers balance', async () => {
                const exchange_ethersBalance_before = await provider.getBalance(exchangeContract.address);
                expect(parseInt(exchange_ethersBalance_before)).to.be.equal(parseInt(ethersToSendToExchange));
            });

            let tokenVaultTokenBalance_before_tx_3;
            let walletBalance_before_tx_3;
            let exchange_ethersBalance_before_tx_3;
            let wallet_ethersBalance_before_tx_3;
            let expectedEthersToPay_tx_3;
            let gasSpent_tx_3;
            let feesCollectedAfterTx_tx_3;
            it('Executing buyEthers() transaction with 7 tokens', async () => {
                ({
                    tokenVaultTokenBalance_before: tokenVaultTokenBalance_before_tx_3,
                    walletBalance_before: walletBalance_before_tx_3,
                    exchange_ethersBalance_before: exchange_ethersBalance_before_tx_3,
                    wallet_ethersBalance_before: wallet_ethersBalance_before_tx_3,
                    expectedEthersToPay: expectedEthersToPay_tx_3,
                    gasSpent: gasSpent_tx_3,
                    feesCollectedAfterTx: feesCollectedAfterTx_tx_3,
                } = await buyEthersCall({ exchangeContract, tokenEthereumContract, wallet }, tokenAmountToExchangeForEthers));
            });

            it('Exchange contract should collect 10% ETH on fees', async () => {
                const feePercentage = await exchangeContract.connect(provider).feePercentage();
                const feesCollected_expected = expectedEthersToPay_tx_3.mul(feePercentage).div(ONE_ETHER);
                expect(parseInt(feesCollectedAfterTx_tx_3)).to.be.equal(parseInt(feesCollected_expected));
            });

            it(`Exchange ethereum balance should be decreased [- ETH]`, async () => {
                // 1. Calculate `exchange` ethers balance AFTER buyEthers()
                const exchange_ethersBalance_after = await provider.getBalance(exchangeContract.address);

                // 2. `exchange` balance AFTER = `exchange` balance BEFORE - expectedEthersToPay - feesCollected
                const expected_exchange_ethersBalance = exchange_ethersBalance_before_tx_3.sub(expectedEthersToPay_tx_3).add(feesCollectedAfterTx_tx_3);
                expect(parseInt(exchange_ethersBalance_after)).to.be.equal(parseInt(expected_exchange_ethersBalance));
            });

            it('Exchange invariant balance should maintain equals as before buyEthers() transaction', async () => {
                const invariant_after_operation = await exchangeContract.connect(provider).invariant();
                expect(parseInt(invariant_after_operation)).to.be.equal(parseInt(initialInvatiantConstant));
            });

            it(`Wallet ether balance shoud be increased [+ ETH]`, async () => {
                // 1. Calculate `wallet` ethers balance AFTER buyEthers()
                const wallet_ethersBalance_after = await provider.getBalance(wallet.address);

                // 2. wallet balance EXPECTED = wallet balance BEFORE + expectedEthersToRetrieve - gasSpent - feesCollected
                const expected_wallet_ethersBalance = wallet_ethersBalance_before_tx_3.add(expectedEthersToPay_tx_3).sub(gasSpent_tx_3).sub(feesCollectedAfterTx_tx_3);

                expect(parseInt(wallet_ethersBalance_after)).to.be.equal(parseInt(expected_wallet_ethersBalance));
            });

            it('Wallet token balance should be decreased by 7 tokens [- Tokens]', async () => {
                const walletBalance_after = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);
                const walletBalance_expected = walletBalance_before_tx_3.sub(tokenAmountToExchangeForEthers);
                expect(parseInt(walletBalance_after)).to.be.equal(parseInt(walletBalance_expected));
            });

            it('TokenVault token balance should be increased by 7 tokens [+ Tokens]', async () => {
                const tokenVaultTokenBalance_after = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                const tokenVaultTokenBalance_expected = tokenVaultTokenBalance_before_tx_3.add(tokenAmountToExchangeForEthers);
                expect(parseInt(tokenVaultTokenBalance_after)).to.be.equal(parseInt(tokenVaultTokenBalance_expected));
            });
        });

        describe('Reverted transactions', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');
            const tokenAmountToExchangeForEthers = ethers.utils.parseEther('9999999999999999999999999999999999');

            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `_amountToBuy` is zero amount', async () => {
                await expect(exchangeContract.buyEther(0)).to.be.revertedWith('Invalid _amountToExchange value');
            });

            // TODO: Check if this is possible
            // it('Throw if `exchange` ethers balance without fees is less than needed to pay user', async () => {
            //     await expect(exchangeContract.buyEther(tokenAmountToExchangeForEthers)).to.be.revertedWith('Insufficient balance');
            // });
        });
    });

    describe('setFeePercentage()', async () => {
        describe('Ok scenarios', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');

            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });

            it('Should set correct percentage', async () => {
                const percentage = ethers.utils.parseEther('10');
                await exchangeContract.setFeePercentage(percentage);
                const feePercentage = await exchangeContract.feePercentage();
                expect(parseInt(feePercentage)).to.be.equal(parseInt(percentage.div(100)));
            });
        });
        describe('Reverted transactions', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');
            const newFeePercentage = ethers.utils.parseEther('100.001');

            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `_percentage` is zero amount', async () => {
                await expect(exchangeContract.setFeePercentage(0)).to.be.revertedWith('Invalid _percentage value');
            });
            it('Throw if `msg.sender` is not the protocol owner', async () => {
                await expect(exchangeContract.connect(walletTo).setFeePercentage(newFeePercentage)).to.be.revertedWith('Not autorized');
            });
            it('Throw if `_percentage` is out of range', async () => {
                await expect(exchangeContract.setFeePercentage(newFeePercentage)).to.be.revertedWith('Invalid _percentage value. Must be value between 0% - 100%');
            });
        });
    });

    describe('buyToken()', async () => {
        const initialEthersToSendToExchange = ethers.utils.parseEther('5');
        const initialTokensToInitVaultInExchange = ethers.utils.parseEther('50');
        const initialInvatiantConstant = ethers.utils.parseEther('500');

        const ethersToSendSwapForTokens = ethers.utils.parseEther('2');
        const tokenAmountToBuy = ethers.utils.parseEther('7');

        describe('Ok scenarios - Transaction buyToken(): \n\t - buy 7 tokens of ethers \n\t - 0,3% as fee percentage', async () => {
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, initialEthersToSendToExchange, initialTokensToInitVaultInExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                // 1. Approve exchange to transfer ethers on `wallet` behalf TXs of a total of 14 tokens
                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, tokenAmountToBuy);
            });

            let tokenVaultTokenBalance_before,
                walletBalance_before,
                exchange_ethersBalance_before_withoutFees,
                wallet_ethersBalance_before,
                tokenCostInEther_withoutFees,
                gasSpent,
                feesCollected_after;

            describe('#1 TX - 0 as fees collected', async () => {
                it('Before buyEthers() - Should have collected 0 `feesCollected`', async () => {
                    const feesCollected = await exchangeContract.connect(provider).feesCollected();
                    const expectedFeesCollected = ethers.utils.parseEther('0');
                    expect(parseInt(feesCollected)).to.be.equal(parseInt(expectedFeesCollected));
                });

                it('Before buyEthers() - Should have initial `invariant`', async () => {
                    const invariant = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it('Before buyEthers() - `tokenVault` should have initial staked tokens', async () => {
                    const stakedTokens = initialTokensToInitVaultInExchange.mul(2);
                    const expectedStakedTokensBeforeTransaction = ethers.utils.parseEther('100');
                    expect(parseInt(stakedTokens)).to.be.equal(parseInt(expectedStakedTokensBeforeTransaction));
                });

                it('Before buyEthers() - Should have exchange ethers balance', async () => {
                    const exchange_ethersBalance_before = await provider.getBalance(exchangeContract.address);
                    expect(parseInt(exchange_ethersBalance_before)).to.be.equal(parseInt(initialEthersToSendToExchange));
                });

                it('Executing buyEthers() transaction with 7 tokens', async () => {
                    ({
                        tokenVaultTokenBalance_before,
                        walletBalance_before,
                        exchange_ethersBalance_before_withoutFees,
                        wallet_ethersBalance_before,
                        tokenCostInEther_withoutFees,
                        gasSpent,
                        feesCollected_after,
                    } = await buyTokensCall({ tokenEthereumContract, exchangeContract, wallet }, tokenAmountToBuy, ethersToSendSwapForTokens));
                });

                it('Exchange contract should collect 0,3% ETH on fees', async () => {
                    const feePercentage = await exchangeContract.connect(provider).feePercentage();
                    const feesCollected_expected = tokenCostInEther_withoutFees.mul(feePercentage).div(ONE_ETHER);
                    expect(parseInt(feesCollected_after)).to.be.equal(parseInt(feesCollected_expected));
                });

                it('Exchange invariant balance should maintain equals as before buyEthers() transaction', async () => {
                    const invariant_after_operation = await exchangeContract.connect(provider).invariant();
                    expect(parseInt(invariant_after_operation)).to.be.equal(parseInt(initialInvatiantConstant));
                });

                it(`Exchange ethereum balance should be increased [+ ETH]`, async () => {
                    // 1. Calculate `exchange` ethers balance AFTER buyEthers()
                    const exchange_ethersBalance_after = await provider.getBalance(exchangeContract.address);
                    const expected_exchange_ethersBalance = exchange_ethersBalance_before_withoutFees.add(tokenCostInEther_withoutFees).add(feesCollected_after);
                    expect(parseInt(exchange_ethersBalance_after)).to.be.equal(parseInt(expected_exchange_ethersBalance));
                });

                it(`Wallet ether balance shoud be decreased [- ETH]`, async () => {
                    // 1. Calculate `wallet` ethers balance AFTER buyEthers()
                    const wallet_ethersBalance_after = await provider.getBalance(wallet.address);

                    // 2. wallet balance EXPECTED = wallet balance BEFORE + expectedEthersToRetrieve - gasSpent - feesCollected
                    const expected_wallet_ethersBalance = wallet_ethersBalance_before.sub(tokenCostInEther_withoutFees).sub(gasSpent).sub(feesCollected_after);

                    expect(parseInt(wallet_ethersBalance_after)).to.be.equal(parseInt(expected_wallet_ethersBalance));
                });

                it('Wallet token balance should be increased by 7 tokens [+ Tokens]', async () => {
                    const walletBalance_after = await tokenEthereumContract.connect(provider).balanceOf(wallet.address);
                    const walletBalance_expected = walletBalance_before.add(tokenAmountToBuy);
                    expect(parseInt(walletBalance_after)).to.be.equal(parseInt(walletBalance_expected));
                });

                it('TokenVault token balance should be decreased by 7 tokens [- Tokens]', async () => {
                    const tokenVaultTokenBalance_after = await tokenEthereumContract.connect(provider).balanceOf(tokenVault.address);
                    const tokenVaultTokenBalance_expected = tokenVaultTokenBalance_before.sub(tokenAmountToBuy);
                    expect(parseInt(tokenVaultTokenBalance_after)).to.be.equal(parseInt(tokenVaultTokenBalance_expected));
                });
            });
        });

        describe('Ok scenarios - Transaction buyToken(): \n\t - buy tokens using getexchangeRate() \n\t - 0,3% as fee percentage', async () => {
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, initialEthersToSendToExchange, initialTokensToInitVaultInExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });

            it('Executing buyEthers() transaction with 7 tokens', async () => {
                // 2. Calculate exchange rate
                const tokensToBuy = await exchangeContract.getExchangeRate();
                const ethersToSend = ethers.utils.parseEther('1');

                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, 0);
                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, tokensToBuy);
                ({
                    tokenVaultTokenBalance_before,
                    walletBalance_before,
                    exchange_ethersBalance_before_withoutFees,
                    wallet_ethersBalance_before,
                    tokenCostInEther_withoutFees,
                    gasSpent,
                    feesCollected_after,
                } = await buyTokensCall({ tokenEthereumContract, exchangeContract, wallet }, tokensToBuy, ethersToSend));
            });
        });
        describe('Reverted transactions', async () => {
            const initialEthersToSendToExchange = ethers.utils.parseEther('5');
            const initialTokensToInitVaultInExchange = ethers.utils.parseEther('50');
            const tokenAmountToBuy = ethers.utils.parseEther('9999999999999999999999999');
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, initialEthersToSendToExchange, initialTokensToInitVaultInExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `_amountToBuy` is zero amount', async () => {
                await expect(exchangeContract.buyToken(0)).to.be.revertedWith('Invalid _amountToBuy value');
            });
            // TODO: check if this is possible to test
            // it('Throw if `msg.value` is less than the amount needed to swap for tokens + fees', async () => {
            //     await expect(exchangeContract.buyToken(tokenAmountToBuy)).to.be.revertedWith('Insufficient ethers');
            // });
        });
    });

    describe('deposit()', async () => {
        describe('Ok scenarios', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');

            let invariant_before, exchangeBalance_before, tokenVaultBalance_before, tokensToApprove, walletTokenBalance_before;

            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                invariant_before = await exchangeContract.invariant();
                exchangeBalance_before = await provider.getBalance(exchangeContract.address);
                exchangeBalance_expected = exchangeBalance_before.add(ethersToSendToExchange);
                tokenVaultBalance_before = await tokenEthereumContract.balanceOf(tokenVault.address);

                tokensToApprove = tokenVaultBalance_before.sub(invariant_before.mul(ONE_ETHER).div(exchangeBalance_expected));

                walletTokenBalance_before = await tokenEthereumContract.balanceOf(wallet.address);

                await tokenEthereumContract.approve(exchangeContract.address, tokensToApprove);

                const tx = { value: ethersToSendToExchange };
                await exchangeContract.deposit(tx);
            });
            it('Should increase exchange ether balance [+ ETH]', async () => {
                const exchangeBalance_after = await provider.getBalance(exchangeContract.address);
                expect(parseInt(exchangeBalance_after)).to.be.equal(parseInt(exchangeBalance_expected));
            });
            it('Should increase tokenVault token balance [+ Token]', async () => {
                const tokenVaultBalance_after = await tokenEthereumContract.balanceOf(tokenVault.address);
                const tokenVaultBalance_expected = tokenVaultBalance_before.add(tokensToApprove);
                expect(parseInt(tokenVaultBalance_after)).to.be.equal(parseInt(tokenVaultBalance_expected));
            });
            it('Should decrease `owner` tokenVault token balance [- Token]', async () => {
                const walletTokenBalance_after = await tokenEthereumContract.balanceOf(wallet.address);
                const walletTokenBalance_expected = walletTokenBalance_before.sub(tokensToApprove);
                expect(parseInt(walletTokenBalance_after)).to.be.equal(parseInt(walletTokenBalance_expected));
            });
            it('Should update invariant state variable', async () => {
                const invariant_after = await exchangeContract.invariant();
                expect(parseInt(invariant_after)).to.be.not.equal(parseInt(invariant_before));
            });
        });
        describe('Reverted transactions', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');
            beforeEach(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `msg.sender` is not the protocol owner', async () => {
                await expect(exchangeContract.connect(walletTo).deposit()).to.be.revertedWith('Not autorized');
            });
            it('Throw if no ethers were deposited', async () => {
                await expect(exchangeContract.deposit()).to.be.revertedWith('No ethers deposited');
            });
            beforeEach(async () => {
                const response = await initExchangeContract(noBalanceWallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                tokenEthereumContract.transfer(wallet.address, ethers.utils.parseEther('999900'));
            });
            it("Throw if sender's balance do not have sufficient token amount", async () => {
                const tx = { value: ethersToSendToExchange };
                console.log('noBalanceWallet', await tokenEthereumContract.balanceOf(noBalanceWallet.address));
                await expect(exchangeContract.deposit(tx)).to.be.revertedWith('Insufficient balance');
            });
        });
    });

    describe('setTokenVault()', async () => {
        describe('Ok scenarios', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');

            let invariant_before;

            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                // 1. Transfer some tokens to new vault address
                await tokenEthereumContract.transfer(walletTo.address, ethers.utils.parseEther('500'));

                invariant_before = await exchangeContract.invariant();

                // 2. Approve token usage by exchange
                await tokenEthereumContract.connect(walletTo).approve(exchangeContract.address, ethers.utils.parseEther('500'));
                await exchangeContract.setTokenVault(walletTo.address);
            });
            it('Should change tokenVault address', async () => {
                const newtokenVault = await exchangeContract.tokenVault();
                expect(newtokenVault).to.be.equal(walletTo.address);
            });
            it('Should update invariant state variable', async () => {
                const invariant_after = await exchangeContract.invariant();
                expect(parseInt(invariant_after)).to.be.not.equal(parseInt(invariant_before));
            });
        });
        describe('Reverted transactions', async () => {
            const ethersToSendToExchange = ethers.utils.parseEther('5');
            const tokensToInitExchange = ethers.utils.parseEther('50');
            before(async () => {
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `_tokenVault` is zero address', async () => {
                await expect(exchangeContract.setTokenVault(ZERO_ADDRESS)).to.be.revertedWith('Invalid address _tokenVault');
            });
            it('Throw if `msg.sender` is not the protocol owner', async () => {
                await expect(exchangeContract.connect(walletTo).setTokenVault(walletTo.address)).to.be.revertedWith('Not autorized');
            });
            it('Throw if `_tokenVault` is not an external owned account (EOA)', async () => {
                await expect(exchangeContract.setTokenVault(tokenEthereumContract.address)).to.be.revertedWith('_tokenVault cannot be a contract');
            });
            it('Throw if `_tokenVault` did not approve that exchange be able to spend its tokens', async () => {
                await expect(exchangeContract.setTokenVault(wallet.address)).to.be.revertedWith('Invalid tokenVault address');
            });
        });
    });

    describe('calculateEtherAmount()', async () => {
        describe('Ok scenarios', async () => {
            let tokensPerOneEther;
            before(async () => {
                const ethersToSendToExchange = ethers.utils.parseEther('5');
                const tokensToInitExchange = ethers.utils.parseEther('50');
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                tokensPerOneEther = await exchangeContract.getExchangeRate();
            });
            it('Should return the amount of ethers needed to swap `_tokenAmount` amount of tokens', async () => {
                const invariant = await exchangeContract.invariant();
                const tokenVaultTokenBalance = await tokenEthereumContract.balanceOf(tokenVault.address);
                const stakedTokens = tokenVaultTokenBalance.sub(tokensPerOneEther);
                const exchangeBalance = await provider.getBalance(exchangeContract.address);
                const feesCollected = await exchangeContract.feesCollected();
                const exchangeBalanceWithoutFees = exchangeBalance.sub(feesCollected);

                const expectedEtherAmount = invariant.mul(ONE_ETHER).div(stakedTokens).sub(exchangeBalanceWithoutFees);

                expect(parseInt(await exchangeContract.calculateEtherAmount(tokensPerOneEther))).to.be.equal(parseInt(expectedEtherAmount));
            });
            it('Invariant should be `500`', async () => {
                const invariant = await exchangeContract.invariant();
                expect(parseInt(invariant)).to.be.equal(parseInt(ethers.utils.parseEther('500')));
            });
        });
        describe('Reverted transactions', async () => {
            before(async () => {
                const ethersToSendToExchange = ethers.utils.parseEther('5');
                const tokensToInitExchange = ethers.utils.parseEther('50');
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `_tokenAmount` is zero amount', async () => {
                await expect(exchangeContract.calculateEtherAmount(0)).to.be.revertedWith('Invalid _tokenAmount value');
            });
        });
    });

    describe('withdrawFeesAmount()', async () => {
        describe('Ok scenarios', async () => {
            let gasSpent_tx_1, gasSpent_tx_2, gasSpent_tx_3, gasSpent_tx_4, exchangeBalance_before, feesCollected_after_tx_4;
            before(async () => {
                const ethersToSendToExchange = ethers.utils.parseEther('5');
                const tokensToInitExchange = ethers.utils.parseEther('50');
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;

                // 1. Set a high percentage to collect lot of fees
                const percentage = ethers.utils.parseEther('25');
                await exchangeContract.setFeePercentage(percentage);

                const oneEther = ethers.utils.parseEther('1');
                let tokensPerOneEther;

                exchangeBalance_before = await provider.getBalance(exchangeContract.address);

                // 2. Approve exchange to transfer ethers on `vault` behalf
                tokensPerOneEther = await exchangeContract.connect(provider).getExchangeRate();
                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, tokensPerOneEther);
                ({ gasSpent: gasSpent_tx_1 } = await buyTokensCall({ tokenEthereumContract, exchangeContract, wallet }, tokensPerOneEther, oneEther));

                // 3. Approve exchange to transfer ethers on `vault` behalf
                tokensPerOneEther = await exchangeContract.connect(provider).getExchangeRate();
                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, tokensPerOneEther);
                ({ gasSpent: gasSpent_tx_2 } = await buyTokensCall({ tokenEthereumContract, exchangeContract, wallet }, tokensPerOneEther, oneEther));

                // 4. Approve exchange to transfer ethers on `vault` behalf
                tokensPerOneEther = await exchangeContract.connect(provider).getExchangeRate();
                await tokenEthereumContract.connect(tokenVault).approve(exchangeContract.address, tokensPerOneEther);
                ({ gasSpent: gasSpent_tx_3 } = await buyTokensCall({ tokenEthereumContract, exchangeContract, wallet }, tokensPerOneEther, oneEther));

                const withdrawFeesAmount_tx = await exchangeContract.withdrawFeesAmount();
                gasSpent_tx_4 = await calculateSpentGas(withdrawFeesAmount_tx);
            });
            it('Should set `feesCollected to 0`', async () => {
                const feesCollected = await exchangeContract.connect(provider).feesCollected();
                expect(parseInt(feesCollected)).to.be.equal(ethers.utils.parseEther('0'));
            });
        });
        describe('Reverted transactions', async () => {
            before(async () => {
                const ethersToSendToExchange = ethers.utils.parseEther('5');
                const tokensToInitExchange = ethers.utils.parseEther('50');
                const response = await initExchangeContract(wallet, tokenVault, ethersToSendToExchange, tokensToInitExchange);
                tokenEthereumContract = response.tokenEthereumContract;
                exchangeContract = response.exchangeContract;
            });
            it('Throw if `msg.sender` is not the protocol owner', async () => {
                await expect(exchangeContract.connect(walletTo).withdrawFeesAmount()).to.be.revertedWith('Not autorized');
            });
            it('Throw if `feesCollected` is less or equals than 0.5 ETH', async () => {
                await expect(exchangeContract.withdrawFeesAmount()).to.be.revertedWith('Insufficient amount of fees');
            });
        });
    });
});
