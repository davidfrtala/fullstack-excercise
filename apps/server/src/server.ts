import express from 'express';
import cors from 'cors';
import { ParsedEntry } from './parse';
import { createDatabase } from './db';
import {
  decodeCursor,
  buildPaginationResponse,
  type CursorData,
} from './pagination';
import morgan from 'morgan';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const db = createDatabase();
const app = express();

type EntryNody = ParsedEntry & {
  childrenUrl: string | null;
};

app.use(cors());

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.get('/entries', (req, res): void => {
  // Get the root entry (parentHash is NULL)
  const parent = db
    .prepare(
      'SELECT hash, name, size, parentHash FROM nodes WHERE parentHash IS NULL'
    )
    .get() as ParsedEntry | undefined;

  if (!parent) {
    res.status(404).json({ error: 'Root entry not found' });
    return;
  }

  const data: EntryNody = {
    ...parent,
    childrenUrl: `/entries/${parent.hash}/children`,
  };

  res.json({ data });
});

app.get('/entries/:hash/children', ({ params, query }, res) => {
  const { hash } = params;
  const limit = parseInt(query.limit as string) || 10;
  const cursor = query.cursor as string | undefined;

  // Decode cursor if provided (base64-encoded JSON with composite key {name, hash})
  const decodedCursor = decodeCursor(cursor);
  if (cursor && !decodedCursor) {
    res.status(400).json({ error: 'Invalid cursor format' });
    return;
  }

  const hasCursor = decodedCursor !== null;

  const children = db
    .prepare(
      `
        SELECT hash, name, size, parentHash
        FROM nodes 
        WHERE parentHash = ?
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
      ...(hasCursor && decodedCursor
        ? [decodedCursor.name, decodedCursor.name, decodedCursor.hash]
        : []),
      limit + 1 // +1 to check if there's more (we could do EXISTS check instead but .. naah, this is a linear set)
    ) as ParsedEntry[];

  // Check if there are more items
  const hasMore = children.length > limit;
  let lastItem: CursorData | null = null;
  if (hasMore) {
    const poppedItem = children.pop();
    if (poppedItem) {
      lastItem = { name: poppedItem.name, hash: poppedItem.hash };
    }
  }

  const result = children.map((child: ParsedEntry) => ({
    ...child,
    childrenUrl: child.size > 0 ? `/entries/${child.hash}/children` : null,
  }));

  res.json({
    data: result,
    pagination: buildPaginationResponse({
      limit,
      hasMore,
      lastItem,
      buildNextUrl: (nextCursor) =>
        `/entries/${hash}/children?limit=${limit}&cursor=${nextCursor}`,
    }),
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
  const decodedCursor = decodeCursor(cursor);
  if (cursor && !decodedCursor) {
    res.status(400).json({ error: 'Invalid cursor format' });
    return;
  }

  const hasCursor = decodedCursor !== null;

  // search anywhere in the name (case-insensitive)
  const searchTerm = `%${q.trim().toLowerCase()}%`;

  try {
    // paginate search matches and get all ancestor paths
    // Uses limit+1 to check if there are more matches
    // Use indexed name column for fast searches (much faster than REGEXP)
    const queryResult = db
      .prepare(
        `
        WITH search_matches AS (
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
            pm.parentHash,
            pm.name,
            pm.path,
            pm.size,
            0 as depth,
            pm.hash as matchHash
          FROM paginated_matches pm
          
          UNION ALL
          
          SELECT 
            n.hash, 
            n.parentHash, 
            n.name, 
            n.path, 
            n.size, 
            ap.depth + 1, 
            ap.matchHash
          FROM nodes n
          INNER JOIN ancestor_paths ap ON n.hash = ap.parentHash
        ),
        deduplicated_paths AS (
          SELECT 
            ap.*,
            ROW_NUMBER() OVER (PARTITION BY ap.hash ORDER BY ap.depth ASC, ap.matchHash ASC) as rn
          FROM ancestor_paths ap
        )
        SELECT 
          dp.hash, 
          dp.name, 
          dp.path, 
          dp.size, 
          dp.parentHash, 
          dp.depth,
          (SELECT has_more FROM has_more_flag) as has_more
        FROM deduplicated_paths dp
        WHERE dp.rn = 1
        ORDER BY dp.matchHash, dp.depth DESC
        `
      )
      .all(
        searchTerm,
        ...(hasCursor && decodedCursor
          ? [decodedCursor.name, decodedCursor.name, decodedCursor.hash]
          : []),
        limit,
        limit
      ) as (ParsedEntry & {
      parentHash: string;
      depth: number;
      matchHash: string;
      has_more: number;
    })[];

    // Extract hasMore from first row (same for all rows)
    const hasMore =
      queryResult.length > 0 ? Boolean(queryResult[0].has_more) : false;

    // Get the last search match for cursor (need to find it from results)
    let lastItem: CursorData | null = null;
    if (hasMore && queryResult.length > 0) {
      // Find the last match (depth = 0) in the results, ordered by matchHash
      const matches = queryResult.filter((r) => r.depth === 0);
      if (matches.length > 0) {
        // Get the last match by matchHash (they're already ordered)
        const lastMatch = matches[matches.length - 1];
        lastItem = { name: lastMatch.name, hash: lastMatch.hash };
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = results.map(({ has_more, ...result }) => {
      return {
        ...result,
        childrenUrl:
          result.size > 0 ? `/entries/${result.hash}/children` : null,
      };
    });

    res.json({
      data,
      pagination: buildPaginationResponse({
        limit,
        hasMore,
        lastItem,
        buildNextUrl: (nextCursor) =>
          `/entries/search?q=${encodeURIComponent(
            q as string
          )}&limit=${limit}&cursor=${nextCursor}`,
      }),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
