/*const path = require('node:path');
const fs = require('fs');
const { readdirSync } = require('node:fs');

console.log('preprocessor.js');

let targetDir = './src/RendererFiles';
//import { readdir } from 'node:fs/promises';

const entries = readdirSync(targetDir, { withFileTypes: true });

for (const entry of entries) {
    if (entry.isFile()) {
        if (path.extname(entry.name) === '.js') {
            console.log(`File: ${entry.name}`);
        }
    }
    else if (entry.isDirectory()) {
        console.log(`Directory: ${entry.name}`);
    }
}
*/

/*
Google AI Overview "javascript simple bundler that just moves all the files into one":
############```paraphraseStart
...

If you need a script that reads an entire folder of JavaScript files automatically instead of defining them manually,
let me know and I can adapt the script for you.
############```paraphraseEnd

// ...continued with "reads an entire folder of JavaScript files automatically"
=> the initial code

// ...continued with "sort by { "widgetGlobal.js",
    "menuGlobal.js",
    "dialogGlobal.js",
    "trackedSyntaxTypes.js",
    "treeViewComponent.js",
    "dialogImplementationsGlobal.js",
    "listComponent.js",
    "listTypes.js",
    "editorGlobal.js",
    "javascriptFeatures.js",
    "explorerGlobal.js",
    "applicationRendererRoot.js", }"
*/

const fs = require('fs');
const path = require('path');

const inputFolder = './src/RendererFiles';
const outputFile = './preprocessor/__PREPROCESSEDbundle__.js';

// 1. Define the exact loading priority order
const filePriorityOrder = [
  "widgetGlobal.js",
  "menuGlobal.js",
  "dialogGlobal.js",
  "trackedSyntaxTypes.js",
  "treeViewComponent.js",
  "dialogImplementationsGlobal.js",
  "listComponent.js",
  "listTypes.js",
  "editorGlobal.js",
  "javascriptFeatures.js",
  "explorerGlobal.js",
  "applicationRendererRoot.js"
];

try {
  // 2. Read the directory and filter for .js files
  let files = fs.readdirSync(inputFolder).filter(file => file.endsWith('.js'));

  // 3. Sort files based on your custom priority array
  files.sort((a, b) => {
    const indexA = filePriorityOrder.indexOf(a);
    const indexB = filePriorityOrder.indexOf(b);

    // If both files are in the priority list, sort by their array position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    
    // If only file A is in the list, move it ahead of file B
    if (indexA !== -1) return -1;
    
    // If only file B is in the list, move it ahead of file A
    if (indexB !== -1) return 1;

    // If neither file is in the list, fall back to default alphabetical order
    return a.localeCompare(b);
  });

  if (files.length === 0) {
    console.log(`No JavaScript files found in ${inputFolder}`);
    process.exit(0);
  }

  // 4. Combine the contents using the sorted paths
  const combinedCode = files.map(fileName => {
    const filePath = path.join(inputFolder, fileName);
    return fs.readFileSync(filePath, 'utf-8');
  }).join('\n\n');

  // 5. Save the output bundle
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, combinedCode);

  console.log(`Successfully bundled ${files.length} files in prioritized order into ${outputFile}`);
} catch (err) {
  console.error('Bundling failed:', err.message);
}
