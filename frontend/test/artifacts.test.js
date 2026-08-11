import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { buildFileTree, createProjectArchive, formatAllFiles, getFileName, normalizeArtifactContent, normalizeArtifactFiles, slugify } from "../src/components/artifacts/artifactUtils.js";
import { canPreview, createPreview } from "../src/components/artifacts/createPreview.js";
import detectLanguage from "../src/components/artifacts/detectLanguage.js";

test("detectLanguage supports the required extensions case-insensitively", () => {
  const cases = {
    "App.JSX": "jsx", "app.tsx": "tsx", "index.ts": "typescript", "data.JSON": "json",
    "index.html": "html", "style.css": "css", "theme.scss": "scss", "README.md": "markdown",
    "main.py": "python", "Main.java": "java", "main.cpp": "cpp", "main.c": "c",
    "query.sql": "sql", "run.sh": "bash", "config.yaml": "yaml", "config.yml": "yaml", "feed.xml": "xml",
  };
  Object.entries(cases).forEach(([path, language]) => assert.equal(detectLanguage(path), language));
  assert.equal(detectLanguage("LICENSE"), "text");
});

test("artifact files preserve safe nested paths and reject duplicates or traversal", () => {
  const files = normalizeArtifactFiles([
    { path: "src\\App.jsx", content: "export default App" },
    { path: "src/App.jsx", content: "duplicate" },
    { path: "../secret.txt", content: "unsafe" },
    { path: "styles/main.css", content: "body{}" },
  ]);
  assert.deepEqual(files.map((file) => file.path), ["src/App.jsx", "styles/main.css"]);
  assert.equal(getFileName(files[0].path), "App.jsx");
  assert.match(formatAllFiles(files), /\/\/ src\/App\.jsx/);
  assert.equal(slugify("React Dashboard!"), "react-dashboard");
  assert.equal(buildFileTree(files)[0].isFile, false);
});

test("escaped generated documents render as formatted source lines", () => {
  const escaped = '<!DOCTYPE html>\\n<html lang="en">\\n\\t<body>Hi</body>\\n</html>';
  assert.equal(
    normalizeArtifactContent(escaped),
    '<!DOCTYPE html>\n<html lang="en">\n  <body>Hi</body>\n</html>',
  );
  const realSource = 'const value = "\\n";\nconsole.log(value);';
  assert.equal(normalizeArtifactContent(realSource), realSource);

  const providerEncoded = JSON.stringify('<!DOCTYPE html>"><html lang="en">">  <body>">FoodExpress"></body>"></html>">');
  assert.equal(
    normalizeArtifactContent(providerEncoded),
    '<!DOCTYPE html>\n<html lang="en">\n  <body>\nFoodExpress\n</body>\n</html>\n',
  );

  const slashContinued = '"body {\\' + '\n' + '  color: red;\\' + '\n' + '}"';
  assert.equal(normalizeArtifactContent(slashContinued), 'body {\n  color: red;\n}');

  const quotedMultiline = '"<main>\n  <h1 class=\\"title\\">Food</h1>\n</main>"';
  assert.equal(
    normalizeArtifactContent(quotedMultiline),
    '<main>\n  <h1 class="title">Food</h1>\n</main>',
  );
});

test("preview combines HTML, CSS, and JavaScript with an error bridge", () => {
  const files = [
    { path: "index.html", content: "<!doctype html><html><head></head><body><main>Hello</main></body></html>" },
    { path: "styles/main.css", content: "main { color: purple; }" },
    { path: "script.js", content: "document.querySelector('main').dataset.ready = 'true';" },
  ];
  assert.equal(canPreview(files), true);
  const preview = createPreview(files);
  assert.match(preview, /<style>/);
  assert.match(preview, /color: purple/);
  assert.match(preview, /sphere-preview-error/);
  assert.match(preview, /dataset\.ready/);
});

test("preview rejects projects that require a runtime or bundler", () => {
  assert.equal(canPreview([{ path: "src/App.jsx", content: "export default function App() {}" }]), false);
  assert.equal(canPreview([{ path: "main.py", content: "print('hello')" }]), false);
  assert.equal(createPreview([]), null);
});

test("project ZIP preserves nested file paths and contents", async () => {
  const archive = await createProjectArchive([
    { path: "src/App.js", content: "export default 'app';" },
    { path: "README.md", content: "# Project" },
  ], "uint8array");
  const zip = await JSZip.loadAsync(archive);
  assert.equal(await zip.file("src/App.js").async("string"), "export default 'app';");
  assert.equal(await zip.file("README.md").async("string"), "# Project");
});
