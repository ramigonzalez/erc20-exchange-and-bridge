const { ethers } = require('hardhat');
const chai = require('chai');
const { solidity, deployMockContract } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;

const constants = require('./utils/constants');
const { getContractAbi, preCalculateFutureContractAddress } = require('./utils');

let signer;

describe('Calculate future contract address', async () => {
    before(async () => {
        console.log('------------------------------------------------------------------------------------');
        console.log('------------------------', 'Precalculate Contract address Test Start', '-------------------');
        console.log('------------------------------------------------------------------------------------');

        [signer] = await ethers.getSigners();
    });
    it('Precalculated address must be equals to contract deployed on following TX ', async () => {
        const futureTxs = 0; // contract will be created on next TX
        const preCalculatedContractAddress = await preCalculateFutureContractAddress(signer, futureTxs);
        _dummyContract = await deployMockContract(signer, getContractAbi(constants.contracts.TOKEN_ETHEREUM));
        expect(_dummyContract.address).to.be.equal(preCalculatedContractAddress);
    });
    it('Precalculated address must be equals to contract deployed after `_dummyContract` TX', async () => {
        const preCalculatedContractAddress = await preCalculateFutureContractAddress(signer, 1);
        _dummyContract = await deployMockContract(signer, getContractAbi(constants.contracts.TOKEN_ETHEREUM));
        _otherContract = await deployMockContract(signer, getContractAbi(constants.contracts.TOKEN_ETHEREUM));
        expect(_otherContract.address).to.be.equal(preCalculatedContractAddress);
    });
});
