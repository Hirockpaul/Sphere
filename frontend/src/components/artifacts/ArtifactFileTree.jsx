import { ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";
import { buildFileTree } from "./artifactUtils";

function TreeNode({ node, activePath, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(true);
  if (node.isFile) {
    return (
      <button
        type="button"
        title={node.path}
        onClick={() => onSelect(node.path)}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        className={`flex h-7 w-full items-center gap-1.5 truncate pr-2 text-left text-[11px] transition-colors ${activePath === node.path
          ? "bg-indigo-500/10 text-indigo-300"
          : "text-[var(--sphere-text-muted)] hover:bg-white/[0.04] hover:text-[var(--sphere-text-secondary)]"}`}
      >
        <File size={12} className="shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{ paddingLeft: `${7 + depth * 14}px` }}
        className="flex h-7 w-full items-center gap-1 pr-2 text-left text-[11px] text-[var(--sphere-text-secondary)] hover:bg-white/[0.04]"
      >
        <ChevronRight size={12} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <Folder size={12} className="shrink-0 text-indigo-300/70" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children.map((child) => (
        <TreeNode key={`${child.isFile ? "file" : "folder"}-${child.path}`} node={child} activePath={activePath} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ArtifactFileTree({ files, activePath, onSelect }) {
  const tree = buildFileTree(files);
  return (
    <aside className="hidden w-44 shrink-0 overflow-y-auto border-r border-white/[0.08] bg-[#0f1218] py-2 md:block">
      <p className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--sphere-text-muted)]">Files</p>
      {tree.map((node) => <TreeNode key={`${node.isFile ? "file" : "folder"}-${node.path}`} node={node} activePath={activePath} onSelect={onSelect} />)}
    </aside>
  );
}
