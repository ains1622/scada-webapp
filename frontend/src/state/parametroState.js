import { atomFamily, selectorFamily } from 'recoil';

// Atom that stores data array per parametro key
export const paramDataState = atomFamily({
  key: 'paramDataState',
  default: [],
});

// Atom for alert thresholds per parametro
export const alertThresholdsState = atomFamily({
  key: 'alertThresholdsState',
  default: null,
});

// Atom for lastUpdate per parametro
export const lastUpdateState = atomFamily({
  key: 'lastUpdateState',
  default: null,
});

// Atom for autoRefresh toggle per parametro
export const autoRefreshState = atomFamily({
  key: 'autoRefreshState',
  default: false,
});

// SelectorFamily: filtered data by start/end, agg. This selector assumes rows are already normalized.
export const filteredDataSelector = selectorFamily({
  key: 'filteredDataSelector',
  get: ({ parametro, start, end }) => ({ get }) => {
    const data = get(paramDataState(parametro));
    if (!data || !data.length) return [];
    if (!start && !end) return data;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return data.filter(item => {
      const t = new Date(item.timestamp);
      if (s && t < s) return false;
      if (e && t > e) return false;
      return true;
    });
  }
});

export default {
  paramDataState,
  alertThresholdsState,
  lastUpdateState,
  autoRefreshState,
  filteredDataSelector
};
