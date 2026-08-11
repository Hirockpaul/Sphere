import { CircleAlert } from "lucide-react";

export default function ArtifactError({ title = "Artifact unavailable", message }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-sm">
        <CircleAlert className="mx-auto mb-3 text-amber-400" size={28} />
        <p className="text-sm font-semibold text-[var(--sphere-text)]">{title}</p>
        {message && <p className="mt-1.5 text-xs leading-5 text-[var(--sphere-text-muted)]">{message}</p>}
      </div>
    </div>
  );
}
