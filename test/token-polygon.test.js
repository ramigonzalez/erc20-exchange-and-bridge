const { ethers } = require('hardhat');

const chai = require('chai');
const { solidity } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;

const { ZERO_ADDRESS, deployContract } = require('../test/utils');
const constants = require('./utils/constants');

const TOKEN_POLYGON_CONTRACT_NAME = constants.contracts.TOKEN_POLYGON;

const tokenDetails = constants.defaultTokenPolygon;

let wallet, walletTo, allowedWallet, david;

describe(TOKEN_POLYGON_CONTRACT_NAME, async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', TOKEN_POLYGON_CONTRACT_NAME, 'Contract Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [wallet, walletTo, allowedWallet, david] = await ethers.getSigners();
        provider = ethers.provider;
    });

    let tokenPolygonContract;

    describe('constructor()', async () => {
        describe('Ok scenarios', async () => {
            before(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
                await tokenPolygonContract.mint(wallet.address, 1000);
            });

            it(`Token name should be: "${tokenDetails.name}"`, async () => {
                const tokenName = await tokenPolygonContract.name();
                expect(tokenName).to.equal(tokenDetails.name);
            });

            it(`Token symbol should be: "${tokenDetails.symbol}"`, async () => {
                const tokenSymbol = await tokenPolygonContract.symbol();
                expect(tokenSymbol).to.equal(tokenDetails.symbol);
            });

            it(`Token decimals should be: ${tokenDetails.decimals}`, async () => {
                const tokenDecimal = await tokenPolygonContract.decimals();
                expect(tokenDecimal).to.equal(tokenDetails.decimals);
            });

            it('Should emit Transfer event with proper parameters', async () => {
                const eventName = 'Transfer';

                const eventArguments = {
                    _from: ZERO_ADDRESS,
                    _to: wallet.address,
                    _value: 0,
                };

                const tx = await tokenPolygonContract.deployTransaction.wait();
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
                await expect(deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, ['', tokenDetails.symbol])).to.be.revertedWith('Invalid parameter: _name');
            });

            it('Should revert if `_symbol` is empty', async () => {
                await expect(deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, ''])).to.be.revertedWith('Invalid parameter: _symbol');
            });
        });
    });

    describe('transfer()', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
                await tokenPolygonContract.mint(wallet.address, 1000);
            });

            it('Should transfer requested amount and modify both balances', async () => {
                await expect(() => tokenPolygonContract.transfer(walletTo.address, 200)).to.changeTokenBalances(tokenPolygonContract, [wallet, walletTo], [-200, 200]);
            });

            it('Should execute zero amount transfer with as normal transfer', async () => {
                await expect(() => tokenPolygonContract.transfer(walletTo.address, 0)).to.changeTokenBalances(tokenPolygonContract, [wallet, walletTo], [-0, 0]);
            });

            it('Normal transaction should emit Transfer event with proper parameters', async () => {
                await expect(tokenPolygonContract.transfer(walletTo.address, 100)).to.emit(tokenPolygonContract, 'Transfer').withArgs(wallet.address, walletTo.address, 100);
            });

            it('0 token Transaction Should emit Transfer event with proper parameters', async () => {
                await expect(tokenPolygonContract.transfer(walletTo.address, 0)).to.emit(tokenPolygonContract, 'Transfer').withArgs(wallet.address, walletTo.address, 0);
            });
        });

        describe('Reverted transactions', async () => {
            beforeEach(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
                await tokenPolygonContract.mint(wallet.address, 1000);
            });

            it('Should revert if `_to` is zero address', async () => {
                await expect(tokenPolygonContract.transfer(ZERO_ADDRESS, 100)).to.be.revertedWith('_to cannot be zero address');
            });

            it('Should revert `_to` is sender account', async () => {
                await expect(tokenPolygonContract.transfer(wallet.address, 100)).to.be.revertedWith('Invalid recipient, same as remittent');
            });

            it('Should revert if remittent account has insufficient balance', async () => {
                // Change msg.sender
                const tokenEthereumContract_signedWith_NoBalanceAddress = tokenPolygonContract.connect(walletTo);
                await expect(tokenEthereumContract_signedWith_NoBalanceAddress.transfer(wallet.address, 100)).to.be.revertedWith('Insufficient balance');
            });
        });
    });

    describe('transferFrom()', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
                await tokenPolygonContract.mint(wallet.address, 1000);
            });

            it('Should transfer tokens on `_from` behalf', async () => {
                await tokenPolygonContract.approve(allowedWallet.address, 100);
                const tokenEthereumContract_signedWith_allowedAddress = tokenPolygonContract.connect(allowedWallet);
                const amountToTransfer = 10;
                await expect(() => tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer)).to.changeTokenBalances(
                    tokenPolygonContract,
                    [wallet, walletTo],
                    [-amountToTransfer, amountToTransfer]
                );
            });

            it('Should substract `msg.signer` allowed token amount after transfer', async () => {
                const approveValue = 100;
                const amountToTransfer = 10;

                await tokenPolygonContract.approve(allowedWallet.address, approveValue);

                const tokenEthereumContract_signedWith_allowedAddress = tokenPolygonContract.connect(allowedWallet);
                await tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer);

                const allowance = await tokenPolygonContract.allowance(wallet.address, allowedWallet.address);

                expect(allowance).to.equal(approveValue - amountToTransfer);
            });

            it('Should execute zero amount transfer with as normal transfer', async () => {
                await expect(() => tokenPolygonContract.transferFrom(wallet.address, walletTo.address, 0)).to.changeTokenBalances(
                    tokenPolygonContract,
                    [wallet, walletTo],
                    [-0, 0]
                );
            });

            it('Normal transaction should emit Transfer event with proper parameters', async () => {
                await tokenPolygonContract.approve(allowedWallet.address, 100);
                const tokenEthereumContract_signedWith_allowedAddress = tokenPolygonContract.connect(allowedWallet);
                const amountToTransfer = 10;

                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, amountToTransfer))
                    .to.emit(tokenEthereumContract_signedWith_allowedAddress, 'Transfer')
                    .withArgs(wallet.address, walletTo.address, amountToTransfer);
            });

            it('0 token Transaction Should emit Transfer event with proper parameters', async () => {
                await expect(tokenPolygonContract.transferFrom(wallet.address, walletTo.address, 0))
                    .to.emit(tokenPolygonContract, 'Transfer')
                    .withArgs(wallet.address, walletTo.address, 0);
            });

            it('Try transferFrom with signer (`msg.sender`) being same as `_from`', async () => {
                const amountToTransfer = 100;
                await expect(() => tokenPolygonContract.transferFrom(wallet.address, walletTo.address, amountToTransfer)).to.changeTokenBalances(
                    tokenPolygonContract,
                    [wallet, walletTo],
                    [-amountToTransfer, amountToTransfer]
                );
            });
        });

        describe('Reverted transactions', async () => {
            beforeEach(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
                await tokenPolygonContract.mint(wallet.address, 1000);
            });

            it('Throw if `_from` is zero address', async () => {
                await expect(tokenPolygonContract.transferFrom(ZERO_ADDRESS, wallet.address, 100)).to.be.revertedWith('_from cannot be zero address');
            });

            it('Throw if `_to` is zero address', async () => {
                await expect(tokenPolygonContract.transferFrom(wallet.address, ZERO_ADDRESS, 100)).to.be.revertedWith('_to cannot be zero address');
            });

            it('Throw if `_to` is the same as `_from` account', async () => {
                await expect(tokenPolygonContract.transferFrom(wallet.address, wallet.address, 100)).to.be.revertedWith('Invalid recipient, same as remittent');
            });

            it('Throw if `_from` account has insufficient balance', async () => {
                // 1. connect allowedWallet to the contract
                const tokenEthereumContract_signedWith_NoBalanceWallet = tokenPolygonContract.connect(walletTo);

                // 2. connect allowedWallet to the contract
                const tokenEthereumContract_signedWith_allowedAddress = tokenPolygonContract.connect(allowedWallet);

                // Assert
                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(walletTo.address, wallet.address, 100)).to.be.revertedWith('Insufficient balance');
            });

            it('Throw if an approved address has no sufficient permission to spend the balance of the `_from` account', async () => {
                const tokenEthereumContract_signedWith_allowedAddress = tokenPolygonContract.connect(allowedWallet);

                // Assume that allowedWallet has 0 tokens approved to spend on wallet behalf
                await expect(tokenEthereumContract_signedWith_allowedAddress.transferFrom(wallet.address, walletTo.address, 100)).to.be.revertedWith('Insufficent allowance');
            });

            it('Throw if an approved address has no sufficient permission to spend the balance of the `_from` account', async () => {
                // 1. wallet allow allowedWallet to spend 100 tokens
                await tokenPolygonContract.approve(allowedWallet.address, 100);

                // 2. connect allowedWallet to the contract
                const tokenEthereumContractAllowedWallet = tokenPolygonContract.connect(allowedWallet);

                // Assert
                await expect(tokenEthereumContractAllowedWallet.transferFrom(wallet.address, walletTo.address, 101)).to.be.revertedWith('Insufficent allowance');
            });
        });
    });

    describe('approve()', async () => {
        beforeEach(async () => {
            tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
            await tokenPolygonContract.mint(wallet.address, 1000);
        });

        describe('Ok scenarios', async () => {
            it('Try to approve `allowedWallet` to spend `wallet` tokens', async () => {
                await tokenPolygonContract.approve(allowedWallet.address, 100);
                const allowance = await tokenPolygonContract.allowance(wallet.address, allowedWallet.address);
                await expect(allowance).to.be.equal(100);
            });
            it('Try to set to a new value, higher than zero, for the same spender, with a current allowance different that zero', async () => {
                await tokenPolygonContract.approve(allowedWallet.address, 100);
                await tokenPolygonContract.approve(allowedWallet.address, 0);
                await tokenPolygonContract.approve(allowedWallet.address, 500);
                const allowance = await tokenPolygonContract.allowance(wallet.address, allowedWallet.address);
                console.log(allowance);
                await expect(allowance).to.be.equal(500);
            });
            it('Should emit Approve event with proper parameters', async () => {
                const allowedAmount = 100;
                await expect(tokenPolygonContract.approve(allowedWallet.address, allowedAmount))
                    .to.emit(tokenPolygonContract, 'Approval')
                    .withArgs(wallet.address, allowedWallet.address, allowedAmount);
            });
        });
        describe('Reverted transactions', async () => {
            it('Throw if `_spender` is zero address', async () => {
                await expect(tokenPolygonContract.approve(ZERO_ADDRESS, 100)).to.be.revertedWith('_spender cannot be zero address');
            });
            it('Throw if `_value` exceeds the `_sender` balance', async () => {
                const tokenEthereumContract_signedWith_noBalance = tokenPolygonContract.connect(walletTo);
                await expect(tokenEthereumContract_signedWith_noBalance.approve(wallet.address, 1)).to.be.revertedWith('Insufficient balance');
            });
            it('Throw if allowance tries to be set to a new value, higher than zero, for the same spender, with a current allowance different that zero', async () => {
                await tokenPolygonContract.approve(walletTo.address, 10);
                await expect(tokenPolygonContract.approve(walletTo.address, 100)).to.be.revertedWith('Invalid allowance amount. Set to zero first');
            });
        });
    });

    describe('balanceOf()', async () => {
        beforeEach(async () => {
            tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
        });

        describe('Ok scenarios', async () => {
            it('Balance of zero address is zero', async () => {
                expect(await tokenPolygonContract.balanceOf(ZERO_ADDRESS)).to.be.equal(0);
            });

            it('Balance of address without tokens is zero', async () => {
                expect(await tokenPolygonContract.balanceOf(allowedWallet.address)).to.be.equal(0);
            });
        });
    });

    describe('allowance()', async () => {
        beforeEach(async () => {
            tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
        });

        describe('Ok scenarios', async () => {
            it('Allowance of spender zero address is zero', async () => {
                expect(await tokenPolygonContract.allowance(wallet.address, ZERO_ADDRESS)).to.be.equal(0);
            });

            it('Allowance of owner zero address is zero', async () => {
                expect(await tokenPolygonContract.allowance(ZERO_ADDRESS, wallet.address)).to.be.equal(0);
            });

            it('Allowance of owner without tokens is zero', async () => {
                expect(await tokenPolygonContract.allowance(allowedWallet.address, wallet.address)).to.be.equal(0);
            });
        });
    });

    describe('mint()', async () => {
        beforeEach(async () => {
            tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
        });

        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
            });
            it('Try to mint `_amountToMint` tokens at `_recipient` address', async () => {
                const amount = 20;
                await expect(() => tokenPolygonContract.mint(walletTo.address, amount)).to.changeTokenBalances(tokenPolygonContract, [walletTo], [amount]);
                expect(await tokenPolygonContract.totalSupply()).to.be.equal(amount);
            });

            it('Should emit Transfer event with proper parameters', async () => {
                const amount = 20;
                await expect(tokenPolygonContract.mint(walletTo.address, amount)).to.emit(tokenPolygonContract, 'Transfer').withArgs(ZERO_ADDRESS, walletTo.address, amount);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_amountToMint` is zero', async () => {
                const amount = 0;
                await expect(tokenPolygonContract.mint(walletTo.address, amount)).to.be.revertedWith('_amountToMint must be greater than zero');
            });

            it('Throw if `_recipient` is zero address', async () => {
                const amount = 30;
                await expect(tokenPolygonContract.mint(ZERO_ADDRESS, amount)).to.be.revertedWith('_recipient cannot be zero address');
            });
        });
    });

    describe('burn()', async () => {
        beforeEach(async () => {
            tokenPolygonContract = await deployContract(wallet, TOKEN_POLYGON_CONTRACT_NAME, [tokenDetails.name, tokenDetails.symbol]);
            await tokenPolygonContract.mint(wallet.address, 1000);
        });

        describe('Ok scenarios', async () => {
            it('Should burn tokens from `msg.sender` balance', async () => {
                const amount = 20;
                const expectedAmount = (await tokenPolygonContract.totalSupply()).sub(amount);

                await expect(() => tokenPolygonContract.burn(amount)).to.changeTokenBalances(tokenPolygonContract, [wallet], [-20]);
                expect(await tokenPolygonContract.totalSupply()).to.be.equal(expectedAmount);
            });

            it('Should emit Transfer event with proper parameters', async () => {
                const amount = 20;
                await expect(tokenPolygonContract.burn(amount)).to.emit(tokenPolygonContract, 'Burn').withArgs(wallet.address, wallet.address, amount);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_value` is zero', async () => {
                await expect(tokenPolygonContract.burn(0)).to.be.revertedWith('_value must be greater than zero');
            });

            it('Throw if `msg.sender` account has insufficient tokens to burn', async () => {
                const amount = 100;
                await expect(tokenPolygonContract.connect(walletTo).burn(amount)).to.be.revertedWith('Insufficient balance');
            });
        });
    });
});
