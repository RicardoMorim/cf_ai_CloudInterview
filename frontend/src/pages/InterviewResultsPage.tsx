import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi } from '../services/api';
import { InterviewSession, AIResponse, AIResponseType } from '../types';
import { FaRobot, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaLightbulb, FaChartLine } from 'react-icons/fa';

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
                // Fetch latest state
                const response = await fetch(`http://localhost:8787/api/sessions/${sessionId}/state`);
                const data = await response.json();
                if (data.success && data.session) {
                    setSession(data.session);
                    // Filter chat history from aiResponses
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

        // Optimistically add user message (we don't persist user messages in this simple chat implementation, but we show them)
        // Ideally, we should store user messages in the backend too.
        // For now, we'll rely on the backend response to update the UI or just show the AI response.
        // Wait, the backend only stores AI responses. We need to handle user messages in UI state for now.

        try {
            const result = await sessionApi.sendChatMessage(sessionId, userMsg);
            if (result.session) {
                setSession(result.session);
                // Update chat history
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

    return (
        <div className="results-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1>Interview Results</h1>
                <p className="subtitle">Session ID: {session.sessionId.substring(0, 8)}</p>
            </header>

            <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="main-content">
                    {/* Score Card */}
                    <div className="card score-card" style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
                        <h2>Overall Score</h2>
                        <div className="score-circle" style={{
                            width: '150px', height: '150px', borderRadius: '50%',
                            background: `conic-gradient(#4caf50 ${feedback.overallScore * 3.6}deg, #e0e0e0 0deg)`,
                            margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '3rem', fontWeight: 'bold', color: '#333'
                        }}>
                            {feedback.overallScore}
                        </div>
                        <h3 style={{ marginTop: '1rem', color: feedback.overallScore >= 70 ? '#4caf50' : '#f44336' }}>
                            {feedback.recommendation}
                        </h3>
                    </div>

                    {/* Summary */}
                    <div className="card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                        <h3><FaChartLine /> Executive Summary</h3>
                        <p>{feedback.summary}</p>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="card" style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4 style={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaCheckCircle /> Strengths</h4>
                            <ul>
                                {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="card" style={{ background: '#fff3e0', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4 style={{ color: '#ef6c00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaExclamationCircle /> Areas for Improvement</h4>
                            <ul>
                                {feedback.improvementAreas.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>

                    {/* Specific Recommendations */}
                    {feedback.specificRecommendations && feedback.specificRecommendations.length > 0 && (
                        <div className="card" style={{ marginTop: '2rem', background: '#e3f2fd', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4 style={{ color: '#1565c0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaLightbulb /> Recommendations</h4>
                            <ul>
                                {feedback.specificRecommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="sidebar">
                    {/* Chat Interface */}
                    <div className="chat-container" style={{
                        background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        height: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div className="chat-header" style={{ padding: '1rem', background: '#333', color: 'white' }}>
                            <h3><FaRobot /> AI Interviewer</h3>
                            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ask about your performance</p>
                        </div>

                        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {chatHistory.map((msg) => (
                                <div key={msg.responseId} className={`message ai`} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                                    <div style={{ background: '#f1f1f1', padding: '0.8rem', borderRadius: '12px 12px 12px 0' }}>
                                        <p style={{ margin: 0 }}>{msg.content}</p>
                                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{new Date(msg.generatedAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendChat} style={{ padding: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Ask a question..."
                                disabled={sendingChat}
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '20px', border: '1px solid #ddd' }}
                            />
                            <button
                                type="submit"
                                disabled={sendingChat || !chatMessage.trim()}
                                style={{
                                    background: '#333', color: 'white', border: 'none', width: '40px', height: '40px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
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
