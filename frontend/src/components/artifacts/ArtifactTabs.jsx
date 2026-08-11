import { getFileName } from "./artifactUtils";

export default function ArtifactTabs({ files, activePath, onSelect }) {
  return (
    <div className="flex h-12 shrink-0 overflow-x-auto border-b border-white/[0.08] bg-[#0f1218] [scrollbar-width:thin]">
      {files.map((file) => {
        const active = file.path === activePath;
        return (
          <button
            key={file.path}
            type="button"
            title={file.path}
            onClick={() => onSelect(file.path)}
            className={`relative flex h-12 min-w-28 shrink-0 items-center justify-center border-r border-white/[0.05] px-5 text-sm font-medium transition-colors ${active
              ? "bg-[var(--sphere-code)] text-indigo-300"
              : "text-[var(--sphere-text-muted)] hover:bg-white/[0.04] hover:text-[var(--sphere-text-secondary)]"}`}
          >
            <span>{getFileName(file.path)}</span>
            {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--sphere-purple)] shadow-[0_-2px_8px_rgba(124,92,255,0.35)]" />}
          </button>
        );
      })}
    </div>
  );
}
