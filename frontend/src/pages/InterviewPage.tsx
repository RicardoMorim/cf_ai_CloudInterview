import React, { useState, useEffect, useCallback } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVoiceInterface } from '../hooks/useVoiceInterface';
import { useTimer } from '../features/interview/hooks/useTimer';
import { useCodeEditor } from '../features/code-editor/hooks/useCodeEditor';
import { aiApi } from '../services/api';
import Editor from '@monaco-editor/react';
import { FiSend, FiMic, FiMicOff, FiCode, FiCpu, FiClock, FiStopCircle } from 'react-icons/fi';
import './InterviewPage.css';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { InterviewQuestion, ProgrammingLanguage } from '../types';
import { useHints } from '../features/interview/hooks/useHints';
import { useAnswerSubmission } from '../features/interview/hooks/useAnswerSubmission';
import { InterviewHeader } from '../features/interview/components/InterviewHeader';
import { QuestionDisplay } from '../features/interview/components/QuestionDisplay';
import { CodeEditor } from '../features/code-editor/components/CodeEditor';

const InterviewPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        currentSession,
        currentQuestion,
        sessionHistory,
        isInterviewActive,
        loading,
        submitAnswer,
        endInterview,
        updateState
    } = useInterview();
    const { isDark } = useTheme();

    // Use custom hooks
    const timeRemaining = useTimer(isInterviewActive);
    const {
        code: codeContent,
        setCode: setCodeContent,
        language: selectedLanguage,
        setLanguage: setSelectedLanguage,
        consoleOutput,
        handleRunCode
    } = useCodeEditor(currentQuestion, (code, lang) => {
        if (currentSession?.sessionId) {
            updateState({ currentCode: code, currentLanguage: lang });
        }
    });
    const { hintsRevealed, visibleHints, hasMoreHints, revealNextHint } = useHints(currentQuestion);


    // Voice Interface Integration
    const handleVoiceTranscript = useCallback((text: string) => {
        setAnswerText(prev => prev + (prev ? '\n' : '') + text);
    }, []);

    const {
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        playGreeting
    } = useVoiceInterface({
        sessionId: currentSession?.sessionId,
        onTranscript: handleVoiceTranscript,
        code: codeContent // Pass current code to voice interface
    });

    const { answerText, setAnswerText, handleSubmit } = useAnswerSubmission({
        currentQuestion,
        codeContent,
        selectedLanguage,
        onSubmit: async (data) => {
            await submitAnswer(data);
            setCodeContent(''); // Clear code after submission
        },
        onStopListening: stopListening,
        isListening
    });

    // Trigger initial greeting
    const greetingPlayedRef = React.useRef<string | null>(null);

    useEffect(() => {
        if (currentSession?.sessionId && sessionHistory.length <= 1) {
            // Only greet if history is empty or just has the initial question
            // and we haven't greeted yet for this session
            if (greetingPlayedRef.current !== currentSession.sessionId) {
                playGreeting();
                greetingPlayedRef.current = currentSession.sessionId;
            }
        }
    }, [currentSession?.sessionId, playGreeting, sessionHistory.length]);

    // Speak AI responses automatically - DISABLED to avoid conflict with VoiceChat audio
    // If we want text-to-speech for text submissions, we can re-enable this with logic to distinguish sources
    useEffect(() => {
        const lastHistoryItem = sessionHistory[sessionHistory.length - 1];
        if (lastHistoryItem && lastHistoryItem.type === 'ai_response') {
            speak(lastHistoryItem.content.content);
        }
    }, [sessionHistory, speak]);


    const handleVoiceInput = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndInterview = async () => {
        if (!currentSession) return;
        try {
            await endInterview();
            navigate(`/interview/${currentSession.sessionId}/results`);
        } catch (error) {
            console.error("Failed to end interview:", error);
        }
    };

    if (!isInterviewActive) {
        return (
            <div className="interview-inactive">
                <div className="interview-inactive-content">
                    <h2>Start Your Interview</h2>
                    <p>Choose your interview settings and begin practicing with our AI interviewer.</p>
                    <div className="interview-inactive-actions">
                        <Link to="/" className="button primary">
                            Configure Interview
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-page">
            <div className="interview-container">
                <InterviewHeader
                    session={currentSession}
                    timeRemaining={timeRemaining}
                    formatTime={formatTime}
                />

                {/* Interview Content */}
                <div className="interview-content">
                    <QuestionDisplay
                        question={currentQuestion}
                        questionNumber={sessionHistory.filter(h => h.type === 'question').length}
                        hintsRevealed={hintsRevealed}
                        hasMoreHints={hasMoreHints}
                        revealNextHint={revealNextHint}
                    />

                    {/* Session History */}
                    <div className="session-history">
                        <h3>Interview Flow</h3>
                        <div className="history-timeline">
                            {sessionHistory.map((item, index) => (
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

                    {/* Answer Form */}
                    <div className="answer-section">
                        <h3>Your Response</h3>

                        {/* Code Editor (for technical questions) */}
                        {currentQuestion?.type === 'coding' && (
                            <CodeEditor
                                code={codeContent}
                                language={selectedLanguage}
                                isDark={isDark}
                                consoleOutput={consoleOutput}
                                onCodeChange={setCodeContent}
                                onLanguageChange={setSelectedLanguage}
                                onRunCode={handleRunCode}
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="answer-actions">
                            <div className="input-actions">
                                <button
                                    className={`voice-button ${isListening ? 'recording' : ''}`}
                                    onClick={handleVoiceInput}
                                    disabled={loading}
                                    type="button"
                                >
                                    {isListening ? React.createElement(FiStopCircle as any, { className: "button-icon" }) : React.createElement(FiMic as any, { className: "button-icon" })}
                                    {isListening ? 'Stop Recording' : 'Voice Input'}
                                </button>
                                {isSpeaking && (
                                    <button
                                        className="voice-button speaking"
                                        onClick={stopSpeaking}
                                        type="button"
                                    >
                                        {React.createElement(FiMicOff as any, { className: "button-icon" })}
                                        Stop Speaking
                                    </button>
                                )}
                            </div>

                            <div className="submit-actions">
                                <button
                                    className="button secondary"
                                    onClick={handleEndInterview}
                                    disabled={loading}
                                    type="button"
                                >
                                    End Interview
                                </button>
                                <button
                                    className="button primary"
                                    onClick={handleSubmit}
                                    disabled={loading || (!answerText.trim() && !codeContent.trim())}
                                    type="button"
                                >
                                    {React.createElement(FiSend as any, { className: "button-icon" })}
                                    {loading ? 'Submitting...' : 'Submit Answer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewPage;
