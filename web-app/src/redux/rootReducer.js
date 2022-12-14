import { combineReducers } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';

const rootReducer = combineReducers({
    app: appReducer,
});

export default rootReducer;
