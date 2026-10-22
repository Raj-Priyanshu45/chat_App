import { useCallback, useEffect, useRef } from 'react';
import { markRoomReadApi } from '../services/RoomService';
import { toEpoch } from '../config/helper';

const DEBOUNCE_MS = 500;

export const useReadTracking = ({
                                    roomId,
                                    scrollRef,
                                    messageCount,
                                    onReadPointerAdvanced,
                                }) => {
    const roomRef = useRef(roomId);
    const onReadPointerAdvancedRef = useRef(onReadPointerAdvanced);

    useEffect(() => {
        onReadPointerAdvancedRef.current = onReadPointerAdvanced;
    }, [onReadPointerAdvanced]);
    const readyRef = useRef(false);
    const pointerRef = useRef({ id: null, ts: 0 });
    const pendingRef = useRef(null);
    const timerRef = useRef(null);
    const observerRef = useRef(null);

    const flush = useCallback(async (force = false) => {
        clearTimeout(timerRef.current);
        timerRef.current = null;

        const candidate = pendingRef.current;
        if (!candidate || !readyRef.current) return;
        if (!force && document.visibilityState !== 'visible') return;

        pendingRef.current = null;
        if (candidate.ts <= pointerRef.current.ts) return;

        const room = roomRef.current;
        const previous = pointerRef.current;
        pointerRef.current = candidate;

        try {
            const response = await markRoomReadApi(room, candidate.id);
            if (roomRef.current !== room) return;

            const serverTs = toEpoch(response?.lastReadMessageTime);
            if (serverTs > pointerRef.current.ts) {
                pointerRef.current = {
                    id: response.lastReadMessageId || candidate.id,
                    ts: serverTs,
                };
            }

            // Re-fetch unread count only after the read update succeeds.
            // ChatPage moves or removes the "N new messages" divider accordingly.
            onReadPointerAdvancedRef.current?.(candidate);
        } catch {
            // Restore and retain the candidate so a later visibility change can retry it.
            if (roomRef.current === room && pointerRef.current.id === candidate.id) {
                pointerRef.current = previous;
                pendingRef.current = candidate;
            }
        }
    }, []);

    // Reset local tracking when the active room changes; flush the old room on cleanup.
    useEffect(() => {
        roomRef.current = roomId;
        readyRef.current = false;
        pendingRef.current = null;
        pointerRef.current = { id: null, ts: 0 };
        clearTimeout(timerRef.current);

        return () => {
            void flush(true);
        };
    }, [roomId, flush]);

    // Observe the actual message scroll container, not the page viewport.
    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return undefined;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (!readyRef.current || document.visibilityState !== 'visible') return;

                let found = false;
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;

                    const messageId = entry.target.dataset.mid;
                    const timestamp = Number(entry.target.dataset.ts);
                    if (!messageId || !timestamp || timestamp <= pointerRef.current.ts) continue;

                    if (!pendingRef.current || timestamp > pendingRef.current.ts) {
                        pendingRef.current = { id: messageId, ts: timestamp };
                        found = true;
                    }
                }

                if (found) {
                    clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        void flush();
                    }, DEBOUNCE_MS);
                }
            },
            { root, threshold: 0.5 }
        );

        return () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
    }, [scrollRef, flush]);

    const observeMessages = useCallback(() => {
        const observer = observerRef.current;
        const root = scrollRef.current;
        if (!observer || !root) return;

        root.querySelectorAll('[data-mid]').forEach((element) => observer.observe(element));
    }, [scrollRef]);

    useEffect(() => {
        observeMessages();
    }, [messageCount, observeMessages]);

    const rescan = useCallback(() => {
        const observer = observerRef.current;
        if (!observer) return;
        observer.disconnect();
        observeMessages();
    }, [observeMessages]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                void flush(true);
            } else {
                rescan();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [flush, rescan]);

    // Call after history and unread count are loaded and the initial scroll is positioned.
    const markReady = useCallback((baseline) => {
        pointerRef.current = baseline
            ? { id: baseline.id, ts: toEpoch(baseline.timeStamp) }
            : { id: null, ts: 0 };
        readyRef.current = true;
        rescan();
    }, [rescan]);

    // Sender-side read pointer is advanced by the backend when a message is sent.
    const noteOwnMessage = useCallback((message) => {
        const timestamp = toEpoch(message?.timeStamp);
        if (timestamp > pointerRef.current.ts) {
            pointerRef.current = { id: message.id || null, ts: timestamp };
        }
    }, []);

    const isReady = useCallback(() => readyRef.current, []);

    return { markReady, noteOwnMessage, isReady, flushReadPointer: flush };
};