export interface PaginateOptions {
  limit?: number;
  maxIterations?: number;
  onWarning?: (message: string) => void;
}

/**
 * Executes a Supabase query with pagination loop using `.range()` to bypass the 1000 row limit.
 * @param queryFn A function returning a fresh query builder.
 * @param optionsOrLimit Configuration options or the limit page size.
 */
export async function paginateQuery<T>(
  queryFn: () => any,
  optionsOrLimit?: number | PaginateOptions
): Promise<T[]> {
  const options = typeof optionsOrLimit === 'number' 
    ? { limit: optionsOrLimit } 
    : (optionsOrLimit ?? {});

  const limit = options.limit ?? 1000;
  const maxIterations = options.maxIterations ?? 200;
  const onWarning = options.onWarning;

  let allData: T[] = [];
  let from = 0;
  let hasMore = true;
  const seenIds = new Set<any>();
  let hasSignaledDuplicate = false;
  
  let iterations = 0;

  while (hasMore) {
    iterations++;
    if (iterations > maxIterations) {
      const errMsg = `Safety limit exceeded (${maxIterations} pages). Query aborted to prevent an infinite loop.`;
      console.error(`[Supabase Pagination Error] ${errMsg}`);
      throw new Error(errMsg);
    }

    const { data, error } = await queryFn().range(from, from + limit - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      // Check for duplicate IDs across pages to detect unstable sorting
      for (const item of data) {
        if (item && typeof item === 'object' && 'id' in item) {
          const itemId = (item as any).id;
          if (seenIds.has(itemId)) {
            const warningMsg = `Duplicate ID detected: ${itemId}. The query may lack a stable .order() clause.`;
            console.warn(`[Supabase Pagination Warning] ${warningMsg}`);
            if (!hasSignaledDuplicate) {
              hasSignaledDuplicate = true;
              if (onWarning) {
                onWarning(warningMsg);
              }
            }
          }
          seenIds.add(itemId);
        }
      }

      allData.push(...data);
      if (data.length < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}
