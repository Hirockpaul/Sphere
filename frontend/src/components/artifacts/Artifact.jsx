import { PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import ArtifactCode from "./ArtifactCode";
import ArtifactEmpty from "./ArtifactEmpty";
import ArtifactHeader from "./ArtifactHeader";
import ArtifactPreview from "./ArtifactPreview";
import ArtifactTabs from "./ArtifactTabs";
import { normalizeArtifactFiles } from "./artifactUtils";

function ArtifactWorkspace({ artifact }) {
  const files = useMemo(() => normalizeArtifactFiles(artifact?.files), [artifact]);
  const [activePath, setActivePath] = useState(files[0]?.path || "");
  const [mode, setMode] = useState("code");
  const [mobileOpen, setMobileOpen] = useState(true);

  if (!artifact || files.length === 0) return null;
  const activeFile = files.find((file) => file.path === activePath) || files[0];
  const title = artifact.summary?.trim() || "Generated project";

  return (
    <>
      {!mobileOpen && (
        <button type="button" onClick={() => setMobileOpen(true)} className="fixed bottom-24 right-3 z-40 flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-[#1b1e27] px-3 py-2 text-xs font-medium text-indigo-200 shadow-xl transition hover:border-indigo-400/45 hover:bg-[#242938] sm:right-5">
          <PanelRightOpen size={15} /> Open artifact
        </button>
      )}
      <section className={`${mobileOpen ? "flex" : "hidden"} fixed inset-0 z-[60] min-w-0 flex-col overflow-hidden bg-[#0d0f14] sm:inset-y-3 sm:left-auto sm:right-3 sm:w-[min(92vw,720px)] sm:rounded-2xl sm:border sm:border-white/[0.1] sm:shadow-[-20px_0_70px_rgba(0,0,0,0.5)] xl:static xl:z-auto xl:h-full xl:w-[clamp(440px,42vw,720px)] xl:shrink-0 xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none`} aria-label="Artifact workspace">
        <ArtifactHeader title={title} files={files} activeFile={activeFile} mode={mode} onModeChange={setMode} onClose={() => setMobileOpen(false)} />
        {mode === "code" ? (
          <>
            <ArtifactTabs files={files} activePath={activeFile.path} onSelect={setActivePath} />
            <main className="min-h-0 min-w-0 flex-1">
              {activeFile ? <ArtifactCode file={activeFile} /> : <ArtifactEmpty />}
            </main>
          </>
        ) : (
          <main className="min-h-0 flex-1"><ArtifactPreview files={files} /></main>
        )}
      </section>
    </>
  );
}

export default function Artifact() {
  const { artifacts, activeArtifactMessageId } = useSelector((state) => state.message);
  const artifact = artifacts.find((item) => item.messageId === activeArtifactMessageId) || artifacts.at(-1);
  if (!artifact) return null;
  return <ArtifactWorkspace key={artifact.messageId || artifact.summary} artifact={artifact} />;
}
