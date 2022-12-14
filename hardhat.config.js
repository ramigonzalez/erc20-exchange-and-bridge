require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('solidity-coverage');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: '0.8.16',
    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts',
    },
    networks: {
        ganache: {
            chainId: 1337,
            url: process.env.GANACHE_ACCESSPOINT_URL,
            from: process.env.GANACHE_OWNER_ACCOUNT,
            accounts: [process.env.GANACHE_OWNER_PRIVATE_KEY, process.env.GANACHE_TOKEN_VAULT_PRIVATE_KEY],
        },
        goerli: {
            chainId: 5,
            timeout: 20000,
            gasPrice: 8000000000,
            gas: 'auto',
            name: 'Goerli',
            url: process.env.GOERLI_ACCESSPOINT_URL,
            from: process.env.GOERLI_OWNER_ACCOUNT,
            accounts: [process.env.GOERLI_OWNER_PRIVATE_KEY],
        },
        mumbai: {
            chainId: 80001,
            timeout: 20000,
            gasPrice: 8000000000,
            gas: 'auto',
            name: 'Mumbai',
            url: process.env.MUMBAI_ACCESSPOINT_URL,
            from: process.env.MUMBAI_OWNER_ACCOUNT,
            accounts: [process.env.MUMBAI_OWNER_PRIVATE_KEY],
        },
        hardhat: {
            chainId: 31337,
            gasPrice: 'auto',
            gas: 'auto',
            value: 10000,
        },
    },
};
