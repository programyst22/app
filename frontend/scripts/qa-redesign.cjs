#!/usr/bin/env node
/**
 * OKA Bau Fazora redesign integration QA.
 * Run from frontend/: node scripts/qa-redesign.cjs
 *
 * This deliberately performs only deterministic local checks.
 * Follow with:
 *   npx tsc --noEmit
 *   npx expo lint
 *   npx expo-doctor
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const required = [
  "app/_layout.tsx",
  "app/(tabs)/index.tsx",
  "app/(tabs)/mein-projekt.tsx",
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
const fail = (m) => { failed = true; console.error("FAIL:", m); };
const pass = (m) => console.log("PASS:", m);

for (const rel of [...required, ...dependencyFiles]) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}
if (!failed) pass("required redesign + original dependency files exist");

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
  if (!failed) pass("redesign dependencies declared");
}

for (const rel of required.filter(x => /\.[tj]sx?$/.test(x))) {
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
    d => d.category === ts.DiagnosticCategory.Error
  );
  if (errors.length) {
    fail(`${rel}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ")}`);
  }
}
if (!failed) pass("redesign TS/TSX parses successfully");

const scanRoots = ["app", "src/components/premium.tsx", "src/components/project-sections.tsx"];
for (const rel of scanRoots) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const files = fs.statSync(p).isDirectory()
    ? walk(p).filter(f => /\.[tj]sx?$/.test(f))
    : [p];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    // New premium screens should not introduce direct Ionicons usage.
    if (required.some(r => path.normalize(f).endsWith(path.normalize(r))) && /Ionicons/.test(src)) {
      fail(`legacy Ionicons present in premium file ${path.relative(root, f)}`);
    }
  }
}
if (!failed) pass("premium redesign files are free of direct Ionicons usage");

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

console.log(failed ? "\nQA RESULT: FAIL" : "\nQA RESULT: PASS");
process.exit(failed ? 1 : 0);
