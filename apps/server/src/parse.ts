import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import sax from 'sax';

interface OutputEntry {
  hash: string;
  name: string;
  size: number;
}

interface StackFrame {
  wnid: string;
  words: string;
  childCount: number;
}

const ASSETS_PATH = path.join(__dirname, 'assets');
const XML_FILE_PATH = path.join(ASSETS_PATH, 'structure_released.xml');
const OUTPUT_FILE_PATH = path.join(ASSETS_PATH, 'out.json');

function generateHash(wnid: string, path: string): string {
  const compositeKey = `${wnid}::${path}`;
  return createHash('md5').update(compositeKey).digest('hex');
}

async function parseXml(filePath: string): Promise<OutputEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: OutputEntry[] = [];
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

        // Create entry (without wnid - deduplicating by name only)
        const entry: OutputEntry = {
          hash: generateHash(current.wnid, path),
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

const startTime = Date.now();
parseXml(XML_FILE_PATH)
  .then(async (entries) =>
    writeFile(OUTPUT_FILE_PATH, JSON.stringify(entries, null, 2), 'utf8')
  )
  .then(() => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Parsing complete in ${duration}ms`);
    console.log(`Output written to ${OUTPUT_FILE_PATH}`);
  })
  .catch(console.error);
