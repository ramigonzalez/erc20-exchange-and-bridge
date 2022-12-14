const { ethers } = require('hardhat');

const chai = require('chai');
const { solidity, deployMockContract } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;

const { ZERO_ADDRESS, deployContract, getContractAbi } = require('./utils');
const constants = require('./utils/constants');

const contracts = constants.contracts;

let wallet, walletTo, noBalanceWallet, blacklistWallet;
let exchageDefault;
let dummyContract;

describe(contracts.BRIDGE_ETHEREUM, async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', contracts.BRIDGE_ETHEREUM, 'Contract Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [wallet, walletTo, noBalanceWallet, blacklistWallet] = await ethers.getSigners();
        provider = ethers.provider;

        dummyContract = await deployMockContract(wallet, getContractAbi(contracts.TOKEN_ETHEREUM));

        exchageDefault = {
            erc20Contract: ZERO_ADDRESS,
        };
    });

    let bridgeEthereumContract, tokenEthereumContract;

    describe('constructor()', async () => {
        beforeEach(async () => {
            // 1. Wallet will have positive balance after deploying ERC20_Ethereum contract
            tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                constants.defaultTokenEthereum.name,
                constants.defaultTokenEthereum.symbol,
                constants.defaultTokenEthereum.maxSupply,
            ]);

            // 2. Deploy bridgeEthereum contract.
            bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
        });

        describe('Ok scenarios', async () => {
            it('Bridge `owner` should be: `msg.signer`', async () => {
                const owner = await bridgeEthereumContract.owner();
                expect(owner).to.equal(wallet.address);
            });

            it('Bridge `erc20Contract` should be: `_erc20Contract`', async () => {
                expect(await bridgeEthereumContract.erc20Contract()).to.equal(tokenEthereumContract.address);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_erc20Contract` is zero address', async () => {
                await expect(deployContract(wallet, contracts.BRIDGE_ETHEREUM, [ZERO_ADDRESS])).to.be.revertedWith('_erc20Contract cannot be zero address');
            });

            it('Throw if `_erc20Contract` is not an internal owned account (IOA)', async () => {
                await expect(deployContract(wallet, contracts.BRIDGE_ETHEREUM, [walletTo.address])).to.be.revertedWith('_erc20Contract is not a contract');
            });
        });
    });

    describe('unStake', async () => {
        beforeEach(async () => {
            // 1. Deploy tokenEthereum contract.
            tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                constants.defaultTokenEthereum.name,
                constants.defaultTokenEthereum.symbol,
                constants.defaultTokenEthereum.maxSupply,
            ]);
            // 2. Deploy bridgeEthereum contract.
            bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
            // 3. Stake some value
            await tokenEthereumContract.approve(bridgeEthereumContract.address, 100);
            await bridgeEthereumContract.transferToPolygon(100);
        });

        describe('Ok scenarios', async () => {
            it('The staked balance of the _owner account should be decreased by _tokenAmount', async () => {
                const oldStake = await bridgeEthereumContract.stake(wallet.address);
                await bridgeEthereumContract.unStake(wallet.address, 100);
                const stake = await bridgeEthereumContract.stake(wallet.address);
                expect(stake).to.equal(oldStake - 100);
            });
        });

        describe('Reverted transactions', async () => {
            beforeEach(async () => {
                // 1. Deploy tokenEthereum contract.
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
                // 2. Deploy bridgeEthereum contract.
                bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
            });

            it('Throw if `msg.sender` is not the owner of the protocol', async () => {
                const bridgeFromAnotherAddress = await bridgeEthereumContract.connect(walletTo);
                await expect(bridgeFromAnotherAddress.unStake(walletTo.address, 100)).to.be.revertedWith('Not autorized');
            });

            it('Throw if `_owner` is the zero address', async () => {
                await expect(bridgeEthereumContract.unStake(ZERO_ADDRESS, 100)).to.be.revertedWith('_owner cannot be zero address');
            });

            it('Throw if `_owner` is blacklisted', async () => {
                await bridgeEthereumContract.addAddressToBlackList(walletTo.address);
                await expect(bridgeEthereumContract.unStake(walletTo.address, 100)).to.be.revertedWith('_owner address is in blacklist');
            });

            it('Throw if `_owner` has no stake', async () => {
                await expect(bridgeEthereumContract.unStake(walletTo.address, 100)).to.be.revertedWith('_owner address has no stake');
            });

            it('Throw if `_tokenAmount` is not greater than zero', async () => {
                await tokenEthereumContract.approve(bridgeEthereumContract.address, 100);
                await bridgeEthereumContract.transferToPolygon(100);
                await expect(bridgeEthereumContract.unStake(wallet.address, 0)).to.be.revertedWith('_tokenAmount must be greater than zero');
            });

            it('Throw if `_tokenAmount` is greater than staked amount', async () => {
                await tokenEthereumContract.approve(bridgeEthereumContract.address, 100);
                await bridgeEthereumContract.transferToPolygon(100);
                await expect(bridgeEthereumContract.unStake(wallet.address, 101)).to.be.revertedWith('_tokenAmount value exceed staking');
            });
        });
    });

    describe('transferToPolygon', async () => {
        beforeEach(async () => {
            // 1. Deploy tokenEthereum contract.
            tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                constants.defaultTokenEthereum.name,
                constants.defaultTokenEthereum.symbol,
                constants.defaultTokenEthereum.maxSupply,
            ]);
            // 2. Deploy bridgeEthereum contract.
            bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
        });

        describe('Ok scenarios', async () => {
            it('The token balance from Ethereum of the sender should decrease by 100', async () => {
                const oldBalance = Number(await tokenEthereumContract.balanceOf(wallet.address));
                await tokenEthereumContract.approve(bridgeEthereumContract.address, 100);
                await bridgeEthereumContract.transferToPolygon(100);
                const balance = Number(await tokenEthereumContract.balanceOf(wallet.address));
                expect(balance).to.equal(oldBalance - 100);
            });

            it('The event TransferToPolygon should be emitted', async () => {
                await tokenEthereumContract.approve(bridgeEthereumContract.address, 100);
                await expect(bridgeEthereumContract.transferToPolygon(100)).to.emit(bridgeEthereumContract, 'TransferToPolygon').withArgs(wallet.address, 100);
            });
        });

        describe('Reverted transactions', async () => {
            it('Throw if `_tokenAmount` is zero amount', async () => {
                await expect(bridgeEthereumContract.transferToPolygon(0)).to.be.revertedWith('_tokenAmount must be greater than zero');
            });

            it('Throw if `_maxSupply` is zero amount', async () => {
                const tokenEthereumContractWithoutMaxSupply = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    0,
                ]);
                const bridgeEthereumContractWithoutMaxSupply = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContractWithoutMaxSupply.address]);
                await expect(bridgeEthereumContractWithoutMaxSupply.transferToPolygon(100)).to.be.revertedWith('_maxSupply must be greater than zero');
            });

            it('Throw if `_tokenAmount` exceed the maximum supply of ERC20_Ethereum', async () => {
                const tokenEthereumContractWith1Max = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    1,
                ]);
                const bridgeEthereumContractWith1Max = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContractWith1Max.address]);
                await expect(bridgeEthereumContractWith1Max.transferToPolygon(100)).to.be.revertedWith('_tokenAmount exceeds max supply');
            });

            it('Throw if `msg.sender` is blacklisted', async () => {
                await bridgeEthereumContract.addAddressToBlackList(walletTo.address);
                const bridgeFromAnotherAddress = await bridgeEthereumContract.connect(walletTo);
                await expect(bridgeFromAnotherAddress.transferToPolygon(100)).to.be.revertedWith('Invalid sender');
            });

            it('Throw if `msg.sender` account has insufficient balance', async () => {
                const bridgeFromAnotherAddress = await bridgeEthereumContract.connect(walletTo);
                await expect(bridgeFromAnotherAddress.transferToPolygon(1)).to.be.revertedWith('Insufficient balance');
            });
        });
    });

    describe('addAddressToBlackList', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                // 1. Deploy tokenEthereum contract.
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
                // 2. Deploy bridgeEthereum contract.
                bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
                await bridgeEthereumContract.addAddressToBlackList(blacklistWallet.address);
            });
            it('Should add wallet to blacklisted list', async () => {
                expect(await bridgeEthereumContract.blackListed(blacklistWallet.address)).to.be.true;
            });
        });

        describe('Revert transactions', async () => {
            beforeEach(async () => {
                // 1. Deploy tokenEthereum contract.
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
                // 2. Deploy bridgeEthereum contract.
                bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
            });
            it('Throw if `_invalidAddress` is zero address', async () => {
                await expect(bridgeEthereumContract.addAddressToBlackList(ZERO_ADDRESS)).to.be.revertedWith('_invalidAddress cannot be zero address');
            });
            it('Throw if `_invalidAddress` is the owner of the protocol', async () => {
                await expect(bridgeEthereumContract.addAddressToBlackList(wallet.address)).to.be.revertedWith('Invalid address _invalidAddress');
            });
            it('Throw if `_invalidAddress` is already added to the blacklist', async () => {
                await bridgeEthereumContract.addAddressToBlackList(blacklistWallet.address);
                await expect(bridgeEthereumContract.addAddressToBlackList(blacklistWallet.address)).to.be.revertedWith('Address already in the list');
            });
        });
    });

    describe('removeAddressFromBlackList', async () => {
        describe('Ok scenarios', async () => {
            beforeEach(async () => {
                // 1. Deploy tokenEthereum contract.
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
                // 2. Deploy bridgeEthereum contract.
                bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
                await bridgeEthereumContract.addAddressToBlackList(blacklistWallet.address);
            });
            it('Should add wallet to blacklisted list', async () => {
                await bridgeEthereumContract.removeAddressFromBlackList(blacklistWallet.address);
                expect(await bridgeEthereumContract.blackListed(blacklistWallet.address)).to.be.false;
            });
        });

        describe('Revert transactions', async () => {
            beforeEach(async () => {
                // 1. Deploy tokenEthereum contract.
                tokenEthereumContract = await deployContract(wallet, contracts.TOKEN_ETHEREUM, [
                    constants.defaultTokenEthereum.name,
                    constants.defaultTokenEthereum.symbol,
                    constants.defaultTokenEthereum.maxSupply,
                ]);
                // 2. Deploy bridgeEthereum contract.
                bridgeEthereumContract = await deployContract(wallet, contracts.BRIDGE_ETHEREUM, [tokenEthereumContract.address]);
                await bridgeEthereumContract.addAddressToBlackList(blacklistWallet.address);
            });
            it('Throw if `_invalidAddress` is zero address', async () => {
                await expect(bridgeEthereumContract.removeAddressFromBlackList(ZERO_ADDRESS)).to.be.revertedWith('_invalidAddress cannot be zero address');
            });
            it('Throw if `_invalidAddress` is not added to the blacklist', async () => {
                await bridgeEthereumContract.removeAddressFromBlackList(blacklistWallet.address);
                await expect(bridgeEthereumContract.removeAddressFromBlackList(blacklistWallet.address)).to.be.revertedWith('Address not found');
            });
        });
    });
});
