const fs = require("fs");
const path = require("path");

const versionFilePath = path.resolve(__dirname, "..", "version.js");
const fileContents = fs.readFileSync(versionFilePath, "utf8");
const match = fileContents.match(/revision:\s*(\d+)/);
if(!match){
  console.error("revision field not found in version.js");
  process.exit(1);
}
const currentRevision = Number(match[1]);
if(Number.isNaN(currentRevision)){
  console.error("invalid revision in version.js");
  process.exit(1);
}
const nextRevision = currentRevision + 1;
const updatedContents = fileContents.replace(/revision:\s*\d+/, `revision: ${nextRevision}`);
fs.writeFileSync(versionFilePath, updatedContents, { encoding: "utf8" });
console.log(`Bumped revision: ${currentRevision} -> ${nextRevision}`);
