const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const { getContractAddress } = require('@ethersproject/address');
require('dotenv').config();

const ERC20_Ethereum = {
    name: 'ERC20_Ethereum',
    symbol: 'TETH',
    maxSupply: ethers.utils.parseEther('1000000'),
};

const getContractInfo = async (index, signer) => {
    const contractToDeploy = contractsToDeploy[index];
    const contractPath = 'contracts/' + contractToDeploy + '.sol:' + contractToDeploy;
    const contractFactory = await ethers.getContractFactory(contractPath, signer);
    return { contractFactory };
};

const preCalculateFutureContractAddress = async (signer, txnsAhead = 0) => {
    const transactionCount = await signer.getTransactionCount();
    return getContractAddress({
        from: signer.address,
        nonce: transactionCount + txnsAhead,
    });
};

// Contracts to deploy
const contractsToDeploy = ['ERC20_Ethereum', 'Exchange', 'Bridge_Ethereum'];
const variablesToDeploy = [[ERC20_Ethereum.name, ERC20_Ethereum.symbol, ERC20_Ethereum.maxSupply], [ethers.utils.parseEther('50')], []];

async function main() {
    // Get provider
    const provider = ethers.provider;

    // Get signer
    const [signer] = await ethers.getSigners();

    let deployedContracts = [];
    // Get Contracts to deploy
    for (let i = 0; i < contractsToDeploy.length; i++) {
        const { contractFactory } = await getContractInfo(i, signer);

        console.log('---> Deploying:', contractsToDeploy[i]);

        const deployedContract = await contractFactory.deploy(...variablesToDeploy[i]);

        if (i === 0) {
            const tokensToTransfer = variablesToDeploy[1][0];
            // 1. Precalculate Exchange future address for a contract that will be deployed 2 TXs ahead
            const txnsAhead = 3;
            const exchangeContractFutureAddress = await preCalculateFutureContractAddress(signer, txnsAhead);

            // 2. [TX #1] Approve certain value for exchange be able to transfer founds while is being deployed
            const approveTx = await deployedContract.approve(exchangeContractFutureAddress, tokensToTransfer);
            await approveTx.wait();

            // 3. [TX #2] Make sure that tokenVault has a greater or equals token balance than `_tokenAmount`
            const transferTx = await deployedContract.transfer(process.env.GOERLI_TOKEN_VAULT_ACCOUNT, tokensToTransfer);
            await transferTx.wait();

            variablesToDeploy[1] = [process.env.GOERLI_TOKEN_VAULT_ACCOUNT, deployedContract.address, tokensToTransfer, { value: ethers.utils.parseEther('5') }];
            variablesToDeploy[2] = [deployedContract.address];
        }

        deployedContracts = [...deployedContracts, deployedContract];
    }

    for (let i = 0; i < deployedContracts.length; i++) {
        // Check transaction result. 1 it is the number of transaction to wait
        const deployedContract = deployedContracts[i];
        tx_hash = deployedContract.deployTransaction.hash;
        const confirmations_number = 1;
        tx_result = await provider.waitForTransaction(tx_hash, confirmations_number);
        if (tx_result.confirmations < 0 || tx_result === undefined) {
            throw new Error(contractToDeploy || 'Contract ERROR: Deploy transaction is undefined or has 0 confirmations.');
        }

        // Get contract read only instance
        const contractToDeploy = contractsToDeploy[i];
        const contractABIPath = path.resolve(process.cwd(), 'artifacts/contracts/', contractToDeploy) + '.sol/' + contractToDeploy + '.json';
        const contractArtifact = JSON.parse(fs.readFileSync(contractABIPath, 'utf8'));
        const deployedContractInstance = new ethers.Contract(deployedContract.address, contractArtifact.abi, provider);

        console.log('');
        console.log('---------------------------------------------------------------------------------------');
        console.log('-- Deployed contract:\t', contractToDeploy);
        console.log('-- Contract address:\t', deployedContractInstance.address);
        console.log('-- Signer address:\t', signer.address);
        console.log('-- Deploy successfully');
        console.log('---------------------------------------------------------------------------------------');
        console.log('');
    }
    const signerBalance = ethers.utils.formatEther(await signer.getBalance());
    console.log('');
    console.log('---------------------------------------------------------------------------------------');
    console.log('-- Signer address:\t', signer.address);
    console.log('-- Signer balance:\t', signerBalance);
    console.log('---------------------------------------------------------------------------------------');
    console.log('');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
