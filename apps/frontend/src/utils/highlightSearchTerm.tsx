/**
 * Splits text by search term (case-insensitive) and returns segments with match indicators
 */
export function splitTextBySearchTerm(
  text: string,
  searchTerm: string
): Array<{ text: string; isMatch: boolean }> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [{ text, isMatch: false }];
  }

  const normalizedText = text.toLowerCase();
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;
  let currentIndex = normalizedText.indexOf(normalizedSearchTerm, lastIndex);

  while (currentIndex !== -1) {
    // Add text before the match
    if (currentIndex > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, currentIndex),
        isMatch: false,
      });
    }

    // Add the match
    segments.push({
      text: text.substring(currentIndex, currentIndex + searchTerm.length),
      isMatch: true,
    });

    lastIndex = currentIndex + searchTerm.length;
    currentIndex = normalizedText.indexOf(normalizedSearchTerm, lastIndex);
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isMatch: false,
    });
  }

  // If no matches found, return the whole text
  if (segments.length === 0) {
    return [{ text, isMatch: false }];
  }

  return segments;
}

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

/**
 * Component that highlights search terms in text
 * Uses background color to highlight matching text
 */
export function HighlightedText({
  text,
  searchTerm,
  className = '',
}: HighlightedTextProps) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return <span className={className}>{text}</span>;
  }

  const segments = splitTextBySearchTerm(text, searchTerm);

  return (
    <span className={`block truncate ${className}`}>
      {segments.map((segment, index) => {
        if (segment.isMatch) {
          return (
            <mark key={index} className="bg-yellow-200 rounded px-0.5">
              {segment.text}
            </mark>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </span>
  );
}
