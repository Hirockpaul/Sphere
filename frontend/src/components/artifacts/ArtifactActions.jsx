import { Check, Copy, Download, FolderArchive } from "lucide-react";
import { useEffect, useState } from "react";
import { createProjectArchive, downloadBlob, formatAllFiles, getFileName, slugify } from "./artifactUtils";

export default function ArtifactActions({ files, activeFile, title }) {
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 1700);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const copy = async (content, success) => {
    try {
      await navigator.clipboard.writeText(content);
      setStatus(success);
    } catch {
      setStatus("Copy failed");
    }
  };

  const downloadFile = () => {
    try {
      downloadBlob(new Blob([activeFile.content], { type: "text/plain;charset=utf-8" }), getFileName(activeFile.path));
      setStatus("Downloaded");
    } catch {
      setStatus("Download failed");
    }
  };

  const downloadProject = async () => {
    try {
      const blob = await createProjectArchive(files);
      downloadBlob(blob, `${slugify(title)}.zip`);
      setStatus("ZIP downloaded");
    } catch {
      setStatus("ZIP failed");
    }
  };

  const buttonClass = "flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-[var(--sphere-text-secondary)] transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-400";
  const success = status && !status.includes("failed");

  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => copy(activeFile.content, "File copied")} className={buttonClass} title="Copy current file">
        {status === "File copied" ? <Check size={14} /> : <Copy size={14} />}
        <span className="hidden 2xl:inline">Copy file</span>
      </button>
      {files.length > 1 && (
        <button type="button" onClick={() => copy(formatAllFiles(files), "Project copied")} className={buttonClass} title="Copy all files">
          <Copy size={14} />
          <span className="hidden 2xl:inline">Copy all</span>
        </button>
      )}
      <button type="button" onClick={downloadFile} className={buttonClass} title="Download current file">
        <Download size={14} />
        <span className="hidden 2xl:inline">File</span>
      </button>
      {files.length > 1 && (
        <button type="button" onClick={downloadProject} className={buttonClass} title="Download project ZIP">
          <FolderArchive size={14} />
          <span className="hidden 2xl:inline">Project</span>
        </button>
      )}
      <span aria-live="polite" className={`pointer-events-none absolute right-3 top-12 z-20 rounded-md border border-white/10 bg-[#242833] px-2 py-1 text-[10px] shadow-xl transition-opacity ${status ? "opacity-100" : "opacity-0"} ${success ? "text-emerald-300" : "text-amber-300"}`}>
        {status || "Action complete"}
      </span>
    </div>
  );
}
