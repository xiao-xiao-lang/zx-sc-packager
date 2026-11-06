import {writable} from 'svelte/store';

const MAX_LINES = 300;

export const logs = writable([]);

export const addLog = (text) => {
  const time = new Date().toLocaleTimeString();
  logs.update((items) => {
    const next = items.concat([`[${time}] ${text}`]);
    if (next.length > MAX_LINES) {
      next.splice(0, next.length - MAX_LINES);
    }
    return next;
  });
};

export const clearLogs = () => logs.set([]);
