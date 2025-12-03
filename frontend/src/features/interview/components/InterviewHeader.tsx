import React from 'react';
import { FiCode, FiCpu, FiClock } from 'react-icons/fi';
import { InterviewSession } from '../../../types';

interface InterviewHeaderProps {
    session: InterviewSession | null;
    timeRemaining: number | null;
    formatTime: (seconds: number) => string;
}

/**
 * Interview header component displaying session info and timer
 * Memoized to prevent unnecessary re-renders
 */
export const InterviewHeader = React.memo<InterviewHeaderProps>(({
    session,
    timeRemaining,
    formatTime
}) => {
    return (
        <div className="interview-header">
            <div className="interview-info">
                <h1>AI Interview</h1>
                <div className="interview-meta">
                    <span className="interview-mode">
                        {session?.mode === 'technical'
                            ? <FiCode className="mode-icon" />
                            : <FiCpu className="mode-icon" />
                        }
                        {session?.mode}
                    </span>
                    <span className="interview-job">{session?.jobType}</span>
                    <span className="interview-difficulty">
                        {session?.difficulty}
                    </span>
                </div>
            </div>

            <div className="interview-timer">
                <FiClock className="timer-icon" />
                <span>{timeRemaining !== null ? formatTime(timeRemaining) : '---'}</span>
            </div>
        </div>
    );
});
