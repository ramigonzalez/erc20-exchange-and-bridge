import bridgeEthereum from '../artifacts/contracts/Bridge_Ethereum.sol/Bridge_Ethereum.json';
import bridgePolygon from '../artifacts/contracts/Bridge_Polygon.sol/Bridge_Polygon.json';
import exchange from '../artifacts/contracts/Exchange.sol/Exchange.json';
import tokenEthereum from '../artifacts/contracts/ERC20_Ethereum.sol/ERC20_Ethereum.json';
import tokenPolygon from '../artifacts/contracts/ERC20_Polygon.sol/ERC20_Polygon.json';

export const tokenEthereumABI = tokenEthereum.abi;
export const tokenPolygonABI = tokenPolygon.abi;
export const exchangeABI = exchange.abi;
export const bridgeEthereumABI = bridgeEthereum.abi;
export const bridgePolygonABI = bridgePolygon.abi;
