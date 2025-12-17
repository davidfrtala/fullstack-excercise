import { ParsedEntry } from '@homework/server/src/parse';

const API_BASE_URL = 'http://localhost:3000';

export interface EntryWithChildrenUrl extends ParsedEntry {
  childrenUrl: string | null;
}

export interface ChildrenResponse {
  data: EntryWithChildrenUrl[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    nextChildrenUrl?: string;
  };
}

export interface RootResponse {
  data: EntryWithChildrenUrl;
}

/**
 * Fetches the root entry of the tree
 */
export async function fetchRoot(): Promise<RootResponse> {
  const response = await fetch(`${API_BASE_URL}/entries`);
  if (!response.ok) {
    throw new Error('Failed to fetch root entry');
  }
  return response.json();
}

/**
 * Fetches children of a node with pagination
 */
export async function fetchNodeChildren(
  hash: string,
  cursor?: string,
  limit = 10
): Promise<ChildrenResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  if (cursor) {
    params.append('cursor', cursor);
  }

  const response = await fetch(
    `${API_BASE_URL}/entries/${hash}/children?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch children for node ${hash}`);
  }
  return response.json();
}
