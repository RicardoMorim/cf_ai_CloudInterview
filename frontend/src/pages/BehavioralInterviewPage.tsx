import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../contexts/InterviewContext';
import { useVoiceInterface } from '../hooks/useVoiceInterface';
import { FiMic, FiMicOff, FiX, FiUser } from 'react-icons/fi';
import './BehavioralInterviewPage.css';

const BehavioralInterviewPage: React.FC = () => {
    const { currentSession, endInterview, loading } = useInterview();
    const {
        isListening,
        isSpeaking,
        transcript,
        startListening,
        stopListening,
        playGreeting
    } = useVoiceInterface({ sessionId: currentSession?.sessionId });
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const navigate = useNavigate();
    const greetingPlayedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!currentSession) {
            navigate('/');
        }
    }, [currentSession, navigate]);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds((prevSeconds) => {
                if (prevSeconds + 1 === 60) {
                    setMinutes((prevMinutes) => prevMinutes + 1);
                    return 0;
                }
                return prevSeconds + 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Trigger initial greeting
    useEffect(() => {
        if (currentSession?.sessionId) {
            if (greetingPlayedRef.current !== currentSession.sessionId) {
                playGreeting();
                greetingPlayedRef.current = currentSession.sessionId;
            }
        }
    }, [currentSession?.sessionId, playGreeting]);

    const handleEndInterview = async () => {
        await endInterview();
        navigate(`/interview/${currentSession?.sessionId}/results`);
    };

    if (!currentSession) return null;

    return (
        <div className="interview-page behavioral-mode">
            <header className="interview-header">
                <div className="header-left">
                    <span className="interview-mode-badge">Behavioral</span>
                    {currentSession?.jobTitle && <span className="job-title-badge">{currentSession.jobTitle}</span>}
                    <span className="interview-timer">{minutes}:{seconds}</span>
                </div>
                <button className="end-button" onClick={handleEndInterview} disabled={loading}>
                    <FiX /> End Interview
                </button>
            </header>

            <main className="interview-content centered-layout">
                <div className="avatar-container">
                    <div className={`avatar-circle ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
                        <FiUser className="avatar-icon" />
                        {isSpeaking && <div className="pulse-ring"></div>}
                    </div>
                    <div className="status-indicator">
                        {isSpeaking ? "Alex is speaking..." : isListening ? "Listening..." : "Waiting..."}
                    </div>
                </div>

                <div className="conversation-display">
                    <div className="current-question">
                        {transcript || "Waiting..."}
                    </div>
                </div>

                <div className="controls-container">
                    <button
                        className={`mic-button ${isListening ? 'active' : ''}`}
                        onClick={isListening ? stopListening : startListening}
                    >
                        {isListening ? <FiMicOff /> : <FiMic />}
                    </button>
                    <p className="mic-hint">
                        {isListening ? "Tap to stop speaking" : "Tap to answer"}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default BehavioralInterviewPage;
