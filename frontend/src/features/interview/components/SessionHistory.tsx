import React from 'react';
import ReactMarkdown from 'react-markdown';

interface HistoryItem {
    type: 'question' | 'answer' | 'ai_response';
    content: any;
}

interface SessionHistoryProps {
    history: HistoryItem[];
}

/**
 * Session history component showing interview timeline
 * Memoized to prevent unnecessary re-renders
 */
export const SessionHistory = React.memo<SessionHistoryProps>(({ history }) => {
    return (
        <div className="session-history">
            <h3>Interview Flow</h3>
            <div className="history-timeline">
                {history.map((item, index) => (
                    <div key={index} className={`timeline-item ${item.type}`}>
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                            {item.type === 'question' && (
                                <>
                                    <div className="timeline-label">Question</div>
                                    <div className="timeline-text">{item.content.title || item.content.text}</div>
                                </>
                            )}
                            {item.type === 'answer' && (
                                <>
                                    <div className="timeline-label">Your Answer</div>
                                    <div className="timeline-text">{item.content.answerText}</div>
                                </>
                            )}
                            {item.type === 'ai_response' && (
                                <>
                                    <div className="timeline-label">Feedback</div>
                                    <div className="timeline-text">
                                        <ReactMarkdown>{item.content.content}</ReactMarkdown>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
