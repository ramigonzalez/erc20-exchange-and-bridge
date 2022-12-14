const { ethers } = require('hardhat');

const chai = require('chai');
const { solidity } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;

const { ZERO_ADDRESS, deployContract } = require('./utils');
const constants = require('./utils/constants');

const TOKEN_ETHEREUM_CONTRACT_NAME = constants.contracts.TOKEN_ETHEREUM;

const tokenDetails = constants.defaultTokenEthereum;

let wallet, walletTo, allowedWallet, david;

describe(TOKEN_ETHEREUM_CONTRACT_NAME, async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', TOKEN_ETHEREUM_CONTRACT_NAME, 'Contract Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [wallet, walletTo, allowedWallet, david] = await ethers.getSigners();
        provider = ethers.provider;
    });

    let tokenEthereumContract;

    describe('constructor()', async () => {
        describe('Ok scenarios', async () => {
            before(async () => {
                tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
            });

            it(`Token name should be: "${tokenDetails.name}"`, async () => {
                const tokenName = await tokenEthereumContract.name();
                expect(tokenName).to.equal(tokenDetails.name);
            });

            it(`Token symbol should be: "${tokenDetails.symbol}"`, async () => {
                const tokenSymbol = await tokenEthereumContract.symbol();
                expect(tokenSymbol).to.equal(tokenDetails.symbol);
            });

            it(`Token decimals should be: ${tokenDetails.decimals}`, async () => {
                const tokenDecimal = await tokenEthereumContract.decimals();
                expect(tokenDecimal).to.equal(tokenDetails.decimals);
            });

            it(`Token total supply should be: ${tokenDetails.maxSupply}`, async () => {
                const tokenTotalSupply = await tokenEthereumContract.totalSupply();
                expect(parseInt(tokenTotalSupply)).to.equal(parseInt(tokenDetails.maxSupply));
            });

            it(`Signer balance should be: ${tokenDetails.maxSupply}`, async () => {
                const walletBalance = await tokenEthereumContract.balanceOf(wallet.address);
                expect(parseInt(walletBalance)).to.equal(parseInt(tokenDetails.maxSupply));
            });

            it('Should emit Transfer event with proper parameters', async () => {
                const eventName = 'Transfer';

                const eventArguments = {
                    _from: ZERO_ADDRESS,
                    _to: wallet.address,
                    _value: tokenDetails.maxSupply,
                };

                const tx = await tokenEthereumContract.deployTransaction.wait();
                const events = tx.events;
                const event = events.filter((e) => e.event === eventName)[0];

                const eventArgs = event ? event.args : [];

                const [transferFrom, transferTo, transferValue] = eventArgs;

                expect(event).to.be.not.null;
                expect(eventArgs).to.be.not.empty;
                expect(eventArgs.length).to.be.equal(3);
                expect(transferFrom).to.be.equal(eventArguments._from);
                expect(transferTo).to.be.equal(eventArguments._to);
                expect(transferValue).to.be.equal(eventArguments._value);
            });
        });

        describe('Reverted transactions', async () => {
            it('Should revert if `_name` is empty', async () => {
                await expect(deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, ['', tokenDetails.symbol, tokenDetails.maxSupply])).to.be.revertedWith(
                    'Invalid parameter: _name'
                );
            });

            it('Should revert if `_symbol` is empty', async () => {
                await expect(deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, '', tokenDetails.maxSupply])).to.be.revertedWith(
                    'Invalid parameter: _symbol'
                );
            });
        });
    });

    describe('transfer()', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
            });

            it('Should transfer requested amount and modify both balances', async () => {
                await expect(() => tokenEthereumContract.transfer(walletTo.address, 200)).to.changeTokenBalances(tokenEthereumContract, [wallet, walletTo], [-200, 200]);
            });

            it('Should execute zero amount transfer with as normal transfer', async () => {
                await expect(() => tokenEthereumContract.transfer(walletTo.address, 0)).to.changeTokenBalances(tokenEthereumContract, [wallet, walletTo], [-0, 0]);
            });

            it('Normal transaction should emit Transfer event with proper parameters', async () => {
                await expect(tokenEthereumContract.transfer(walletTo.address, 100)).to.emit(tokenEthereumContract, 'Transfer').withArgs(wallet.address, walletTo.address, 100);
            });

            it('0 token Transaction Should emit Transfer event with proper parameters', async () => {
                await expect(tokenEthereumContract.transfer(walletTo.address, 0)).to.emit(tokenEthereumContract, 'Transfer').withArgs(wallet.address, walletTo.address, 0);
            });
        });

        describe('Reverted transactions', async () => {
            beforeEach(async () => {
                tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
            });

            it('Should revert if `_to` is zero address', async () => {
                await expect(tokenEthereumContract.transfer(ZERO_ADDRESS, 100)).to.be.revertedWith('_to cannot be zero address');
            });

            it('Should revert `_to` is sender account', async () => {
                await expect(tokenEthereumContract.transfer(wallet.address, 100)).to.be.revertedWith('Invalid recipient, same as remittent');
            });

            it('Should revert if remittent account has insufficient balance', async () => {
                // Change msg.sender
                const tokenEthereumContract_signedWith_NoBalanceAddress = tokenEthereumContract.connect(walletTo);
                await expect(tokenEthereumContract_signedWith_NoBalanceAddress.transfer(wallet.address, 100)).to.be.revertedWith('Insufficient balance');
            });
        });
    });

    describe('transferFrom()', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
            });

            it('Should transfer tokens on `_from` behalf', async () => {
                await tokenEthereumContract.approve(allowedWallet.address, 100);
                const tokenEthereumContract_signedWith_allowedAddress = tokenEthereumContract.connect(allowedWallet);
                const amountToTransfer = 10;
                await expect(() => tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer)).to.changeTokenBalances(
                    tokenEthereumContract,
                    [wallet, walletTo],
                    [-amountToTransfer, amountToTransfer]
                );
            });

            it('Should substract `msg.signer` allowed token amount after transfer', async () => {
                const approveValue = 100;
                const amountToTransfer = 10;

                await tokenEthereumContract.approve(allowedWallet.address, approveValue);

                const tokenEthereumContract_signedWith_allowedAddress = tokenEthereumContract.connect(allowedWallet);
                await tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer);

                const allowance = await tokenEthereumContract.allowance(wallet.address, allowedWallet.address);

                expect(allowance).to.equal(approveValue - amountToTransfer);
            });

            it('Should execute zero amount transfer with as normal transfer', async () => {
                await expect(() => tokenEthereumContract.transferFrom(wallet.address, walletTo.address, 0)).to.changeTokenBalances(
                    tokenEthereumContract,
                    [wallet, walletTo],
                    [-0, 0]
                );
            });

            it('Normal transaction should emit Transfer event with proper parameters', async () => {
                await tokenEthereumContract.approve(allowedWallet.address, 100);
                const tokenEthereumContract_signedWith_allowedAddress = tokenEthereumContract.connect(allowedWallet);
                const amountToTransfer = 10;

                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer))
                    .to.emit(tokenEthereumContract_signedWith_allowedAddress, 'Transfer')
                    .withArgs(wallet.address, walletTo.address, amountToTransfer);
            });

            it('0 token Transaction Should emit Transfer event with proper parameters', async () => {
                await expect(tokenEthereumContract.transferFrom(wallet.address, walletTo.address, 0))
                    .to.emit(tokenEthereumContract, 'Transfer')
                    .withArgs(wallet.address, walletTo.address, 0);
            });

            it('Try transferFrom with signer (`msg.sender`) being same as `_from`', async () => {
                const amountToTransfer = 100;
                await expect(() => tokenEthereumContract.transferFrom(wallet.address, walletTo.address, amountToTransfer)).to.changeTokenBalances(
                    tokenEthereumContract,
                    [wallet, walletTo],
                    [-amountToTransfer, amountToTransfer]
                );
            });
        });

        describe('Reverted transactions', async () => {
            beforeEach(async () => {
                tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
            });

            it('Throw if `_from` is zero address', async () => {
                await expect(tokenEthereumContract.transferFrom(ZERO_ADDRESS, wallet.address, 100)).to.be.revertedWith('_from cannot be zero address');
            });

            it('Throw if `_to` is zero address', async () => {
                await expect(tokenEthereumContract.transferFrom(wallet.address, ZERO_ADDRESS, 100)).to.be.revertedWith('_to cannot be zero address');
            });

            it('Throw if `_to` is the same as `_from` account', async () => {
                await expect(tokenEthereumContract.transferFrom(wallet.address, wallet.address, 100)).to.be.revertedWith('Invalid recipient, same as remittent');
            });

            it('Throw if `_from` account has insufficient balance', async () => {
                // 1. connect allowedWallet to the contract
                const tokenEthereumContract_signedWith_NoBalanceWallet = tokenEthereumContract.connect(walletTo);

                // 2. connect allowedWallet to the contract
                const tokenEthereumContract_signedWith_allowedAddress = tokenEthereumContract.connect(allowedWallet);

                // Assert
                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(walletTo.address, wallet.address, 100)).to.be.revertedWith('Insufficient balance');
            });

            it('Throw if an approved address has no sufficient permission to spend the balance of the `_from` account', async () => {
                const tokenEthereumContract_signedWith_allowedAddress = tokenEthereumContract.connect(allowedWallet);
                // Assume that allowedWallet has 0 tokens approved to spend on wallet behalf
                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, 100)).to.be.revertedWith('Insufficent allowance');
            });

            it('Throw if an approved address has no sufficient permission to spend the balance of the `_from` account', async () => {
                // 1. wallet allow allowedWallet to spend 100 tokens
                await tokenEthereumContract.approve(allowedWallet.address, 100);

                // 2. connect allowedWallet to the contract
                const tokenEthereumContractAllowedWallet = tokenEthereumContract.connect(allowedWallet);

                // Assert
                await expect(tokenEthereumContractAllowedWallet.transferFrom(wallet.address, walletTo.address, 101)).to.be.revertedWith('Insufficent allowance');
            });
        });
    });

    describe('approve()', async () => {
        beforeEach(async () => {
            tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
        });

        describe('Ok scenarios', async () => {
            it('Try to approve `allowedWallet` to spend `wallet` tokens', async () => {
                await tokenEthereumContract.approve(allowedWallet.address, 100);
                const allowance = await tokenEthereumContract.allowance(wallet.address, allowedWallet.address);
                await expect(allowance).to.be.equal(100);
            });
            it('Try to set to a new value, higher than zero, for the same spender, with a current allowance different that zero', async () => {
                await tokenEthereumContract.approve(allowedWallet.address, 100);
                await tokenEthereumContract.approve(allowedWallet.address, 0);
                await tokenEthereumContract.approve(allowedWallet.address, 500);
                const allowance = await tokenEthereumContract.allowance(wallet.address, allowedWallet.address);
                console.log(allowance);
                await expect(allowance).to.be.equal(500);
            });
            it('Should emit Approve event with proper parameters', async () => {
                const allowedAmount = 100;
                await expect(tokenEthereumContract.approve(allowedWallet.address, allowedAmount))
                    .to.emit(tokenEthereumContract, 'Approval')
                    .withArgs(wallet.address, allowedWallet.address, allowedAmount);
            });
        });
        describe('Reverted transactions', async () => {
            it('Throw if `_spender` is zero address', async () => {
                await expect(tokenEthereumContract.approve(ZERO_ADDRESS, 100)).to.be.revertedWith('_spender cannot be zero address');
            });
            it('Throw if `_value` exceeds the `_sender` balance', async () => {
                const tokenEthereumContract_signedWith_noBalance = tokenEthereumContract.connect(walletTo);
                await expect(tokenEthereumContract_signedWith_noBalance.approve(wallet.address, 1)).to.be.revertedWith('Insufficient balance');
            });
            it('Throw if allowance tries to be set to a new value, higher than zero, for the same spender, with a current allowance different that zero', async () => {
                await tokenEthereumContract.approve(walletTo.address, 10);
                await expect(tokenEthereumContract.approve(walletTo.address, 100)).to.be.revertedWith('Invalid allowance amount. Set to zero first');
            });
        });
    });

    describe('balanceOf()', async () => {
        beforeEach(async () => {
            tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
        });

        describe('Ok scenarios', async () => {
            it('Balance of zero address is zero', async () => {
                expect(await tokenEthereumContract.balanceOf(ZERO_ADDRESS)).to.be.equal(0);
            });

            it('Balance of address without tokens is zero', async () => {
                expect(await tokenEthereumContract.balanceOf(allowedWallet.address)).to.be.equal(0);
            });
        });
    });

    describe('allowance()', async () => {
        beforeEach(async () => {
            tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
        });

        describe('Ok scenarios', async () => {
            it('Allowance of spender zero address is zero', async () => {
                expect(await tokenEthereumContract.allowance(wallet.address, ZERO_ADDRESS)).to.be.equal(0);
            });

            it('Allowance of owner zero address is zero', async () => {
                expect(await tokenEthereumContract.allowance(ZERO_ADDRESS, wallet.address)).to.be.equal(0);
            });

            it('Allowance of owner without tokens is zero', async () => {
                expect(await tokenEthereumContract.allowance(allowedWallet.address, wallet.address)).to.be.equal(0);
            });
        });
    });

    describe('mint()', async () => {
        beforeEach(async () => {
            tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
        });
        it('Try mint() operation not exists', async () => {
            try {
                await tokenEthereumContract.mint(wallet.address, 100);
            } catch (error) {
                expect(error.message).to.be.equal('tokenEthereumContract.mint is not a function');
            }
        });
    });
    describe('burn()', async () => {
        beforeEach(async () => {
            tokenEthereumContract = await deployContract(wallet, TOKEN_ETHEREUM_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol, tokenDetails.maxSupply]);
        });

        it('Try burn() operation not exists', async () => {
            try {
                await tokenEthereumContract.burn(100);
            } catch (error) {
                expect(error.message).to.be.equal('tokenEthereumContract.burn is not a function');
            }
        });
    });
});
