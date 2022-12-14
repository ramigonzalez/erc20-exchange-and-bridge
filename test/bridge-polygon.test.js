const { ethers } = require('hardhat');

const chai = require('chai');
const { solidity, deployMockContract } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;

const { ZERO_ADDRESS, deployContract, getContractAbi } = require('./utils');
const constants = require('./utils/constants');

const contracts = constants.contracts;

let wallet, walletTo;

describe(contracts.BRIDGE_POLYGON, async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', contracts.BRIDGE_POLYGON, 'Contract Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [wallet, walletTo, noBalanceWallet] = await ethers.getSigners();
        provider = ethers.provider;
    });

    let bridgePolygonContract, tokenPolygonContract;

    describe('constructor()', async () => {
        beforeEach(async () => {
            // 1. Wallet will have positive balance after deploying ERC20_Polygon contract
            tokenPolygonContract = await deployContract(wallet, contracts.TOKEN_POLYGON, [constants.defaultTokenPolygon.name, constants.defaultTokenPolygon.symbol]);

            // 2. Deploy bridgePolygon contract.
            bridgePolygonContract = await deployContract(wallet, contracts.BRIDGE_POLYGON, [tokenPolygonContract.address]);
        });

        describe('Ok scenarios', async () => {
            it('Bridge `owner` should be: `msg.signer`', async () => {
                const owner = await bridgePolygonContract.owner();
                expect(owner).to.equal(wallet.address);
            });

            it('Bridge `erc20Contract` should be: `_erc20Contract`', async () => {
                expect(await bridgePolygonContract.erc20Contract()).to.equal(tokenPolygonContract.address);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_erc20Contract` is zero address', async () => {
                await expect(deployContract(wallet, contracts.BRIDGE_POLYGON, [ZERO_ADDRESS])).to.be.revertedWith('Invalid address _erc20Contract');
            });

            it('Throw if `_erc20Contract` is the owner of the protocol', async () => {
                await expect(deployContract(wallet, contracts.BRIDGE_POLYGON, [wallet.address])).to.be.revertedWith('Invalid address _erc20Contract');
            });

            it('Throw if `_erc20Contract` is not an internal owned account (IOA)', async () => {
                await expect(deployContract(wallet, contracts.BRIDGE_POLYGON, [walletTo.address])).to.be.revertedWith('_erc20Contract is not a contract');
            });
        });
    });

    describe('mintTo', async () => {
        beforeEach(async () => {
            // 1. Deploy tokenPolygon contract.
            tokenPolygonContract = await deployContract(wallet, contracts.TOKEN_POLYGON, [constants.defaultTokenPolygon.name, constants.defaultTokenPolygon.symbol]);
            // 2. Deploy bridgePolygon contract.
            bridgePolygonContract = await deployContract(wallet, contracts.BRIDGE_POLYGON, [tokenPolygonContract.address]);
            // 3. mint some tokens.
            await tokenPolygonContract.mint(wallet.address, 1000);
        });

        describe('Ok scenarios', async () => {
            it('The token balance of the _to account should be _tokenAmount', async () => {
                await bridgePolygonContract.mintTo(walletTo.address, 100);
                const balance = await tokenPolygonContract.balanceOf(walletTo.address);
                expect(balance).to.equal(100);
            });

            it('The event MintOrder should be emitted', async () => {
                await expect(bridgePolygonContract.mintTo(walletTo.address, 100)).to.emit(bridgePolygonContract, 'MintOrder').withArgs(walletTo.address, 100);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if the method is not called by the owner', async () => {
                const bridgeFromAnotherAddress = await bridgePolygonContract.connect(walletTo);
                await expect(bridgeFromAnotherAddress.mintTo(walletTo.address, 100)).to.be.revertedWith('Not autorized');
            });

            it('Throw if `_to` is zero address', async () => {
                await expect(bridgePolygonContract.mintTo(ZERO_ADDRESS, 100)).to.be.revertedWith('_to cannot be zero address');
            });

            it('Throw if `_to` is in the blacklist', async () => {
                await bridgePolygonContract.addAddressToBlackList(walletTo.address);
                await expect(bridgePolygonContract.mintTo(walletTo.address, 100)).to.be.revertedWith('_to address is in blacklist');
            });

            it('Throw if `_tokenAmount` is not greater than zero', async () => {
                await expect(bridgePolygonContract.mintTo(walletTo.address, 0)).to.be.revertedWith('_tokenAmount must be greater than zero');
            });
        });
    });

    describe('transferToEthereum', async () => {
        beforeEach(async () => {
            // 1. Deploy tokenPolygon contract.
            tokenPolygonContract = await deployContract(wallet, contracts.TOKEN_POLYGON, [constants.defaultTokenPolygon.name, constants.defaultTokenPolygon.symbol]);
            // 2. Deploy bridgePolygon contract.
            bridgePolygonContract = await deployContract(wallet, contracts.BRIDGE_POLYGON, [tokenPolygonContract.address]);
            // 3. mint some tokens.
            await tokenPolygonContract.mint(wallet.address, 1000);
        });

        describe('Ok scenarios', async () => {
            it('The token balance from Polygon should decrease by 100', async () => {
                const oldBalance = Number(await tokenPolygonContract.balanceOf(wallet.address));
                await tokenPolygonContract.approve(bridgePolygonContract.address, 100);
                await bridgePolygonContract.transferToEthereum(100);
                const balance = Number(await tokenPolygonContract.balanceOf(wallet.address));
                expect(balance).to.equal(oldBalance - 100);
            });

            it('The _totalSupply of the polygon token should decrease by 100', async () => {
                const oldTotalSupply = Number(await tokenPolygonContract.totalSupply());
                await tokenPolygonContract.approve(bridgePolygonContract.address, 100);
                await bridgePolygonContract.transferToEthereum(100);
                const totalSupply = Number(await tokenPolygonContract.totalSupply());
                expect(totalSupply).to.equal(oldTotalSupply - 100);
            });

            it('The event TransferToEthereum should be emitted', async () => {
                await tokenPolygonContract.approve(bridgePolygonContract.address, 100);
                await expect(bridgePolygonContract.transferToEthereum(100)).to.emit(bridgePolygonContract, 'TransferToEthereum').withArgs(wallet.address, 100);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_tokenAmount` is not greater than zero', async () => {
                await expect(bridgePolygonContract.transferToEthereum(0)).to.be.revertedWith('_tokenAmount must be greater than zero');
            });

            it('Throw if `_tokenAmount` is greater than the balance of the sender', async () => {
                const balance = await tokenPolygonContract.balanceOf(wallet.address);
                await expect(bridgePolygonContract.transferToEthereum(balance + 1)).to.be.revertedWith('_tokenAmount value exceed balance');
            });
        });
    });
});
