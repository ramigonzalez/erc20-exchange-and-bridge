const { ethers } = require('hardhat');
const { getContractAddress } = require('@ethersproject/address');

const utils = {};

utils.ONE_ETHER = ethers.utils.parseEther('1');

utils.calculateSpentGas = async (tx) => {
    const tx_executed = await tx.wait();
    return await tx_executed.gasUsed.mul(tx_executed.effectiveGasPrice);
};

utils.preCalculateFutureContractAddress = async (wallet, txnsAhead = 0) => {
    const transactionCount = await wallet.getTransactionCount();
    return getContractAddress({
        from: wallet.address,
        nonce: transactionCount + txnsAhead,
    });
};

utils.getContractAbi = (contractName) => require(`../../artifacts/contracts/${contractName}.sol/${contractName}.json`).abi;
const getContractPath = (contractName) => `contracts/${contractName}.sol:${contractName}`;

utils.deployContract = async (wallet, contractName, constructorArgs, txOptions = {}) => {
    let contractInstance;
    const contractFactory = await ethers.getContractFactory(getContractPath(contractName), wallet);
    if (!constructorArgs) {
        contractInstance = await contractFactory.deploy(txOptions);
    } else {
        contractInstance = await contractFactory.deploy(...constructorArgs, txOptions);
    }
    const deployedInstance = await contractInstance.deployed();
    return deployedInstance;
};

utils.ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

utils.contractABI = (contractName) => {
    return require(`../artifacts/contracts/${contractName}.sol/${contractName}.json`);
};

/**
 *
 * @param {*} amount must be a number
 * @returns a fixed number in ether unit by default
 */
utils.toEthers = (amount) => {
    try {
        if (!isNaN(amount)) {
            return ethers.FixedNumber.fromString(amount.toString());
        } else throw new Error('Amount must be a number');
    } catch (e) {
        console.error(e.message);
        throw e;
    }
};

utils.toBigNumber = (amount) => {
    try {
        if (!isNaN(amount)) {
            return ethers.BigNumber.from(amount);
        } else throw new Error('Amount must be a number');
    } catch (e) {
        console.error(e.message);
        throw e;
    }
};

utils.increaseOneYear = async (network) => {
    const ONE_YEAR = 60 * 60 * 24 * 365;
    await utils.increaseTime(network, ONE_YEAR);
};

utils.increaseTwoYears = async (network) => {
    const TWO_YEARS = 60 * 60 * 24 * 365 * 2;
    await utils.increaseTime(network, TWO_YEARS);
};

utils.increaseTime = async (network, time) => {
    await network.provider.send('evm_increaseTime', [time]);
    await network.provider.send('evm_mine');
};

module.exports = utils;
