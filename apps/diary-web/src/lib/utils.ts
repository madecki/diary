export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Format YYYY-MM-DDTHH:mm for display (e.g. "Mar 17, 2026, 9:30 AM") */
export function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function truncate(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns current local date + time in YYYY-MM-DDTHH:mm for datetime-local input and API */
export function todayLocalDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function moodLabel(mood: number): string {
  if (mood <= 2) return "Very Low";
  if (mood <= 4) return "Low";
  if (mood <= 6) return "Moderate";
  if (mood <= 8) return "Good";
  return "Excellent";
}

export function moodColor(
  mood: number,
): "danger" | "warning" | "success" | "info" {
  if (mood <= 3) return "danger";
  if (mood <= 5) return "warning";
  if (mood <= 7) return "info";
  return "success";
}

/**
 * Extract plain text and word count from BlockNote block JSON.
 * Handles nested blocks (children) recursively.
 */
export function extractFromBlocks(blocks: unknown[]): {
  plainText: string;
  wordCount: number;
} {
  const lines: string[] = [];

  function traverseBlock(block: unknown): void {
    if (!block || typeof block !== "object") return;

    const b = block as {
      content?: unknown[];
      children?: unknown[];
    };

    const lineText = (b.content ?? [])
      .map((inline) => {
        if (
          inline &&
          typeof inline === "object" &&
          "text" in inline &&
          typeof (inline as { text: unknown }).text === "string"
        ) {
          return (inline as { text: string }).text;
        }
        return "";
      })
      .join("");

    if (lineText.trim()) {
      lines.push(lineText);
    }

    for (const child of b.children ?? []) {
      traverseBlock(child);
    }
  }

  for (const block of blocks) {
    traverseBlock(block);
  }

  const plainText = lines.join("\n").trim();
  const wordCount = plainText
    ? plainText.split(/\s+/).filter(Boolean).length
    : 0;

  return { plainText, wordCount };
}
