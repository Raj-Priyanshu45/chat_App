import { useEffect, useState } from 'react';
import { lookupUsernamesApi } from '../services/UserService.js';

// The backend identifies everybody by id (message.sender, room members, friends...).
// This hook turns ids into usernames: it batches lookups, caches results, and
// re-renders the caller when names arrive.

const cache = new Map();
const pending = new Set();
const listeners = new Set();
let timer = null;

const flush = async () => {
    timer = null;
    const ids = [...pending];
    pending.clear();
    if (ids.length === 0) return;

    try {
        const map = await lookupUsernamesApi(ids);
        ids.forEach((id) => cache.set(id, map?.[id] || id));
        listeners.forEach((notify) => notify());
    } catch {
        // leave uncached; the UI keeps showing the placeholder
    }
};

// Lets AuthContext seed the cache with the logged-in user's own name.
export const primeUsername = (id, username) => {
    if (id && username) cache.set(id, username);
};

export const useUsernames = (ids) => {
    const [, setTick] = useState(0);
    const key = (ids || []).join('|');

    useEffect(() => {
        const notify = () => setTick((n) => n + 1);
        listeners.add(notify);
        return () => {
            listeners.delete(notify);
        };
    }, []);

    useEffect(() => {
        let queued = false;
        (ids || []).forEach((id) => {
            if (id && !cache.has(id)) {
                pending.add(id);
                queued = true;
            }
        });
        if (queued && !timer) timer = setTimeout(flush, 30);
    }, [key]);

    return (id) => (id ? cache.get(id) || '…' : '');
};