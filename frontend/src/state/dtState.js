import { atom } from 'recoil';

export const dtDataState = atom({
    key: 'dtDataState',
    default: [],
});

export const dtLastUpdateState = atom({
    key: 'dtLastUpdateState',
    default: null,
});

export const dtAutoRefreshState = atom({
    key: 'dtAutoRefreshState',
    default: false,
});

export default {
    dtDataState,
    dtLastUpdateState,
    dtAutoRefreshState
};
