import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedScreen: 0,
    accountBalance: '',
};

export const appSlice = createSlice({
    name: 'appSlice',
    initialState,
    reducers: {
        changeScreen: (state, { payload }) => {
            state.selectedScreen = payload;
        },
        setAccountBalance: (state, { payload }) => {
            state.accountBalance = payload;
        },
    },
});

export const { changeScreen, setAccountBalance } = appSlice.actions;

export default appSlice.reducer;
