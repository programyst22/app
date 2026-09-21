const fs = require('node:fs');
const path = require('node:path');

// Keep assembleDebug and its signing configuration, but embed the production
// JS/assets and turn off the developer server so the APK runs independently.
const gradlePath = path.join('android', 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!/react\s*\{/.test(gradle)) throw new Error('React Gradle configuration missing');
if (!/^\s*debuggableVariants = \[\]/m.test(gradle)) {
  gradle = gradle.replace(/react\s*\{/, 'react {\n    debuggableVariants = []');
}
fs.writeFileSync(gradlePath, gradle);

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/MainApplication\.(kt|java)$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('ExpoReactHostFactory.getDefaultReactHost(')) throw new Error('Expo ReactHost factory missing');
      const updated = source.includes('useDevSupport = false') ? source : source.replace(
        'ExpoReactHostFactory.getDefaultReactHost(',
        'ExpoReactHostFactory.getDefaultReactHost(\n      useDevSupport = false,'
      );
      fs.writeFileSync(file, updated);
      changed = true;
    }
  }
}
let changed = false;
visit(path.join('android', 'app', 'src', 'main', 'java'));
if (!changed) throw new Error('MainApplication not found');
console.log('Standalone debug APK configured: bundled JS, no Metro server');
