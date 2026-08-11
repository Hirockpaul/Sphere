import { Check, Code2, Copy, Eye, PanelLeftClose, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function ArtifactHeader({ title, activeFile, mode, onModeChange, onClose }) {
  const [copied, setCopied] = useState(false);
  const modeButton = (value) => `flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition ${mode === value
    ? "bg-[var(--sphere-purple)] text-white shadow-[0_4px_14px_rgba(124,92,255,0.3)]"
    : "text-[var(--sphere-text-muted)] hover:text-[var(--sphere-text)]"}`;

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyActiveFile = async () => {
    try {
      await navigator.clipboard.writeText(activeFile?.content || "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className="relative shrink-0 border-b border-white/[0.07] bg-[#0e1117]">
      <div className="flex h-[72px] items-center gap-3 px-4">
        <button type="button" onClick={onClose} title="Collapse artifact panel" aria-label="Collapse artifact panel" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200">
          <PanelLeftClose size={20} />
        </button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-400/10 bg-indigo-500/10 text-indigo-300 shadow-inner">
          <Code2 size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-[var(--sphere-text)]" title={title}>{title}</h2>
        </div>
        <button type="button" onClick={copyActiveFile} title={copied ? "Copied" : "Copy current file"} aria-label={copied ? "Copied" : "Copy current file"} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
          {copied ? <Check size={19} /> : <Copy size={19} />}
        </button>
        <div className="flex shrink-0 rounded-xl border border-white/[0.07] bg-[#171a22] p-1 shadow-inner">
          <button type="button" onClick={() => onModeChange("code")} className={modeButton("code")} aria-pressed={mode === "code"}><Code2 size={13} />Code</button>
          <button type="button" onClick={() => onModeChange("preview")} className={modeButton("preview")} aria-pressed={mode === "preview"}><Eye size={13} />Preview</button>
        </div>
        <button type="button" onClick={onClose} title="Close artifacts" aria-label="Close artifacts" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--sphere-text-muted)] transition hover:bg-white/[0.07] hover:text-white lg:hidden">
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
