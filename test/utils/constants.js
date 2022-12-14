const constants = {};

constants.contracts = {
    EXCHANGE: 'Exchange',
    TOKEN_ETHEREUM: 'ERC20_Ethereum',
    TOKEN_POLYGON: 'ERC20_Polygon',
    BRIDGE_ETHEREUM: 'Bridge_Ethereum',
    BRIDGE_POLYGON: 'Bridge_Polygon',
};

constants.defaultTokenEthereum = {
    name: 'ERC20_Ethereum',
    symbol: 'TETH',
    decimals: 18,
    maxSupply: ethers.utils.parseEther('1000000'),
};

constants.defaultTokenPolygon = {
    name: 'ERC20_Polygon',
    symbol: 'TPOL',
    decimals: 18,
};

module.exports = constants;
