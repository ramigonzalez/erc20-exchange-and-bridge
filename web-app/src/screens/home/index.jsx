import React from 'react';

import Header from 'components/Header';

import './styles.css';
import MetamaskConnection from 'components/MetamaskConnection';

const Home = () => (
    <div className="home-main-container">
        <Header selected="" />
        <h1 className="home-title">HOME</h1>
        <div className="home-container">
            <div className="home-text-container">
                <MetamaskConnection />
            </div>
        </div>
    </div>
);

export default Home;
