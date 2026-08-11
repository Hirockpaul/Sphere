import { useEffect, useMemo, useRef, useState } from "react";
import ArtifactError from "./ArtifactError";
import { canPreview, createPreview } from "./createPreview";

export default function ArtifactPreview({ files }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState("");
  const supported = canPreview(files);
  const preview = useMemo(() => supported ? createPreview(files) : null, [files, supported]);

  useEffect(() => {
    const receiveError = (event) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.type !== "sphere-preview-error") return;
      setError(event.data.message || "The generated application contains a runtime error.");
    };
    window.addEventListener("message", receiveError);
    return () => window.removeEventListener("message", receiveError);
  }, []);

  if (!supported) {
    return <ArtifactError title="Preview is not available" message="This project type cannot be rendered safely in the browser. You can still inspect and download every file in Code mode." />;
  }
  if (error) {
    return <ArtifactError title="Preview failed" message={error} />;
  }
  return (
    <div className="h-full bg-white p-2 sm:p-3">
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        srcDoc={preview}
        title="Artifact Preview"
        className="h-full w-full rounded-md border border-black/10 bg-white"
      />
    </div>
  );
}
