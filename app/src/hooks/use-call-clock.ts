import { useCallback, useEffect, useRef, useState } from "react";

// Wall-clock timer for a call that excludes paused time, so transcript timestamps line up with the recording.
export const useCallClock = () => {
    const startedAtRef = useRef<number | null>(null);
    const pausedAtRef = useRef<number | null>(null);
    const pausedTotalRef = useRef(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [running, setRunning] = useState(false);

    const now = useCallback(() => {
        if (startedAtRef.current === null) return 0;
        const end = pausedAtRef.current ?? Date.now();
        return Math.max(0, end - startedAtRef.current - pausedTotalRef.current);
    }, []);

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setElapsedMs(now()), 500);
        return () => window.clearInterval(timer);
    }, [now, running]);

    const start = useCallback(() => {
        if (startedAtRef.current !== null) return;
        startedAtRef.current = Date.now();
        setRunning(true);
    }, []);

    const pause = useCallback(() => {
        if (pausedAtRef.current === null) pausedAtRef.current = Date.now();
    }, []);

    const resume = useCallback(() => {
        if (pausedAtRef.current !== null) {
            pausedTotalRef.current += Date.now() - pausedAtRef.current;
            pausedAtRef.current = null;
        }
    }, []);

    const stop = useCallback(() => {
        setElapsedMs(now());
        setRunning(false);
    }, [now]);

    return { now, elapsedMs, start, pause, resume, stop };
};
