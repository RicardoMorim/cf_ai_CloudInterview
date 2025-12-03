import React from 'react';
import { InterviewQuestion } from '../../../types';

interface QuestionDisplayProps {
    question: InterviewQuestion | null;
    questionNumber: number;
    hintsRevealed: number;
    hasMoreHints: boolean;
    revealNextHint: () => void;
}

/**
 * Question display component showing the current interview question
 * Memoized to prevent unnecessary re-renders
 */
export const QuestionDisplay = React.memo<QuestionDisplayProps>(({
    question,
    questionNumber,
    hintsRevealed,
    hasMoreHints,
    revealNextHint
}) => {
    if (!question) {
        return (
            <div className="question-section">
                <div className="question-content">
                    <h4>Loading question...</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="question-section">
            <div className="question-header">
                <h3>Question {questionNumber}</h3>
                <div className="question-type">
                    {question.type}
                </div>
            </div>
            <div className="question-content">
                <h4>{question.title || 'Interview Question'}</h4>
                <div
                    className="question-text"
                    dangerouslySetInnerHTML={{ __html: question.text || '' }}
                />
                {question.hints && question.hints.length > 0 && (
                    <div className="question-hints">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <h5>Hints ({hintsRevealed}/{question.hints.length})</h5>
                            {hasMoreHints && (
                                <button
                                    className="button secondary"
                                    onClick={revealNextHint}
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                >
                                    Show Next Hint
                                </button>
                            )}
                        </div>
                        {hintsRevealed > 0 && (
                            <ul>
                                {question.hints.slice(0, hintsRevealed).map((hint, index) => (
                                    <li key={index}>{hint}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
