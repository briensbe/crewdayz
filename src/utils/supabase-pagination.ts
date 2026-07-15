import { ToastService } from '../app/services/toast.service';

/**
 * Executes a Supabase query with pagination loop using `.range()` to bypass the 1000 row limit.
 * @param queryFn A function returning a fresh query builder.
 * @param limit The page size (default 1000)
 */
export async function paginateQuery<T>(queryFn: () => any, limit: number = 1000): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;
  const seenIds = new Set<any>();
  let hasSignaledDuplicate = false;

  while (hasMore) {
    const { data, error } = await queryFn().range(from, from + limit - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      // Check for duplicate IDs across pages to detect unstable sorting
      for (const item of data) {
        if (item && typeof item === 'object' && 'id' in item) {
          const itemId = (item as any).id;
          if (seenIds.has(itemId)) {
            console.warn(`[Supabase Pagination Warning] Duplicate ID detected: ${itemId}. The query may lack a stable .order() clause.`);
            if (!hasSignaledDuplicate) {
              hasSignaledDuplicate = true;
              const toastService = ToastService.getInstance();
              if (toastService) {
                toastService.warning(
                  `Attention : Des doublons d'identifiants (${itemId}) ont été détectés lors de la récupération des données. La clause .order() de tri stable est probablement absente ou incomplète sur cette requête.`
                );
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
