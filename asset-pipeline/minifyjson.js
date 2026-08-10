const path = require('path')
const fs = require('fs');

const inPath = path.resolve(process.argv[2]);
const outPath = path.resolve(process.argv[3]);

let rawData = fs.readFileSync(inPath);
let data = JSON.parse(rawData);
let minDataString = JSON.stringify(data, undefined, '');
fs.writeFileSync(outPath, minDataString, {encoding:'utf8',flag:'w'});
