import React from 'react';
import Editor from '@monaco-editor/react';
import { ProgrammingLanguage } from '../../../types';

interface CodeEditorProps {
    code: string;
    language: ProgrammingLanguage;
    isDark: boolean;
    consoleOutput: { output: string; error?: string } | null;
    onCodeChange: (code: string) => void;
    onLanguageChange: (language: ProgrammingLanguage) => void;
    onRunCode: () => void;
}

/**
 * Code editor component wrapping Monaco editor with language selection
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
    code,
    language,
    isDark,
    consoleOutput,
    onCodeChange,
    onLanguageChange,
    onRunCode
}) => {
    return (
        <div className="code-editor">
            <div className="editor-header">
                <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value as ProgrammingLanguage)}
                >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                </select>
                <button
                    className="run-code"
                    onClick={onRunCode}
                >
                    Run Code
                </button>
            </div>
            <div className="monaco-wrapper">
                <Editor
                    height="400px"
                    language={language}
                    theme={isDark ? "vs-dark" : "light"}
                    value={code}
                    onChange={(value) => {
                        const newCode = value || "";
                        onCodeChange(newCode);
                    }}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                    }}
                />
            </div>

            {/* Console Output */}
            {consoleOutput && (
                <div className="console-output">
                    <h4>Output:</h4>
                    {consoleOutput.error ? (
                        <pre className="error">{consoleOutput.error}</pre>
                    ) : (
                        <pre>{consoleOutput.output}</pre>
                    )}
                </div>
            )}
        </div>
    );
};
