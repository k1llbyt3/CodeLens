"use client";

import React, { useRef, useEffect, useState } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  currentLine?: number;
  currentColumn?: number;
  errorLine?: number;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  currentLine,
  currentColumn,
  errorLine,
  readOnly = false
}) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({
    line: 1,
    col: 1
  });

  const handleBeforeMount: BeforeMount = (monaco) => {
    // Register custom Monarch tokenizer for Java so methods, datatypes, variables, and keywords have distinct colors
    monaco.languages.setMonarchTokensProvider("java", {
      keywords: [
        "abstract", "continue", "for", "new", "switch", "assert", "default",
        "goto", "package", "synchronized", "do", "if", "private", "this",
        "break", "implements", "protected", "throw", "else", "import", "public",
        "throws", "case", "enum", "instanceof", "return", "transient", "catch",
        "extends", "final", "interface", "static", "class", "finally", "super",
        "while", "true", "false", "null"
      ],
      types: [
        "int", "boolean", "double", "float", "char", "byte", "short", "long", "void",
        "String", "Integer", "Boolean", "Double", "Object", "System", "Math", "Arrays",
        "List", "ArrayList", "Map", "HashMap", "Set", "HashSet"
      ],
      tokenizer: {
        root: [
          // Data types (int, String, boolean, double, void, etc.) -> Emerald Green
          [/\b(int|boolean|double|float|char|byte|short|long|void|String|Integer|Boolean|Double|Object|System|Math|Arrays|List|ArrayList|Map|HashMap|Set|HashSet)\b/, "type"],

          // Method calls / function names (main, println, length, etc.) -> Pale Yellow
          [/\b(main|println|print|length|size|add|get|set|toString|equals|hashCode)\b(?=\s*[\(;])/, "identifier.method"],
          [/([a-zA-Z_$][\w$]*)(?=\s*\()/, "identifier.method"],

          // Keywords vs variables
          [/[a-zA-Z_$][\w$]*/, {
            cases: {
              "@keywords": "keyword",
              "@types": "type",
              "@default": "variable"
            }
          }],

          // Whitespace & comments
          { include: "@whitespace" },

          // Delimiters
          [/[{}()\[\]]/, "delimiter"],
          [/[;,.]/, "delimiter"],

          // Numbers -> Light Green
          [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, "number"],
          [/0[xX][0-9a-fA-F]+[lL]?/, "number"],
          [/\d+[lL]?/, "number"],

          // Strings -> Bright Orange/Amber
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
          [/'([^'\\]|\\.)'/, "string"]
        ],
        whitespace: [
          [/[ \t\r\n]+/, "white"],
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"]
        ],
        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"]
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }]
        ]
      }
    });

    monaco.editor.defineTheme("codelens-vibrant-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569CD6", fontStyle: "bold" }, // Electric Blue
        { token: "type", foreground: "4EC9B0", fontStyle: "bold" }, // Emerald Green
        { token: "type.identifier", foreground: "4EC9B0", fontStyle: "bold" }, // Emerald Green
        { token: "identifier.method", foreground: "DCDCAA" }, // Pale Yellow
        { token: "variable", foreground: "9CDCFE" }, // Light Blue
        { token: "identifier", foreground: "9CDCFE" }, // Light Blue
        { token: "string", foreground: "CE9178" }, // Bright Orange/Amber
        { token: "number", foreground: "B5CEA8" }, // Light Green
        { token: "delimiter", foreground: "D4D4D4" }, // Gray
        { token: "comment", foreground: "6A9955", fontStyle: "italic" }
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#D4D4D4",
        "editorCursor.foreground": "#ffffff",
        "editor.lineHighlightBackground": "#00000000",
        "editorLineNumber.foreground": "#404040",
        "editorLineNumber.activeForeground": "#a3a3a3",
        "editorGutter.background": "#0a0a0a",
        "editorWidget.background": "#0a0a0a",
        "input.background": "#0a0a0a"
      }
    });
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column
      });
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (errorLine && errorLine > 0) {
      const newDecorations = [
        {
          range: {
            startLineNumber: errorLine,
            startColumn: 1,
            endLineNumber: errorLine,
            endColumn: 1
          },
          options: {
            isWholeLine: true,
            className: "codelens-error-line-highlight",
            glyphMarginClassName: "codelens-error-glyph"
          }
        }
      ];

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
      editor.revealLineInCenterIfOutsideViewport(errorLine);
    } else if (currentLine && currentLine > 0) {
      const lineContent = editor.getModel()?.getLineContent(currentLine) || "";
      const isReturn = /\b(return|break)\b/.test(lineContent);
      const isCondition = /\b(if|else|for|while|switch)\b/.test(lineContent);

      let lineClass = "codelens-executing-line-normal";
      if (isReturn) lineClass = "codelens-executing-line-return";
      else if (isCondition) lineClass = "codelens-executing-line-condition";

      const newDecorations = [
        {
          range: {
            startLineNumber: currentLine,
            startColumn: 1,
            endLineNumber: currentLine,
            endColumn: 1
          },
          options: {
            isWholeLine: true,
            className: lineClass,
            glyphMarginClassName: "codelens-executing-glyph"
          }
        }
      ];

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );

      if (currentColumn && currentColumn > 0) {
        editor.revealPositionInCenterIfOutsideViewport({
          lineNumber: currentLine,
          column: currentColumn
        });
      } else {
        editor.revealLineInCenterIfOutsideViewport(currentLine);
      }
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [currentLine, currentColumn, errorLine]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a] border-r border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0a] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-neutral-300">
            Source.java
          </span>
          <span className="px-1.5 py-0.2 text-[9px] font-mono text-neutral-500 bg-white/[0.03] border border-white/[0.06] rounded-sm">
            Java 17 JDI
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          {currentLine && currentLine > 0 && (
            <span className="text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              Execution Pointer: Line {currentLine}
            </span>
          )}
          <span className="text-neutral-500 font-normal">
            Cursor: Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full relative bg-[#0a0a0a]">
        <Editor
          height="100%"
          language="java"
          theme="codelens-vibrant-dark"
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          value={code}
          onChange={onChange}
          options={{
            readOnly,
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), monospace",
            lineNumbers: "on",
            glyphMargin: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            lineDecorationsWidth: 6,
            lineNumbersMinChars: 3,
            bracketPairColorization: { enabled: true },
            formatOnType: true,
            formatOnPaste: true,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  );
};
