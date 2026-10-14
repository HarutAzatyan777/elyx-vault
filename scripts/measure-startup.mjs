import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const html = readFileSync('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!entry) throw new Error('Production entry was not found. Build first.');
const seen = new Set(),
  chunks = [];
function visit(file) {
  const absolute = path.resolve('dist', file.replace(/^\//, ''));
  if (seen.has(absolute)) return;
  seen.add(absolute);
  const bytes = readFileSync(absolute),
    source = bytes.toString();
  chunks.push({
    file: path.relative('dist', absolute),
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
  });
  for (const match of source.matchAll(
    /(?:import|export)\s*(?:[^;'"()]*?\s*from\s*)?['"](\.\/[^'"]+\.js)['"]/g,
  ))
    visit(
      path.relative(
        path.resolve('dist'),
        path.resolve(path.dirname(absolute), match[1]),
      ),
    );
}
visit(entry);
const report = {
  method:
    'Static import graph from production HTML entry; dynamic app chunks excluded',
  baselineTask08: { approxBytes: 1852940, approxGzipBytes: 518990 },
  current: {
    bytes: chunks.reduce((total, item) => total + item.bytes, 0),
    gzipBytes: chunks.reduce((total, item) => total + item.gzipBytes, 0),
    chunks,
  },
};
report.reductionPercent = Number(
  (
    (1 - report.current.gzipBytes / report.baselineTask08.approxGzipBytes) *
    100
  ).toFixed(1),
);
writeFileSync(
  'docs/task-09-performance.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
