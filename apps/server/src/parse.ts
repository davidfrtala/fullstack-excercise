import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import sax from 'sax';
import { initializeDatabase } from './db';

export interface ParsedEntry {
  hash: string;
  parentHash: string | null;
  name: string;
  path: string;
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

/**
 * Generates a hash for a given wnid and path
 * @param wnid - The wnid of the entry
 * @param path - The path of the entry
 * @returns The hash of the entry
 */
function generateHash(wnid: string, path: string): string {
  const compositeKey = `${wnid}::${path}`;
  return createHash('md5').update(compositeKey).digest('hex');
}

/**
 * Parses an XML file and returns an array of parsed entries
 * @param filePath - The path to the XML file
 * @returns An array of parsed entries
 */
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
          path,
          name: current.words,
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

/**
 * Stores an array of parsed entries in the database
 * @param entries - The array of parsed entries
 */
async function store(entries: ParsedEntry[]) {
  const db = initializeDatabase();

  // Temporarily disable foreign key constraints during bulk import
  db.pragma('foreign_keys = OFF');

  const insert = db.prepare(`
    INSERT OR REPLACE INTO nodes (hash, parentHash, name, path, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((entries: ParsedEntry[]) => {
    for (const entry of entries) {
      insert.run(
        entry.hash,
        entry.parentHash,
        entry.name,
        entry.path,
        entry.size
      );
    }
  });

  insertMany(entries);

  // Re-enable foreign key constraints
  db.pragma('foreign_keys = ON');
  db.close();

  console.log(`${entries.length} entries stored in database`);
}

/**
 * Main function to parse the XML file, store the entries in the database, and write the output to a file
 */
async function main() {
  const startTime = Date.now();

  const entries = await parseXml(xmlFilePath);
  await writeFile(outputFilePath, JSON.stringify(entries, null, 2), 'utf8');
  await store(entries);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Parsing complete in ${duration}ms`);
  console.log(`${entries.length} entries parsed`);
  console.log(`Output written to ${outputFilePath}`);
}

if (require.main === module) {
  main().catch(console.error);
}
