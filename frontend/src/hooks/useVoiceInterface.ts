import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

interface UseVoiceInterfaceProps {
    sessionId?: string;
    onTranscript?: (text: string) => void;
    onSpeakingStart?: () => void;
    onSpeakingEnd?: () => void;
    code?: string; // Current code being worked on
}

export const useVoiceInterface = ({
    sessionId,
    onTranscript,
    onSpeakingStart,
    onSpeakingEnd,
    code
}: UseVoiceInterfaceProps = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioToBackend(audioBlob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsListening(true);
            setError(null);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please check permissions.");
        }
    }, [sessionId]); // Add sessionId dependency if needed, though sendAudioToBackend uses it from closure/props

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const playAudioResponse = async (audioData: ArrayBuffer) => {
        try {
            // Re-create context if it doesn't exist or is closed
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Resume context if suspended (browser policy)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            source.onended = () => {
                setIsSpeaking(false);
                if (onSpeakingEnd) onSpeakingEnd();
            };

            setIsSpeaking(true);
            if (onSpeakingStart) onSpeakingStart();
            source.start(0);
        } catch (err) {
            console.error("Error playing audio:", err);
            setError("Failed to play audio response");
            setIsSpeaking(false);
        }
    };

    const sendAudioToBackend = async (audioBlob: Blob) => {
        if (!sessionId) {
            setError("No active session");
            return;
        }

        try {
            // Convert Blob to ArrayBuffer
            const arrayBuffer = await audioBlob.arrayBuffer();

            const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/chat`, {
                method: 'POST',
                body: arrayBuffer,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            if (response.ok) {
                // Get transcript from header
                const transcriptText = response.headers.get('X-Transcript');
                if (transcriptText) {
                    setTranscript(transcriptText);
                    if (onTranscript) {
                        onTranscript(transcriptText);
                    }
                }

                // Get audio data
                const audioData = await response.arrayBuffer();
                await playAudioResponse(audioData);

            } else {
                throw new Error('Voice processing failed');
            }
        } catch (err: any) {
            console.error("Voice processing error:", err);
            setError(err.message || "Failed to process voice");
        }
    };

    // Fallback text-to-speech if needed (e.g. for initial greeting)
    const speak = useCallback((text: string) => {
        if (!text) return;

        // Use browser TTS as fallback or for non-voice-chat messages
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => {
            setIsSpeaking(true);
            if (onSpeakingStart) onSpeakingStart();
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            if (onSpeakingEnd) onSpeakingEnd();
        };
        window.speechSynthesis.speak(utterance);
    }, [onSpeakingStart, onSpeakingEnd]);

    const stopSpeaking = useCallback(() => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);
    const playGreeting = useCallback(async () => {
        if (!sessionId) return;

        try {
            // Ensure audio context is ready
            console.log("Playing greeting");
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            console.log("Audio context state:", audioContextRef.current?.state);
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            console.log("Audio context state after resume:", audioContextRef.current?.state);

            const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'greeting', code })
            });
            console.log("Response status:", response.status);

            if (response.ok) {
                // Get transcript from header
                const transcriptText = response.headers.get('X-Transcript');
                if (transcriptText) {
                    setTranscript(transcriptText);
                    if (onTranscript) {
                        onTranscript(transcriptText);
                    }
                }
                console.log("Transcript:", transcriptText);
                console.log("Response body:", response.body);
                console.log(response)
                // Get audio data
                const audioData = await response.arrayBuffer();
                await playAudioResponse(audioData);

            }
        } catch (err) {
            console.error("Error playing greeting:", err);
            setError("Click 'Voice Input' to start audio");
        }
    }, [sessionId, onTranscript]);

    return {
        isListening,
        isSpeaking,
        transcript,
        error,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        playGreeting,
        resetTranscript: () => setTranscript('')
    };
};
