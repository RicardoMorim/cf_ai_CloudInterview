import React, { useState, useEffect } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { useTheme } from '../contexts/ThemeContext';
import SendIcon from '../assets/icons/send.svg';
import MicIcon from '../assets/icons/mic.svg';
import StopIcon from '../assets/icons/stop.svg';
import CodeIcon from '../assets/icons/code.svg';
import BrainIcon from '../assets/icons/brain.svg';
import ClockIcon from '../assets/icons/clock.svg';
import './InterviewPage.css';

const InterviewPage = () => {
  const { 
    currentSession, 
    currentQuestion, 
    sessionHistory, 
    isInterviewActive, 
    loading, 
    submitAnswer, 
    endInterview 
  } = useInterview();
  const { isDark } = useTheme();
  
  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Simulate timer for interview
  useEffect(() => {
    if (currentSession && currentSession.duration) {
      const endTime = new Date(currentSession.startedAt || new Date()).getTime() + 
                     (currentSession.duration * 60 * 1000);
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerText.trim() && !codeContent.trim()) return;

    try {
      const answerData = {
        answerText: answerText.trim(),
        responseTime: 60, // TODO: Calculate actual response time
      };

      // Add code content if this is a coding question
      if (currentQuestion?.type === 'coding' && codeContent.trim()) {
        answerData.codeSubmission = {
          language: selectedLanguage,
          code: codeContent.trim(),
          approachExplanation: answerText.trim()
        };
      }

      await submitAnswer(answerData);
      setAnswerText('');
      setCodeContent('');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleVoiceInput = () => {
    // TODO: Implement Web Speech API for voice input
    console.log('Voice input not yet implemented');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
                <img src={currentSession?.mode === 'technical' ? CodeIcon : BrainIcon} alt={currentSession?.mode} className="mode-icon" />
                {currentSession?.mode}
              </span>
              <span className="interview-job">{currentSession?.jobType}</span>
              <span className="interview-difficulty">
                {currentSession?.difficulty}
              </span>
            </div>
          </div>
          
          <div className="interview-timer">
            <img src={ClockIcon} alt="Timer" className="timer-icon" />
            <span>{timeRemaining ? formatTime(timeRemaining) : '---'}</span>
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
              <p>{currentQuestion?.text}</p>
              
              {currentQuestion?.hints && currentQuestion.hints.length > 0 && (
                <div className="question-hints">
                  <h5>Hints:</h5>
                  <ul>
                    {currentQuestion.hints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
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
                        <div className="timeline-text">{item.content.content}</div>
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
            
            {/* Text Answer */}
            <div className="answer-input">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
              />
            </div>

            {/* Code Editor (for technical questions) */}
            {currentQuestion?.type === 'coding' && (
              <div className="code-editor">
                <div className="editor-header">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                  </select>
                  <button className="run-code">Run Code</button>
                </div>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  placeholder="// Write your code here"
                  className="code-textarea"
                  rows={10}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="answer-actions">
              <div className="input-actions">
                <button 
                  className={`voice-button ${isRecording ? 'recording' : ''}`}
                  onClick={handleVoiceInput}
                  disabled={isRecording}
                >
                  <img src={isRecording ? StopIcon : MicIcon} alt={isRecording ? 'Stop' : 'Microphone'} className="button-icon" />
                  {isRecording ? 'Stop Recording' : 'Voice Input'}
                </button>
              </div>

              <div className="submit-actions">
                <button 
                  className="button secondary"
                  onClick={endInterview}
                  disabled={loading}
                >
                  End Interview
                </button>
                <button 
                  className="button primary"
                  onClick={handleSubmit}
                  disabled={loading || (!answerText.trim() && !codeContent.trim())}
                >
                  <img src={SendIcon} alt="Send" className="button-icon" />
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