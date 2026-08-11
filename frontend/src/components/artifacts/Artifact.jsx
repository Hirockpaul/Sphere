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
        <button type="button" onClick={() => setMobileOpen(true)} className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-[#1b1e27] px-3 py-2 text-xs font-medium text-indigo-200 shadow-xl transition hover:border-indigo-400/45 hover:bg-[#242938]">
          <PanelRightOpen size={15} /> Open artifact
        </button>
      )}
      <section className={`${mobileOpen ? "flex" : "hidden"} fixed inset-0 z-50 flex-col overflow-hidden border-l border-white/[0.08] bg-[#0d0f14] lg:static lg:z-auto lg:h-full lg:w-[clamp(420px,42vw,720px)] lg:shrink-0`} aria-label="Artifact workspace">
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
