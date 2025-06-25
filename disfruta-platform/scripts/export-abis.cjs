// scripts/export-abis.js
const fs   = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.resolve(__dirname, '../artifacts/contracts');
const ABIS_DIR      = path.resolve(__dirname, '../src/abis');

// ensure output folder exists
fs.rmSync(ABIS_DIR, { recursive: true, force: true });
fs.mkdirSync(ABIS_DIR, { recursive: true });

// for each contract subfolder
fs.readdirSync(ARTIFACTS_DIR).forEach(contractFolder => {
  const fullFolder = path.join(ARTIFACTS_DIR, contractFolder);
  fs.readdirSync(fullFolder).forEach(jsonFile => {
    if (jsonFile.endsWith('.json')) {
      const artifact = require(path.join(fullFolder, jsonFile));
      const outPath  = path.join(ABIS_DIR, jsonFile);
      fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2));
      console.log(`→ exported ${jsonFile}`);
    }
  });
});
