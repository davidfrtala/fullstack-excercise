const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface TreeNodeData {
  hash: string;
  parentHash: string | null;
  name: string;
  size: number;
}

export interface PaginatedResponse {
  data: TreeNodeData[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    nextChildrenUrl?: string;
  };
}

export interface RootResponse {
  data: TreeNodeData;
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
 * Searches for entries matching the query
 */
export async function searchEntries(
  query: string,
  cursor?: string,
  limit = 100
): Promise<PaginatedResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  if (cursor) {
    params.append('cursor', cursor);
  }

  const response = await fetch(
    `${API_BASE_URL}/entries/search?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to search entries: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches children of a node with pagination
 */
export async function fetchNodeChildren(
  hash: string,
  cursor?: string,
  limit = 100
): Promise<PaginatedResponse> {
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
