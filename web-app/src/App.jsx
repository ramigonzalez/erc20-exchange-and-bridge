import { Provider } from 'react-redux';
import { store } from 'redux/store';
import React, { useEffect, useState } from 'react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Loading from 'components/Loading';
import Particles from 'components/Particles';
import Home from 'screens/home';
import Bridge from 'screens/bridge';
import Exchange from 'screens/exchange';
import NotFoundRoute from 'screens/not-found';

const createElement = (element, loading) => (
    <div className="main-container">
        <Particles />
        {element}
        {loading && <Loading />}
    </div>
);

function App() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <Provider store={store}>
            <BrowserRouter>
                <Routes>
                    <Route path="/">
                        <Route index element={createElement(<Home />, loading)} />
                        <Route exact path="/bridge" element={createElement(<Bridge />, loading)} />
                        <Route exact path="/exchange" element={createElement(<Exchange />, loading)} />
                    </Route>
                    <Route path="*" element={createElement(<NotFoundRoute />, loading)} />
                </Routes>
            </BrowserRouter>
        </Provider>
    );
}

export default App;
