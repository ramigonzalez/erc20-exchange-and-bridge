/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';

import Header from 'components/Header';
import useContractsInstances from 'utils/useContractInstances';
import useMetamask from 'utils/useMetamask';
import { tokenEthereumABI } from 'utils/constants';
import { Swap } from 'assets';

import './styles.css';

const Exchange = () => {
    const [ethValue, setEthValue] = useState(0);
    const [tokValue, setTokValue] = useState(0);
    const [tokBalance, setTokBalance] = useState(0);
    const [accountBalance, setAccountBalance] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [transferDirectionEthTok, setTransferDirectionEthTok] = useState(true);

    const web3 = new window.Web3(window.ethereum);

    const manageValue = (e) => {
        const newNumber = Number(e.target.value);
        if (!transferDirectionEthTok || newNumber < accountBalance) {
            setEthValue(newNumber);
            setTokValue(web3.utils.BN(newNumber).mul(web3.utils.BN(exchangeRate)).toString());
        }
    };

    const { tokenEthereumInstance, exchangeInstance } = useContractsInstances();
    useMetamask();

    const fetchData = useCallback(async () => {
        // 1. get balance of the selected address
        setAccountBalance(Number(web3.utils.fromWei(await web3.eth.getBalance(window.ethereum.selectedAddress), 'ether')));

        // 2. get token balance of the selected address
        const balance = Number(web3.utils.fromWei(await tokenEthereumInstance.methods.balanceOf(window.ethereum.selectedAddress).call(), 'ether'));
        console.log({ balance });
        setTokBalance(balance);

        // 3. get exchange rate
        const rate = await exchangeInstance.methods.getExchangeRate().call();
        console.log({ rate });
        setExchangeRate(rate);
    }, [tokenEthereumInstance, exchangeInstance]);

    const buyTokens = async () => {
        // Approve exchange to transfer from tokenVault to account address
        const selectedAddress = window.ethereum.selectedAddress;

        const tokenVaultPrivateKey = process.env.REACT_APP_TOKEN_VAULT_PRIVATE_KEY;
        const account = web3.eth.accounts.privateKeyToAccount('0x' + tokenVaultPrivateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        const tokenEthereumFromTokenVault = new web3.eth.Contract(tokenEthereumABI, process.env.REACT_APP_ERC20_ETHEREUM_ADDRESS);

        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasEstimate = await tokenEthereumFromTokenVault.methods.approve(exchangeInstance._address, `${tokValue}`).estimateGas({ from: web3.eth.defaultAccount });
            await tokenEthereumFromTokenVault.methods.approve(exchangeInstance._address, `${tokValue}`).send({
                from: web3.eth.defaultAccount,
                gasPrice,
                gas: gasEstimate,
            });
        } catch (e) {
            console.error(e);
        }

        // Return to selectedWallet
        web3.eth.defaultAccount = selectedAddress;

        // Buy Tokens
        await exchangeInstance.methods.buyToken(`${tokValue}`).send({
            from: window.ethereum.selectedAddress,
            value: web3.utils.toWei(`${ethValue}`, 'ether'),
        });
        setTokValue(0);
        setEthValue(0);
        fetchData();
    };

    const buyEthers = async () => {
        // Approve tokens
        try {
            await tokenEthereumInstance.methods.approve(exchangeInstance._address, `${tokValue}`).send({
                from: window.ethereum.selectedAddress,
            });
        } catch (e) {
            console.error(e);
        }

        // Buy Ethers
        await exchangeInstance.methods.buyEther(`${tokValue}`).send({
            from: window.ethereum.selectedAddress,
        });
        setTokValue(0);
        setEthValue(0);
        fetchData();
    };

    const manageTransaction = () => {
        if (transferDirectionEthTok) {
            buyTokens();
        } else {
            buyEthers();
        }
    };

    useEffect(() => {
        if (tokenEthereumInstance && exchangeInstance && window.ethereum.selectedAddress) {
            fetchData();
        }
    }, [tokenEthereumInstance, exchangeInstance, window.ethereum.selectedAddress]);

    return (
        <div className="exchange-container">
            <Header selected="exchange" />
            <h1 className="exchange-title">EXCHANGE</h1>
            <div className="exchange-conversion-container">
                <div className="conversion-title-container">
                    <h2>Exchange</h2>
                    <img src={Swap} alt="switch tokens" className="swap-image" onClick={() => setTransferDirectionEthTok(!transferDirectionEthTok)} />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: transferDirectionEthTok ? 'column' : 'column-reverse',
                    }}
                >
                    <div>
                        <label>{transferDirectionEthTok ? 'From ' : 'To '} Ethers:</label>
                        <input value={ethValue} onChange={manageValue} disabled={!exchangeRate} />
                        <p className="balance">Saldo: {accountBalance}</p>
                    </div>
                    <div>
                        <label>{transferDirectionEthTok ? 'To ' : 'From '}TETH:</label>
                        <input value={Number(web3.utils.fromWei(`${tokValue}`, 'ether'))} onChange={manageValue} disabled={true} />
                        <p className="balance">Saldo: {tokBalance}</p>
                    </div>
                </div>

                <p style={{ marginTop: 20 }}>1 Ether = {Number(web3.utils.fromWei(`${exchangeRate}`, 'ether'))} TETH</p>

                <button onClick={manageTransaction} className="conversion-button" disabled={!exchangeRate}>
                    {transferDirectionEthTok ? 'Buy TETH' : 'Buy Ethers'}
                </button>
            </div>
        </div>
    );
};

export default Exchange;
