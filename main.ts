import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from './parse.js';

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(`${input}/cases.json`, 'utf8'));
// Render directly into the final array, without retaining per-case metadata.
const html: string[] = new Array(cases.length);
for (let i = 0; i < cases.length; ++i) {
  html[i] = parse(cases[i].markdown);
}
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/html.json`, JSON.stringify(html));
