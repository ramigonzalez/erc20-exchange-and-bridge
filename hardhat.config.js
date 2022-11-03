require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.9",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    /*ganache: {
      chainId: 1337,
      url: process.env.GANACHE_ACCESSPOINT_URL,
      from: process.env.GANACHE_ACCOUNT,
      accounts: [process.env.GANACHE_PRIVATE_KEY]
    },

    goerli: {
        chainId:  4,
        timeout:  20000,
        gasPrice: 8000000000,
        gas:      "auto",
        name:     "Goerli",		
        url:      process.env.GOERLI_ACCESSPOINT_URL,
        from:     process.env.GOERLI_ACCOUNT,
        accounts: [process.env.GOERLI_PRIVATE_KEY]
	  }*/
  }
};
