export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const safeLimit = Math.max(1, Math.floor(limit));
  const runners = Array.from(
    { length: Math.min(safeLimit, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await worker(item);
      }
    }
  );
  await Promise.all(runners);
}
