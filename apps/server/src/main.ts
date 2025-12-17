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
  children_url: string | null;
};

app.use(cors());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.get('/entries', (req, res): void => {
  // Get the root entry (parent_hash is NULL)
  const parent = db
    .prepare('SELECT * FROM nodes WHERE parent_hash IS NULL')
    .get() as ParsedEntry | undefined;

  if (!parent) {
    res.status(404).json({ error: 'Root entry not found' });
    return;
  }

  const data: EntryNody = {
    ...parent,
    children_url: `/entries/${parent.hash}/children`,
  };

  res.json({ data });
});

app.get('/entries/:hash/children', ({ params, query }, res) => {
  const { hash } = params;
  const limit = parseInt(query.limit as string) || 10;
  const cursor = query.cursor as string | undefined;

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

  const children = db
    .prepare(
      `
        SELECT *
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
      hash,
      ...(hasCursor ? [cursorName, cursorName, cursorHash] : []),
      limit + 1 // +1 to check if there's more (we could do EXISTS check instead but .. naah, this is a linear set)
    ) as ParsedEntry[];

  // Check if there are more items
  const hasMore = children.length > limit;
  if (hasMore) {
    // Remove the extra item and use it for the cursor
    const lastItem = children.pop();
    if (lastItem) {
      // Encode cursor as base64 JSON
      nextCursor = Buffer.from(
        JSON.stringify({ name: lastItem.name, hash: lastItem.hash })
      ).toString('base64');
    }
  }

  const result = children.map((child: ParsedEntry) => ({
    ...child,
    children_url: child.size > 0 ? `/entries/${child.hash}/children` : null,
  }));

  res.json({
    data: result,
    pagination: {
      limit,
      hasMore,
      ...(nextCursor && {
        nextCursor,
        nextChildrenUrl: `/entries/${hash}/children?limit=${limit}&cursor=${nextCursor}`,
      }),
    },
  });
});

app.get('/entries/search', ({ query }, res) => {
  const { q } = query;
  const limit = parseInt(query.limit as string) || 10;
  const cursor = query.cursor as string | undefined;

  // Return empty array if no search query provided
  if (!q || typeof q !== 'string' || q.trim() === '') {
    res.json({ data: [], pagination: { limit, hasMore: false } });
    return;
  }

  // Decode cursor if provided (base64-encoded JSON with composite key {name, hash})
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

  // search only the last segment of the name (case-insensitive)
  // Match at the end of the last segment only
  const searchTerm = `%${q.trim().toLowerCase()}`;

  try {
    // paginate search matches and get all ancestor paths
    // Uses limit+1 to check if there are more matches
    const queryResult = db
      .prepare(
        `
        WITH RECURSIVE search_matches AS (
          SELECT
          n.*,
            0 as depth,
            ROW_NUMBER() OVER (ORDER BY LOWER(n.name) ASC, n.hash ASC) as row_num
          FROM nodes n
          WHERE LOWER(n.name) LIKE ?
          ${
            hasCursor
              ? `AND (LOWER(n.name) > ? OR (LOWER(n.name) = ? AND n.hash > ?))`
              : ''
          }
        ),
        paginated_matches AS (
          SELECT * FROM search_matches WHERE row_num <= ?
        ),
        has_more_flag AS (
          SELECT EXISTS(SELECT 1 FROM search_matches WHERE row_num = ? + 1) as has_more
        ),
        ancestor_paths AS (
          SELECT 
            pm.hash,
            pm.parent_hash,
            pm.name,
            pm.size,
            0 as depth,
            pm.hash as match_hash
          FROM paginated_matches pm
          
          UNION ALL
          
          SELECT 
            n.hash, 
            n.parent_hash, 
            n.name, 
            n.size, 
            ap.depth + 1, 
            ap.match_hash
          FROM nodes n
          INNER JOIN ancestor_paths ap ON n.hash = ap.parent_hash
        )
        SELECT 
          ap.*,
          (SELECT has_more FROM has_more_flag) as has_more
        FROM ancestor_paths ap
        ORDER BY ap.match_hash, ap.depth DESC
        `
      )
      .all(
        searchTerm,
        ...(hasCursor ? [cursorName, cursorName, cursorHash] : []),
        limit,
        limit
      ) as (ParsedEntry & {
      parent_hash: string;
      depth: number;
      match_hash: string;
      has_more: number;
    })[];

    // Extract hasMore from first row (same for all rows)
    const hasMore =
      queryResult.length > 0 ? Boolean(queryResult[0].has_more) : false;

    // Get the last search match for cursor (need to find it from results)
    let nextCursor: string | null = null;
    if (hasMore && queryResult.length > 0) {
      // Find the last match (depth = 0) in the results, ordered by match_hash
      const matches = queryResult.filter((r) => r.depth === 0);
      if (matches.length > 0) {
        // Get the last match by match_hash (they're already ordered)
        const lastMatch = matches[matches.length - 1];
        nextCursor = Buffer.from(
          JSON.stringify({ name: lastMatch.name, hash: lastMatch.hash })
        ).toString('base64');
      }
    }

    // If no results, return empty
    if (queryResult.length === 0) {
      res.json({
        data: [],
        tree: {},
        pagination: {
          limit,
          hasMore: false,
        },
      });
      return;
    }

    const results = queryResult;

    const data = results.map((result) => {
      return {
        ...result,
        parentHash: result.parent_hash,
        children_url:
          result.size > 0 ? `/entries/${result.hash}/children` : null,
      };
    });

    res.json({
      data,
      pagination: {
        limit,
        hasMore,
        ...(nextCursor && {
          nextCursor,
          nextChildrenUrl: `/entries/search?q=${encodeURIComponent(
            q
          )}&limit=${limit}&cursor=${nextCursor}`,
        }),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
