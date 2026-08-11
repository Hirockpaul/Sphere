import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import detectLanguage from "./detectLanguage";

export default function ArtifactCode({ file }) {
  return (
    <div className="h-full overflow-auto bg-[var(--sphere-code)]">
      <SyntaxHighlighter
        language={detectLanguage(file.path)}
        style={oneDark}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          minHeight: "100%",
          margin: 0,
          padding: "20px 18px 28px",
          background: "var(--sphere-code)",
          fontSize: "14px",
          lineHeight: "24px",
          overflow: "visible",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            whiteSpace: "pre",
            tabSize: 2,
          },
        }}
        lineNumberStyle={{
          minWidth: "2.5rem",
          paddingRight: "1rem",
          color: "#4f5868",
          userSelect: "none",
        }}
      >
        {file.content}
      </SyntaxHighlighter>
    </div>
  );
}
