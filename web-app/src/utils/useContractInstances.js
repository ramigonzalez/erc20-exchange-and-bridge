/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { bridgeEthereumABI, bridgePolygonABI, exchangeABI, tokenEthereumABI, tokenPolygonABI } from 'utils/constants';

const useContractsInstances = () => {
    const web3 = new window.Web3(window.ethereum);
    const [contractsInstances, setContractsInstances] = useState({});

    useEffect(() => {
        setContractsInstances({
            tokenEthereumInstance: new web3.eth.Contract(tokenEthereumABI, process.env.REACT_APP_ERC20_ETHEREUM_ADDRESS),
            tokenPolygonInstance: new web3.eth.Contract(tokenPolygonABI, process.env.REACT_APP_ERC20_POLYGON_ADDRESS),
            exchangeInstance: new web3.eth.Contract(exchangeABI, process.env.REACT_APP_EXCHANGE_ADDRESS),
            bridgeEthereumInstance: new web3.eth.Contract(bridgeEthereumABI, process.env.REACT_APP_BRIDGE_ETHEREUM_ADDRESS),
            bridgePolygonInstance: new web3.eth.Contract(bridgePolygonABI, process.env.REACT_APP_BRIDGE_POLYGON_ADDRESS),
        });
    }, []);

    return contractsInstances;
};

export default useContractsInstances;
