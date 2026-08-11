import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Highlighter from "react-highlight-words";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Code2, Copy, Eye, Pencil, RefreshCw, Share } from "lucide-react";
import { Children, isValidElement, useState } from "react";

function InlineCode({ children }) {
  const text = String(children ?? "");

  return (
    <code className="rounded-md border border-[#34303b] bg-[#292630] px-1.5 py-0.5 font-mono text-[13px] text-[#ff7aaa]">
      <Highlighter
        autoEscape
        highlightClassName="bg-transparent text-[#ff7aaa]"
        searchWords={[text]}
        textToHighlight={text}
      />
    </code>
  );
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const className = isValidElement(child) ? child.props.className || "" : "";
  const language = className.match(/language-([\w-]+)/)?.[1] || "text";
  const rawCode = isValidElement(child) ? child.props.children : children;
  const code = String(rawCode ?? "").replace(/\n$/, "");

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-[#252a35] bg-[#0b0e14] shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <div className="flex h-10 items-center justify-between border-b border-[#252a35] bg-[#171a22] px-3.5 text-[11px] font-semibold uppercase tracking-wide text-[#838b9b]">
        <span>{language}</span>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium normal-case tracking-normal text-[#aeb5c2] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "12px 18px 14px",
          background: "#0b0e14",
          fontSize: "13px",
          lineHeight: "24px",
          overflowX: "auto",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          },
        }}
        lineNumberStyle={{
          minWidth: "2.25rem",
          paddingRight: "1rem",
          color: "#4f5868",
          userSelect: "none",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function MessageBubble({ role, content, images = [], artifact, artifactActive, canRegenerate, isGenerating, onEdit, onRegenerate, onOpenArtifact }) {
  const isUser = role === "user";
  const hasArtifact = !isUser && Array.isArray(artifact?.files) && artifact.files.length > 0;
  const [copied, setCopied] = useState(false);

  const copyResponse = async () => {
    await navigator.clipboard.writeText(content || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const shareMessage = async () => {
    if (navigator.share) {
      await navigator.share({ text: content || "" });
      return;
    }
    await copyResponse();
  };

  return (
    <div className={`group mx-auto flex w-full max-w-3xl ${isUser ? "mb-10 justify-end" : "mb-8 justify-start"}`}>
      <div className={`relative text-[15px] leading-relaxed ${isUser
        ? "max-w-[85%] rounded-2xl bg-[var(--sphere-user)] px-4 py-2.5 text-white transition-colors hover:bg-[var(--sphere-user-hover)]"
        : "w-full text-[var(--sphere-text)]"
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-3 mt-5 text-2xl font-semibold first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-semibold first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h3>,
              p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
              ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
              blockquote: ({ children }) => (
                <blockquote className="my-3 border-l-2 border-indigo-400/60 pl-4 text-slate-400">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--sphere-link)] underline decoration-blue-400/40 underline-offset-4 hover:brightness-110"
                >
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                const isBlock = Boolean(className) || String(children).includes("\n");
                return isBlock ? (
                  <code className={className || ""}>
                    {children}
                  </code>
                ) : (
                  <InlineCode>{children}</InlineCode>
                );
              },
              pre: CodeBlock,
              table: ({ children }) => (
                <table className="my-4 block w-full overflow-x-auto border-collapse text-left text-sm">
                  {children}
                </table>
              ),
              th: ({ children }) => <th className="border border-white/10 bg-white/[0.06] px-3 py-2 font-semibold">{children}</th>,
              td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
              hr: () => <hr className="my-5 border-white/10" />,
            }}
          >
            {typeof content === "string" ? content : ""}
          </ReactMarkdown>
        )}
        {!isUser && Array.isArray(images) && images.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {images.map((src, index) => (
              <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={`Search result ${index + 1}`}
                  loading="lazy"
                  className="max-h-80 w-full rounded-xl border border-white/10 object-cover"
                />
              </a>
            ))}
          </div>
        )}
        {hasArtifact && (
          <button
            type="button"
            onClick={onOpenArtifact}
            aria-pressed={artifactActive}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${artifactActive
              ? "border-indigo-400/40 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(129,140,248,0.08)]"
              : "border-white/[0.09] bg-[#11141a] hover:border-indigo-400/30 hover:bg-[#151924]"}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${artifactActive ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.05] text-slate-400"}`}>
              <Code2 size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--sphere-text)]">{artifact.summary || "Generated code"}</span>
              <span className="mt-0.5 block text-xs text-[var(--sphere-text-muted)]">{artifact.files.length} {artifact.files.length === 1 ? "file" : "files"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-xs font-semibold text-white">
              {artifactActive ? <Eye size={13} /> : <Code2 size={13} />}
              {artifactActive ? "Viewing" : "Open code"}
            </span>
          </button>
        )}
        {isUser && (
          <div className="absolute -bottom-9 right-0 flex items-center gap-0.5 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button type="button" onClick={copyResponse} title={copied ? "Copied" : "Copy message"} aria-label="Copy message" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-300">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <button type="button" onClick={shareMessage} title="Share message" aria-label="Share message" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-300">
              <Share size={15} />
            </button>
            {onEdit && <button type="button" onClick={onEdit} disabled={isGenerating} title="Edit message" aria-label="Edit message" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-300 disabled:opacity-40"><Pencil size={15} /></button>}
          </div>
        )}
        {!isUser && (
          <div className="mt-3 flex items-center gap-0.5 text-slate-500/80 transition-colors group-hover:text-slate-400 group-focus-within:text-slate-400">
            <button type="button" onClick={copyResponse} title={copied ? "Copied" : "Copy response"} aria-label="Copy response" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-300">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            {onEdit && <button type="button" onClick={onEdit} disabled={isGenerating} title="Edit previous message" aria-label="Edit previous message" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-200 disabled:opacity-40"><Pencil size={15} /></button>}
            {canRegenerate && <button type="button" onClick={onRegenerate} disabled={isGenerating} title="Regenerate response" aria-label="Regenerate response" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.07] hover:text-slate-300 disabled:opacity-40"><RefreshCw size={15} /></button>}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
