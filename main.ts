import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from './parse.js';

const inputDirectory = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const documents = JSON.parse(readFileSync(`${inputDirectory}/cases.json`, 'utf8'));
// Render each independent case once, retaining the generator's input order.
const rendered: string[] = new Array(documents.length);
for (let index = 0; index < documents.length; index++) {
  rendered[index] = parse(documents[index].markdown);
}
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(`${outputDirectory}/html.json`, JSON.stringify(rendered));
