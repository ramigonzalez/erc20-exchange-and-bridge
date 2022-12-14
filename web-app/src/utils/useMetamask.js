import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAccountBalance } from 'redux/slices/appSlice';

const useMetamask = () => {
    const dispatch = useDispatch();

    const connectToMetamask = useCallback(async () => {
        if (window.ethereum) {
            const web3 = new window.Web3(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            dispatch(setAccountBalance(web3.utils.fromWei(await web3.eth.getBalance(window.ethereum.selectedAddress), 'ether')));
        } else {
            alert('Install metamask extension!! You can download it from here: https://metamask.io/');
        }
    }, [dispatch]);

    useEffect(() => {
        connectToMetamask();
    }, [connectToMetamask]);
};

export default useMetamask;
