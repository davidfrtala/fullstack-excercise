// Our Cursor shape is a composite key of name and hash
// we have a duplicates of a path name under the same parent hash, so we need to use the hash to differentiate them
export interface CursorData {
  name: string;
  hash: string;
}

export interface PaginationResponse {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  nextChildrenUrl?: string;
}

/**
 * Decodes a base64-encoded cursor string into name and hash
 * @param cursor - The base64-encoded cursor string (URL-safe)
 * @returns Decoded cursor data or null if invalid
 */
export function decodeCursor(cursor: string | undefined): CursorData | null {
  if (!cursor) {
    return null;
  }

  try {
    // Convert from URL-safe base64 to standard base64
    const standardBase64 = fromUrlSafeBase64(cursor);
    const decodedString = Buffer.from(standardBase64, 'base64').toString(
      'utf-8'
    );
    const decoded = JSON.parse(decodedString);
    return {
      name: decoded.name.toLowerCase(),
      hash: decoded.hash,
    };
  } catch {
    return null;
  }
}

/**
 * Encodes cursor data (name and hash) into a URL-safe base64-encoded string
 * @param data - The cursor data to encode
 * @returns URL-safe base64-encoded cursor string
 */
export function encodeCursor(data: CursorData): string {
  const jsonString = JSON.stringify({ name: data.name, hash: data.hash });
  const base64 = Buffer.from(jsonString, 'utf-8').toString('base64');
  return toUrlSafeBase64(base64);
}

/**
 * Builds a pagination response object
 * @param options - Configuration options for pagination response
 * @returns PaginationResponse
 */
export function buildPaginationResponse(options: {
  limit: number;
  hasMore: boolean;
  lastItem?: CursorData | null;
  buildNextUrl: (cursor: string) => string;
}): PaginationResponse {
  const { limit, hasMore, lastItem, buildNextUrl } = options;

  const response: PaginationResponse = {
    limit,
    hasMore,
  };

  if (hasMore && lastItem) {
    const nextCursor = encodeCursor(lastItem);
    response.nextCursor = nextCursor;
    response.nextChildrenUrl = buildNextUrl(nextCursor);
  }

  return response;
}

/**
 * Converts standard base64 to URL-safe base64
 */
function toUrlSafeBase64(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Converts URL-safe base64 back to standard base64
 */
function fromUrlSafeBase64(urlSafe: string): string {
  let base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}
