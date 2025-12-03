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
                {/* Interview Header */}
                <div className="interview-header">
                    <div className="interview-info">
                        <h1>AI Interview</h1>
                        <div className="interview-meta">
                            <span className="interview-mode">
                                {currentSession?.mode === 'technical' ? React.createElement(FiCode as any, { className: "mode-icon" }) : React.createElement(FiCpu as any, { className: "mode-icon" })}
                                {currentSession?.mode}
                            </span>
                            <span className="interview-job">{currentSession?.jobType}</span>
                            <span className="interview-difficulty">
                                {currentSession?.difficulty}
                            </span>
                        </div>
                    </div>

                    <div className="interview-timer">
                        {React.createElement(FiClock as any, { className: "timer-icon" })}
                        <span>{timeRemaining !== null ? formatTime(timeRemaining) : '---'}</span>
                    </div>
                </div>

                {/* Interview Content */}
                <div className="interview-content">
                    {/* Question Display */}
                    <div className="question-section">
                        <div className="question-header">
                            <h3>Question {sessionHistory.filter(h => h.type === 'question').length}</h3>
                            <div className="question-type">
                                {currentQuestion?.type}
                            </div>
                        </div>
                        <div className="question-content">
                            <h4>{currentQuestion?.title || 'Interview Question'}</h4>
                            <div
                                className="question-text"
                                dangerouslySetInnerHTML={{ __html: currentQuestion?.text || '' }}
                            />
                            {currentQuestion?.hints && currentQuestion.hints.length > 0 && (
                                <div className="question-hints">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h5>Hints ({hintsRevealed}/{currentQuestion.hints.length})</h5>
                                        {hasMoreHints && (
                                            <button
                                                className="button secondary"
                                                onClick={() => revealNextHint()}
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                            >
                                                Show Next Hint
                                            </button>
                                        )}
                                    </div>
                                    {hintsRevealed > 0 && (
                                        <ul>
                                            {currentQuestion.hints.slice(0, hintsRevealed).map((hint, index) => (
                                                <li key={index}>{hint}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

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
                            <div className="code-editor">
                                <div className="editor-header">
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value as ProgrammingLanguage)}
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="csharp">C#</option>
                                    </select>
                                    <button
                                        className="run-code"
                                        onClick={handleRunCode}
                                    >
                                        Run Code
                                    </button>

                                </div>
                                <div className="monaco-wrapper">
                                    <Editor
                                        height="400px"
                                        language={selectedLanguage}
                                        theme={isDark ? "vs-dark" : "light"}
                                        value={codeContent}
                                        onChange={(value) => {
                                            const newCode = value || "";
                                            setCodeContent(newCode);
                                        }}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true
                                        }}
                                    />
                                </div>
                                {consoleOutput && (
                                    <div className={`console-output ${consoleOutput.error ? 'error' : ''}`}>
                                        <div className="console-header">Console Output</div>
                                        <pre>{consoleOutput.error || consoleOutput.output}</pre>
                                    </div>
                                )}
                            </div>
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
