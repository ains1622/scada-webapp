import { atom } from 'recoil';

export const opalDataState = atom({
  key: 'opalDataState',
  default: [],
});

export const opalLastUpdateState = atom({
  key: 'opalLastUpdateState',
  default: null,
});

export const opalAutoRefreshState = atom({
  key: 'opalAutoRefreshState',
  default: false,
});

export default {
  opalDataState,
  opalLastUpdateState,
  opalAutoRefreshState
};
