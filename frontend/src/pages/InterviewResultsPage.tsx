import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, API_BASE_URL } from '../services/api';
import { InterviewSession, AIResponse, AIResponseType } from '../types';
import { FaRobot, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaLightbulb, FaChartLine } from 'react-icons/fa';
import './InterviewResultsPage.css';

const InterviewResultsPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<AIResponse[]>([]);
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSession = async () => {
            if (!sessionId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/state`);
                const data = await response.json();
                if (data.success && data.session) {
                    setSession(data.session);
                    const chat = data.session.aiResponses.filter((r: AIResponse) =>
                        r.type === AIResponseType.ENCOURAGEMENT || r.questionId === 'chat'
                    );
                    setChatHistory(chat);
                } else {
                    setError("Failed to load session results.");
                }
            } catch (err) {
                console.error("Error fetching session:", err);
                setError("An error occurred while loading results.");
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || !sessionId || sendingChat) return;

        const userMsg = chatMessage;
        setChatMessage("");
        setSendingChat(true);

        try {
            const result = await sessionApi.sendChatMessage(sessionId, userMsg);
            if (result.session) {
                setSession(result.session);
                const chat = result.session.aiResponses.filter((r: AIResponse) =>
                    r.type === AIResponseType.ENCOURAGEMENT || r.questionId === 'chat'
                );
                setChatHistory(chat);
            }
        } catch (err) {
            console.error("Failed to send chat:", err);
        } finally {
            setSendingChat(false);
        }
    };

    if (loading) return <div className="loading-container">Loading results...</div>;
    if (error) return <div className="error-container">{error}</div>;
    if (!session || !session.feedback) return <div className="error-container">No feedback available.</div>;

    const { feedback } = session;
    const isPositive = feedback.overallScore >= 70;

    return (
        <div className="results-page">
            <div className="results-container">
                <header className="results-header">
                    <h1>Interview Results</h1>
                    <p className="subtitle">Session ID: {session.sessionId.substring(0, 8)}</p>
                </header>

                <div className="results-grid">
                    {/* Score Card */}
                    <div className="score-card">
                        <h2>Overall Score</h2>
                        <div className="score-circle">
                            <span className="score-circle-value">{feedback.overallScore}</span>
                        </div>
                        <h3 className={`recommendation ${isPositive ? 'positive' : 'negative'}`}>
                            {feedback.recommendation}
                        </h3>
                    </div>

                    {/* Summary */}
                    <div className="card">
                        <h3><FaChartLine /> Executive Summary</h3>
                        <p>{feedback.summary}</p>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid-2">
                        <div className="card strengths-card">
                            <h4><FaCheckCircle /> Strengths</h4>
                            <ul>
                                {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="card improvements-card">
                            <h4><FaExclamationCircle /> Areas for Improvement</h4>
                            <ul>
                                {feedback.improvementAreas.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>

                    {/* Specific Recommendations */}
                    {feedback.specificRecommendations && feedback.specificRecommendations.length > 0 && (
                        <div className="card recommendations-card">
                            <h4><FaLightbulb /> Recommendations</h4>
                            <ul>
                                {feedback.specificRecommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Chat Interface */}
                    <div className="chat-container">
                        <div className="chat-header">
                            <h3><FaRobot /> AI Interviewer</h3>
                            <p>Ask about your performance</p>
                        </div>

                        <div className="chat-messages">
                            {chatHistory.map((msg) => (
                                <div key={msg.responseId} className="message ai">
                                    <div className="message-bubble">
                                        <p>{msg.content}</p>
                                        <span className="message-time">{new Date(msg.generatedAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendChat} className="chat-input-form">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Ask a question..."
                                disabled={sendingChat}
                                className="chat-input"
                            />
                            <button
                                type="submit"
                                disabled={sendingChat || !chatMessage.trim()}
                                className="chat-send-button"
                            >
                                <FaPaperPlane />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewResultsPage;
