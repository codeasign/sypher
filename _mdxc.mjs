import { compile } from "@mdx-js/mdx";
import { readFileSync } from "node:fs";

const REPO_ROOT = "D:/jenny/sypher";
const files = process.argv.slice(2);

let allOk = true;
for (const rel of files) {
  const full = REPO_ROOT + "/" + rel;
  let source = readFileSync(full, "utf8");
  source = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  try {
    await compile(source, { jsx: true });
    console.log(`OK   ${rel}`);
  } catch (err) {
    allOk = false;
    console.log(`FAIL ${rel}\n     ${err.message.split("\n").join("\n     ")}`);
  }
}
process.exit(allOk ? 0 : 1);
