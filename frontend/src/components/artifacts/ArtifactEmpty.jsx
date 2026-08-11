import { FileCode2 } from "lucide-react";

export default function ArtifactEmpty() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <FileCode2 className="mx-auto mb-3 text-[var(--sphere-text-muted)]" size={30} />
        <p className="text-sm font-medium text-[var(--sphere-text-secondary)]">No artifacts yet</p>
      </div>
    </div>
  );
}
