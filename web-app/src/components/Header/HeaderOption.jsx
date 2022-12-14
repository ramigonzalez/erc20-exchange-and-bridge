import React from 'react';

const HeaderOption = ({ selected, name, displayName }) => (
    <a href={`/${name === 'home' ? '' : name}`} className={`header-option ${selected === name ? 'header-selected' : ''}`}>
        <p>{`<${displayName}/>`}</p>
    </a>
);

export default HeaderOption;
