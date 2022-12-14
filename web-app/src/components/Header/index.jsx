import React from 'react';
import HeaderOption from './HeaderOption';
import './styles.css';

const Header = ({ selected }) => (
    <nav className="header-container">
        <HeaderOption selected={selected} name="" displayName="HOME" />
        <HeaderOption selected={selected} name="exchange" displayName="EXCHANGE" />
        <HeaderOption selected={selected} name="bridge" displayName="BRIDGE" />
    </nav>
);

export default Header;
