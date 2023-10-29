import fs from "fs";
import path from "path";
import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet + alphabet.toUpperCase() + "0123456789-", 12);

function walkDir(dir, result = {}) {
  let list = fs.readdirSync(dir);
  for (let item of list) {
    const itemPath = path.join(dir, item);
    let stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      result[item] = {};
      walkDir(itemPath, result[item]);
    } else {
      const ext = path.extname(item);
      if ([".svg", ".png", ".jpg"].includes(ext.toLowerCase())) {
        const fileName = path.basename(item);
        result[fileName] = `s${nanoid()}${path.extname(item)}`;
      }
    }
  }
  return result;
}

function testWalkDir(dir) {
  const result = walkDir(dir);
  // console.log("Result:", JSON.stringify(result, null, 2));
  const index = fs.openSync(`${dir}/index.json`, "w");
  fs.writeFileSync(index, JSON.stringify(result));
  fs.closeSync(index);
}

const args = process.argv;
const dir = args[2];

testWalkDir(dir);
