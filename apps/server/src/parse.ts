import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import sax from 'sax';

export interface ParsedEntry {
  hash: string;
  parentHash: string | null;
  name: string;
  size: number;
}

export interface StackFrame {
  wnid: string;
  words: string;
  childCount: number;
}

const ASSETS_PATH = path.join(__dirname, 'assets');
const xmlFilePath = path.join(ASSETS_PATH, 'structure_released.xml');
const outputFilePath = path.join(ASSETS_PATH, 'out.json');

function generateHash(wnid: string, path: string): string {
  const compositeKey = `${wnid}::${path}`;
  return createHash('md5').update(compositeKey).digest('hex');
}

async function parseXml(filePath: string): Promise<ParsedEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ParsedEntry[] = [];
    const stack: StackFrame[] = [];

    const saxStream = sax.createStream(true, { trim: true });

    saxStream.on('opentag', (node) => {
      if (node.name === 'synset') {
        const { wnid, words } = node.attributes as {
          wnid: string;
          words: string;
        };

        // Push current synset onto stack
        stack.push({ wnid, words, childCount: 0 });

        // Increment parent's child count
        if (stack.length > 1) {
          stack[stack.length - 2].childCount++;
        }
      }
    });

    saxStream.on('closetag', (tagName) => {
      if (tagName === 'synset') {
        const current = stack.pop() as StackFrame;

        // Build full path from stack
        const path = [...stack.map((s) => s.words), current.words].join(' > ');

        // Calculate current entry's hash
        const hash = generateHash(current.wnid, path);

        // Calculate parent hash (if parent exists)
        let parentHash: string | null = null;
        if (stack.length > 0) {
          // Build parent path
          const parentPath = stack.map((s) => s.words).join(' > ');
          // Get parent from stack
          const parent = stack[stack.length - 1];
          parentHash = generateHash(parent.wnid, parentPath);
        }

        // Create entry (without wnid - deduplicating by name only)
        const entry: ParsedEntry = {
          hash,
          parentHash,
          name: path,
          size: current.childCount,
        };

        entries.push(entry);

        // Propagate descendant count up to parent
        if (stack.length > 0) {
          stack[stack.length - 1].childCount += current.childCount;
        }
      }
    });

    saxStream.on('end', () => {
      resolve(entries);
    });
    saxStream.on('error', reject);

    createReadStream(filePath, { encoding: 'utf8' }).pipe(saxStream);
  });
}

async function main() {
  const startTime = Date.now();

  const entries = await parseXml(xmlFilePath);
  await writeFile(outputFilePath, JSON.stringify(entries, null, 2), 'utf8');

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Parsing complete in ${duration}ms`);
  console.log(`${entries.length} entries parsed`);
  console.log(`Output written to ${outputFilePath}`);
}

if (require.main === module) {
  main().catch(console.error);
}
