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

  res.json(data);
});

app.get('/entries/:parentHash', (req, res) => {
  const { parentHash } = req.params;

  const children = db
    .prepare(
      'SELECT hash, parent_hash as parentHash, name, size FROM nodes WHERE parent_hash = ?'
    )
    .all(parentHash) as ParsedEntry[];

  const result = children.map((child: ParsedEntry) => {
    return {
      ...child,
      childrenUrl: child.size > 0 ? `/entries/${child.hash}` : null,
    };
  });

  res.json(result);
});

app.get('/tree', (req, res) => {
  res.json(treeData);
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
