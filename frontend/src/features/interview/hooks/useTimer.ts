import { useState, useEffect } from 'react';

/**
 * Custom hook for managing interview timer
 * @param isActive - Whether the interview is currently active
 * @returns timeRemaining - Seconds remaining in the interview, or null if inactive
 */
export function useTimer(isActive: boolean): number | null {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (!isActive) {
            setTimeRemaining(null);
            return;
        }

        // Use 45 minutes as total allocated time
        const totalDurationMs = 45 * 60 * 1000;
        const startTime = Date.now();
        const endTime = startTime + totalDurationMs;

        const timer = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeRemaining(remaining);
        }, 1000);

        return () => {
            clearInterval(timer);
            setTimeRemaining(null);
        };
    }, [isActive]);

    return timeRemaining;
}
