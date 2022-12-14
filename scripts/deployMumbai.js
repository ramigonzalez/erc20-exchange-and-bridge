const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

const ERC20_Polygon = {
    name: 'ERC20_Polygon',
    symbol: 'TPOL',
};

const getContractInfo = async (index, signer) => {
    const contractToDeploy = contractsToDeploy[index];
    const contractPath = 'contracts/' + contractToDeploy + '.sol:' + contractToDeploy;
    const contractFactory = await ethers.getContractFactory(contractPath, signer);
    return { contractFactory };
};

// Contracts to deploy
const contractsToDeploy = ['ERC20_Polygon', 'Bridge_Polygon'];
const variablesToDeploy = [[ERC20_Polygon.name, ERC20_Polygon.symbol], []];

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
            variablesToDeploy[1] = [deployedContract.address];
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
