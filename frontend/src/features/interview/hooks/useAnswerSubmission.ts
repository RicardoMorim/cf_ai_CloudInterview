import { useState } from 'react';
import { InterviewQuestion, ProgrammingLanguage } from '../../../types';

interface AnswerSubmissionOptions {
    currentQuestion: InterviewQuestion | null;
    codeContent: string;
    selectedLanguage: ProgrammingLanguage;
    onSubmit: (answerData: any) => Promise<void>;
    onStopListening?: () => void;
    isListening?: boolean;
}

/**
 * Custom hook for managing answer submission
 * @param options - Configuration options
 * @returns Answer submission state and handlers
 */
export function useAnswerSubmission({
    currentQuestion,
    codeContent,
    selectedLanguage,
    onSubmit,
    onStopListening,
    isListening
}: AnswerSubmissionOptions) {
    const [answerText, setAnswerText] = useState('');

    /**
     * Handle answer submission
     */
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!answerText.trim() && !codeContent.trim()) return;

        // Stop listening if active
        if (isListening && onStopListening) {
            onStopListening();
        }

        try {
            const answerData: any = {
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

            await onSubmit(answerData);

            // Clear answer text after successful submission
            setAnswerText('');
        } catch (error) {
            console.error('Failed to submit answer:', error);
            throw error; // Re-throw so caller can handle
        }
    };

    return {
        answerText,
        setAnswerText,
        handleSubmit
    };
}
