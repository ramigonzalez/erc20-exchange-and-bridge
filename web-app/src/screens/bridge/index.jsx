/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';

import Header from 'components/Header';
import useContractsInstances from 'utils/useContractInstances';
import useMetamask from 'utils/useMetamask';
import { bridgeEthereumABI, bridgePolygonABI } from 'utils/constants';
import { Swap } from 'assets';

import './styles.css';

const Bridge = () => {
    const [value, setValue] = useState(0);
    const [balances, setBalances] = useState({
        tokenEthereumBalance: 0,
        tokenPolygonBalance: 0,
    });
    const [transferDirectionEthPol, setTransferDirectionEthPol] = useState(true);

    const web3 = new window.Web3(window.ethereum);

    const { tokenEthereumInstance, tokenPolygonInstance, bridgeEthereumInstance, bridgePolygonInstance } = useContractsInstances();
    useMetamask();

    const fetchData = async () => {
        const tokenEthereumBalance = await tokenEthereumInstance.methods.balanceOf(window.ethereum.selectedAddress).call();
        const tokenPolygonBalance = await tokenPolygonInstance.methods.balanceOf(window.ethereum.selectedAddress).call();
        setBalances({ tokenEthereumBalance, tokenPolygonBalance });
    };

    useEffect(() => {
        if (tokenEthereumInstance && tokenPolygonInstance && window.ethereum.selectedAddress) {
            fetchData();
        }
    }, [tokenEthereumInstance, tokenPolygonInstance, window.ethereum.selectedAddress]);

    const manageConvert = () => {
        if (transferDirectionEthPol) {
            transferFromEthToPol();
        } else {
            transferFromPolToEth();
        }
    };

    const transferFromEthToPol = async () => {
        // 1. approve tokenAmount
        try {
            await tokenEthereumInstance.methods.approve(bridgeEthereumInstance._address, web3.utils.toWei(value, 'ether')).send({
                from: window.ethereum.selectedAddress,
            });
        } catch (e) {
            console.error(e);
        }
        // 2. ethereum.transferToPolygon awaitear
        await bridgeEthereumInstance.methods.transferToPolygon(web3.utils.toWei(value, 'ether')).send({
            from: window.ethereum.selectedAddress,
        });
        // 3. polygon.mintTo
        const selectedAddress = window.ethereum.selectedAddress;

        const account = web3.eth.accounts.privateKeyToAccount('0x' + process.env.REACT_APP_PROTOCOL_OWNER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        const bridgePolygonInstanceFromProtocolOwner = new web3.eth.Contract(bridgePolygonABI, process.env.REACT_APP_BRIDGE_POLYGON_ADDRESS);

        const gasPrice = await web3.eth.getGasPrice();
        const gasEstimate = await bridgePolygonInstanceFromProtocolOwner.methods
            .mintTo(selectedAddress, web3.utils.toWei(value, 'ether'))
            .estimateGas({ from: web3.eth.defaultAccount });
        await bridgePolygonInstanceFromProtocolOwner.methods.mintTo(selectedAddress, web3.utils.toWei(value, 'ether')).send({
            from: web3.eth.defaultAccount,
            gasPrice,
            gas: gasEstimate,
        });

        setValue(0);
        fetchData();
    };

    const transferFromPolToEth = async () => {
        // 1. approve tokenAmount
        try {
            await tokenPolygonInstance.methods.approve(bridgePolygonInstance._address, web3.utils.toWei(value, 'ether')).send({
                from: window.ethereum.selectedAddress,
            });
        } catch (e) {
            console.error(e);
        }
        // 2. polygon.transferToEthereum awaitear
        await bridgePolygonInstance.methods.transferToEthereum(web3.utils.toWei(value, 'ether')).send({
            from: window.ethereum.selectedAddress,
        });
        // 3. ethereum.unStake
        const selectedAddress = window.ethereum.selectedAddress;

        const protocolOwnerPrivateKey = 'e3ee865589d9f96b5dd41c25c019ae69bed86a66877b2f7c7dec88e4f5802fa2';
        const account = web3.eth.accounts.privateKeyToAccount('0x' + protocolOwnerPrivateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        const bridgeEthereumInstanceFromProtocolOwner = new web3.eth.Contract(bridgeEthereumABI, process.env.REACT_APP_BRIDGE_ETHEREUM_ADDRESS);

        const gasPrice = await web3.eth.getGasPrice();
        const gasEstimate = await bridgeEthereumInstanceFromProtocolOwner.methods
            .unStake(selectedAddress, web3.utils.toWei(value, 'ether'))
            .estimateGas({ from: web3.eth.defaultAccount });
        await bridgeEthereumInstanceFromProtocolOwner.methods.unStake(selectedAddress, web3.utils.toWei(value, 'ether')).send({
            from: web3.eth.defaultAccount,
            gasPrice,
            gas: gasEstimate,
        });

        setValue(0);
        fetchData();
    };

    return (
        <div className="bridge-container">
            <Header selected="bridge" />
            <h1 className="bridge-title">BRIDGE</h1>
            <div className="bridge-conversion-container">
                <div className="conversion-title-container">
                    <h2>Conversion</h2>
                    <img src={Swap} alt="switch tokens" className="swap-image" onClick={() => setTransferDirectionEthPol(!transferDirectionEthPol)} />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: transferDirectionEthPol ? 'column' : 'column-reverse',
                    }}
                >
                    <div>
                        <label>TETH:</label>
                        <input value={value} onChange={(e) => setValue(e.target.value)} />
                        <p className="balance">Saldo: {web3.utils.fromWei(`${balances.tokenEthereumBalance}`, 'ether')}</p>
                    </div>
                    <div>
                        <label>TPOL:</label>
                        <input value={value} onChange={(e) => setValue(e.target.value)} />
                        <p className="balance">Saldo: {web3.utils.fromWei(`${balances.tokenPolygonBalance}`, 'ether')}</p>
                    </div>
                </div>

                <p>1 TETH = 1 TPOL</p>

                <button onClick={manageConvert} className="conversion-button">
                    Convertir
                </button>
            </div>
        </div>
    );
};

export default Bridge;
