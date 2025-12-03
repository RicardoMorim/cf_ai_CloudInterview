import { useState, useEffect } from 'react';
import { InterviewQuestion } from '../../../types';

/**
 * Custom hook for managing progressive hint revelation
 * @param currentQuestion - The current interview question
 * @returns Hint state and controls
 */
export function useHints(currentQuestion: InterviewQuestion | null) {
    const [hintsRevealed, setHintsRevealed] = useState(0);

    // Reset hints when question changes
    useEffect(() => {
        setHintsRevealed(0);
    }, [currentQuestion?.questionId]);

    /**
     * Reveal the next hint
     */
    const revealNextHint = () => {
        const maxHints = currentQuestion?.hints?.length || 0;
        if (hintsRevealed < maxHints) {
            setHintsRevealed(prev => prev + 1);
        }
    };

    /**
     * Get currently visible hints
     */
    const visibleHints = currentQuestion?.hints?.slice(0, hintsRevealed) || [];

    /**
     * Check if there are more hints to reveal
     */
    const hasMoreHints = hintsRevealed < (currentQuestion?.hints?.length || 0);

    return {
        hintsRevealed,
        visibleHints,
        hasMoreHints,
        revealNextHint
    };
}
