import { useState, useEffect, useRef } from 'react';
import { InterviewQuestion, ProgrammingLanguage } from '../../../types';

interface ConsoleOutput {
    output: string;
    error?: string;
}

/**
 * Helper function to generate LeetCode URL from question
 */
function getLeetCodeUrl(question: InterviewQuestion | null): string | null {
    if (!question) return null;

    // Try to get slug from metadata
    if (question.metadata?.leetcodeSlug) {
        return `https://leetcode.com/problems/${question.metadata.leetcodeSlug}/`;
    }

    // Generate slug from title as fallback
    if (question.title) {
        const slug = question.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        return `https://leetcode.com/problems/${slug}/`;
    }

    return null;
}

/**
 * Custom hook for managing code editor state and actions
 * @param currentQuestion - Current interview question
 * @param onCodeUpdate - Callback when code is updated (debounced)
 * @returns Code editor state and handlers
 */
export function useCodeEditor(
    currentQuestion: InterviewQuestion | null,
    onCodeUpdate?: (code: string, language: string) => void
) {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState<ProgrammingLanguage>(ProgrammingLanguage.JAVASCRIPT);
    const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Handle code changes with debouncing
     */
    const handleCodeChange = (newCode: string) => {
        setCode(newCode);

        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set new timeout for debounced update
        debounceTimeoutRef.current = setTimeout(() => {
            onCodeUpdate?.(newCode, language);
        }, 1000); // 1 second debounce
    };

    /**
     * Handle running code - opens LeetCode in new tab
     */
    const handleRunCode = () => {
        const leetcodeUrl = getLeetCodeUrl(currentQuestion);

        if (leetcodeUrl) {
            // Open LeetCode in new tab
            window.open(leetcodeUrl, '_blank');
            setConsoleOutput({
                output: `✅ Opened LeetCode problem in new tab!\n\nYou can test your solution there and come back here to submit your answer.`
            });
        } else {
            setConsoleOutput({
                output: "",
                error: "Could not determine LeetCode URL for this problem."
            });
        }
    };

    /**
     * Cleanup debounce timeout on unmount
     */
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    return {
        code,
        setCode: handleCodeChange,
        language,
        setLanguage,
        consoleOutput,
        handleRunCode
    };
}
