import { getFileName } from "./artifactUtils";

export default function ArtifactTabs({ files, activePath, onSelect }) {
  return (
    <div className="flex h-11 shrink-0 overflow-x-auto border-b border-white/[0.08] bg-[#0f1218] [scrollbar-width:thin] sm:h-12">
      {files.map((file) => {
        const active = file.path === activePath;
        return (
          <button
            key={file.path}
            type="button"
            title={file.path}
            onClick={() => onSelect(file.path)}
            className={`relative flex h-11 min-w-24 max-w-48 shrink-0 items-center justify-center border-r border-white/[0.05] px-3 text-xs font-medium transition-colors sm:h-12 sm:min-w-28 sm:px-5 sm:text-sm ${active
              ? "bg-[var(--sphere-code)] text-indigo-300"
              : "text-[var(--sphere-text-muted)] hover:bg-white/[0.04] hover:text-[var(--sphere-text-secondary)]"}`}
          >
            <span className="truncate">{getFileName(file.path)}</span>
            {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--sphere-purple)] shadow-[0_-2px_8px_rgba(124,92,255,0.35)]" />}
          </button>
        );
      })}
    </div>
  );
}
