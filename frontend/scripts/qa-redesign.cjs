#!/usr/bin/env node
/**
 * OKA Bau Control 2.0 deterministic integration QA.
 * Run from frontend/: node scripts/qa-redesign.cjs
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const required = [
  "app/_layout.tsx",
  "app/(tabs)/index.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/mein-projekt.tsx",
  "app/(tabs)/aktivitaet.tsx",
  "app/(tabs)/medien.tsx",
  "app/(tabs)/dateien.tsx",
  "app/(tabs)/profil.tsx",
  "app/admin/index.tsx",
  "app/admin/crm.tsx",
  "app/admin/projects.tsx",
  "app/admin/lead/[id].tsx",
  "app/admin/project/[id].tsx",
  "app/admin/list/[entity].tsx",
  "app/client/project/[id].tsx",
  "app/client/chat/[id].tsx",
  "app/client/offer/[id].tsx",
  "app/employee/index.tsx",
  "app/employee/project/[id].tsx",
  "src/theme.ts",
  "src/components/premium.tsx",
  "src/components/project-sections.tsx",
];

const dependencyFiles = [
  "src/api.ts",
  "src/auth.tsx",
  "src/components/ui.tsx",
  "src/components/forms.tsx",
  "src/components/BeforeAfterEditor.tsx",
  "src/components/MediaPicker.tsx",
  "src/hooks/useChatSocket.ts",
  "src/three/Experiences.tsx",
];

let failed = false;
const fail = (message) => {
  failed = true;
  console.error("FAIL:", message);
};
const pass = (message) => console.log("PASS:", message);

for (const rel of [...required, ...dependencyFiles]) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}
if (!failed) pass("required OKA Control and dependency files exist");

const pkgPath = path.join(root, "package.json");
if (!fs.existsSync(pkgPath)) {
  fail("package.json missing");
} else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const name of [
    "@expo-google-fonts/inter",
    "@hugeicons/core-free-icons",
    "@hugeicons/react-native",
    "expo-video",
    "react-native-svg",
    "typescript",
  ]) {
    if (!deps[name]) fail(`dependency missing: ${name}`);
  }
}
if (!failed) pass("OKA Control dependencies declared");

for (const rel of required.filter((x) => /\.[tj]sx?$/.test(x))) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const out = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (out.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  if (errors.length) {
    fail(
      `${rel}: ${errors
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join(" | ")}`
    );
  }
}
if (!failed) pass("OKA Control TS/TSX parses successfully");

for (const rel of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file) || !/\.[tj]sx?$/.test(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  if (/Ionicons/.test(src)) {
    fail(`legacy Ionicons present in Control file ${rel}`);
  }
}
if (!failed) pass("Control surfaces use the unified Hugeicons system");

const controlHome = path.join(root, "app/(tabs)/mein-projekt.tsx");
if (fs.existsSync(controlHome)) {
  const src = fs.readFileSync(controlHome, "utf8").toLowerCase();
  for (const marker of ["oka bau · control", "jetzt wichtig", "project pulse"]) {
    if (!src.includes(marker)) fail(`control home marker missing: ${marker}`);
  }
}

const controlTabs = path.join(root, "app/(tabs)/_layout.tsx");
if (fs.existsSync(controlTabs)) {
  const src = fs.readFileSync(controlTabs, "utf8");
  for (const marker of ["Control", "Verlauf", "Medien", "Dateien", "Profil"]) {
    if (!src.includes(marker)) fail(`control tab missing: ${marker}`);
  }
}
if (!failed) pass("OKA Control navigation and home markers present");

console.log(failed ? "\nQA RESULT: FAIL" : "\nQA RESULT: PASS");
process.exit(failed ? 1 : 0);
