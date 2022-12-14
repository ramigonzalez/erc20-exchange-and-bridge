import { useState } from 'react';

import './styles.css';

const MetamaskConnection = () => {
    const [accountAddress, setAccountAddress] = useState();
    const [accountBalance, setAccountBalance] = useState();

    const web3 = new window.Web3(window.ethereum);

    const connectToMetamask = async () => {
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccountAddress(window.ethereum.selectedAddress);
        } else {
            alert('Install metamask extension!! You can download it from here: https://metamask.io/');
        }
    };

    const getBalance = async () => {
        setAccountBalance(web3.utils.fromWei(await web3.eth.getBalance(window.ethereum.selectedAddress), 'ether'));
    };

    return (
        <div>
            <button className="metamaskButton" onClick={connectToMetamask}>
                Connect to Metamask
            </button>
            <h3 style={{ color: 'white' }}>Connected Account: {accountAddress}</h3>
            <button className="metamaskButton" onClick={getBalance} disabled={!accountAddress}>
                Get Balance
            </button>
            <h3 style={{ color: 'white' }}>Balance: {accountBalance}</h3>
        </div>
    );
};

export default MetamaskConnection;
