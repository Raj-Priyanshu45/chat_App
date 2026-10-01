import { useEffect, useState } from 'react';
import { lookupBriefsApi } from '../services/UserService.js';

const cache = new Map();      // id -> imageUri | null
const pending = new Set();
const listeners = new Set();
let timer = null;

const flush = async () => {
    timer = null;
    const ids = [...pending];
    pending.clear();
    if (!ids.length) return;

    try {
        const map = await lookupBriefsApi(ids);
        ids.forEach((id) => cache.set(id, map?.[id]?.imageUri || null));
        listeners.forEach((notify) => notify());
    } catch {
        // leave uncached; initials are shown instead
    }
};

// Call after the user changes their own picture.
export const primeAvatar = (id, url) => {
    if (!id) return;
    cache.set(id, url || null);
    listeners.forEach((notify) => notify());
};

export const useAvatars = (ids) => {
    const [, setTick] = useState(0);
    const key = [...new Set(ids || [])].join('|');

    useEffect(() => {
        const notify = () => setTick((n) => n + 1);
        listeners.add(notify);
        return () => listeners.delete(notify);
    }, []);

    useEffect(() => {
        let queued = false;
        key.split('|').forEach((id) => {
            if (id && !cache.has(id)) {
                pending.add(id);
                queued = true;
            }
        });
        if (queued && !timer) timer = setTimeout(flush, 30);
    }, [key]);

    return (id) => (id ? cache.get(id) || null : null);
};