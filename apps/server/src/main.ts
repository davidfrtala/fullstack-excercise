import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ParsedEntry } from './parse';
import { createDatabase } from './db';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const treePath = path.join(__dirname, 'assets', 'tree.json');
const treeData = JSON.parse(fs.readFileSync(treePath, 'utf-8'));

const db = createDatabase();
const app = express();

type EntryNody = ParsedEntry & {
  childrenUrl: string | null;
};

app.use(cors());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.get('/entries', (req, res): void => {
  // Get the root entry (parent_hash is NULL)
  const parent = db
    .prepare(
      'SELECT hash, parent_hash as parentHash, name, size FROM nodes WHERE parent_hash IS NULL'
    )
    .get() as ParsedEntry | undefined;

  if (!parent) {
    res.status(404).json({ error: 'Root entry not found' });
    return;
  }

  const data: EntryNody = {
    ...parent,
    childrenUrl: `/entries/${parent.hash}`,
  };

  res.json({ data });
});

app.get('/entries/:parentHash', ({ params, query }, res) => {
  const { parentHash } = params;
  const limit = parseInt(query.limit as string) || 5;
  const cursor = query.cursor as string | undefined;

  let children: ParsedEntry[];
  let nextCursor: string | null = null;

  // Decode cursor if provided (base64-encoded JSON with composite key {name, hash})
  // we have a duplicates of a path name under the same parent hash, so we need to use the hash to differentiate them
  let cursorName: string | null = null;
  let cursorHash: string | null = null;

  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      );
      cursorName = decoded.name.toLowerCase();
      cursorHash = decoded.hash;
    } catch {
      res.status(400).json({ error: 'Invalid cursor format' });
      return;
    }
  }

  const hasCursor = cursorName && cursorHash;

  children = db
    .prepare(
      `
        SELECT hash, parent_hash as parentHash, name, size 
        FROM nodes 
        WHERE parent_hash = ?
        ${
          hasCursor
            ? `AND (LOWER(name) > ? OR (LOWER(name) = ? AND hash > ?))`
            : ''
        }
        ORDER BY LOWER(name) ASC, hash ASC
        LIMIT ?
      `
    )
    .all(
      parentHash,
      ...(hasCursor ? [cursorName, cursorName, cursorHash] : []),
      limit + 1
    ) as ParsedEntry[]; // +1 to check if there's more

  // Check if there are more items
  const hasMore = children.length > limit;
  if (hasMore) {
    children = children.slice(0, limit);
    const lastItem = children[children.length - 1];
    // Encode cursor as base64 JSON
    nextCursor = Buffer.from(
      JSON.stringify({ name: lastItem.name, hash: lastItem.hash })
    ).toString('base64');
  }

  const result = children.map((child: ParsedEntry) => ({
    ...child,
    childrenUrl: child.size > 0 ? `/entries/${child.hash}` : null,
  }));

  res.json({
    data: result,
    pagination: {
      limit,
      hasMore,
      ...(nextCursor && {
        nextCursor,
        nextChildrenUrl: `/entries/${parentHash}?limit=${limit}&cursor=${nextCursor}`,
      }),
    },
  });
});

app.get('/entries/search', ({ query }, res) => {
  const { q } = query;
  res.json([]);
});

app.get('/tree', (req, res) => {
  res.json(treeData);
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
