# Server Architecture

## Overview

The server parses a large XML file containing hierarchical data (WordNet structure) and exposes it via a REST API with lazy-loading and pagination support.

## XML Parsing

### Approach: SAX Stream Parser

We use `sax` library with a streaming parser (`saxStream`) to process the XML file.

**Why streaming over DOM parsing?**

- The XML file is very large (think about millions of lines)
- DOM parsers load the entire file into memory, which would be inefficient
- Streaming allows us to process the file incrementally with constant memory usage
- We only need to track the current path stack, not the entire tree structure

**Alternative approaches considered:**

- **DOM parsers** (e.g., `xmldom`): Rejected due to memory constraints
- **Pre-processing to JSON**: Would require an extra step, streaming directly is more efficient

### Parsing Goal

The parser extracts tuples of `(namePath: string, size: number)` where:

- `namePath`: Full hierarchical path (e.g., "ImageNet 2011 Fall Release > plant > phytoplankton")
- `size`: Number of direct children

### Duplicate Handling & Composite Keys

During parsing, we discovered that the same `namePath` can appear multiple times with:

- Different `wnid` (WordNet ID) values
- Different glossary definitions

Since `namePath` alone cannot serve as a unique identifier, we create a composite key:

- **Hash**: MD5 hash of `wnid::path` combination
- This ensures uniqueness while maintaining referential integrity

### Tree Structure: Adjacency List

The parsed data is stored as an adjacency list:

- Each node has a `hash` (primary key) and `parentHash` (foreign key)
- This allows efficient tree traversal and lazy-loading
- The `parentHash` relationship enables building the tree structure on-demand

## Database

### Choice: SQLite

Definitelly not a production pick, but in this case the database actually doesn't really matter, so we picked a simple SQLite that is sufficient for this demo. We don't have any ACID requirements, document storage would also work

### Schema

```sql
CREATE TABLE nodes (
  -- our unique composite key of (wind, path)
  hash TEXT PRIMARY KEY,
  -- adjacency
  parentHash TEXT,
  -- words
  name TEXT,
  -- full path in a tree
  path TEXT,
  -- count the total offspring
  size INTEGER,
  FOREIGN KEY (parentHash) REFERENCES nodes(hash)
)
```

## API Endpoints

### `GET /entries`

Returns the root entry (node where `parentHash IS NULL`).

**Response:**

```json
{
  "data": {
    "hash": "...",
    "name": "...",
    "size": 123,
    "parentHash": null,
    "childrenUrl": "/entries/{hash}/children"
  }
}
```

### `GET /entries/:hash/children`

Returns paginated children of a specific node.

**Query Parameters:**

- `limit` (optional, default: 10): Number of items per page
- `cursor` (optional): Base64-encoded pagination cursor

**Response:**

```json
{
  "data": [
    {
      "hash": "...",
      "name": "...",
      "size": 5,
      "parentHash": "...",
      "childrenUrl": "/entries/{hash}/children" // null if size = 0
    }
  ],
  "pagination": {
    "limit": 10,
    "hasMore": true,
    "nextCursor": "...",
    "nextChildrenUrl": "/entries/{hash}/children?limit=10&cursor=..."
  }
}
```

### `GET /entries/search?q={query}`

Searches nodes by name (case-insensitive, partial match).

**Query Parameters:**

- `q` (required): Search query
- `limit` (optional, default: 10): Number of items per page
- `cursor` (optional): Pagination cursor

**Response:**
Returns matching nodes with their full ancestor paths, enabling the frontend to display the complete hierarchy.

## Lazy-Loading & Pagination

### Lazy-Loading

Children are loaded on-demand:

- Root entry is fetched via `/entries`
- Each node includes a `childrenUrl` if it has children (`size > 0`)
- Frontend requests children only when a node is expanded
- This avoids loading the entire tree upfront

### Pagination

**Cursor-based pagination** is used for efficient, stable pagination. Alternative we have a classic pagination by "page: 2" but cursor based pagination is more suitable for infinite scrolls.

1. Base64-encoded JSON containing `{name, hash}` composite key
2. Since duplicate names can exist under the same parent, we need both `name` and `hash` to uniquely identify the position
3. Results are sorted by `LOWER(name) ASC, hash ASC` for consistent ordering

> We return not only the matches, but I the ancestral path nodes, so the frontend can easily reconstruct the tree

**Benefits:**

- Stable across data changes (unlike offset-based)
- Efficient (no need to skip rows)
- Works correctly with duplicate names
