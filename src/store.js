// A tiny external store around the mutable engine state, plus local save/load.
import { useSyncExternalStore } from 'react';
import { dispatch as engineDispatch } from './engine/game.js';

const SAVE_KEY = 'mandate:save:v1';
let state = null;
let version = 0;
const listeners = new Set();
const bump = () => {
  version++;
  for (const l of listeners) l();
};

export const store = {
  get: () => state,
  set(s) {
    state = s;
    bump();
    save();
  },
  clear() {
    state = null;
    bump();
  },
  dispatch(action) {
    if (!state) return { ok: false };
    const r = engineDispatch(state, action);
    bump();
    save();
    return r;
  },
  touch: bump,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  version: () => version,
};

export function useGame() {
  useSyncExternalStore(store.subscribe, store.version);
  return state;
}
export function useVersion() {
  return useSyncExternalStore(store.subscribe, store.version);
}

function save() {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the game still runs, it just won't persist */
  }
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && !s.over ? { country: s.countryId, turn: s.turn, name: s.player?.name } : null;
  } catch {
    return null;
  }
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) store.set(s);
    return !!s;
  } catch {
    return false;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportSave() {
  if (!state) return;
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mandate-${state.countryId}-${state.turn}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
