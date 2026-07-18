# Règles de pagination et tri stable

## Supabase / PostgreSQL Pagination & Stable Order
- **Règle :** Chaque fois que des requêtes Supabase sont paginées (via offset, range, limit ou via la fonction utilitaire `paginateQuery`), il est obligatoire d'inclure une clause de tri `.order()` déterministe et unique AVANT le `.range()` (ex: trier par clé primaire `id` ou inclure l'index unique en fin de chaîne).
- **Raison :** Sans tri déterministe, PostgreSQL ne garantit aucun ordre par défaut. Les décalages de pagination (`offset` / `range`) peuvent renvoyer des lignes en double ou en omettre certaines entre deux requêtes successives.
- **Action :** Ajouter systématiquement un `.order('id', { ascending: true })` AVANT le `.range()` en fin de requête en guise de clé de tri stable (tie-breaker) pour toute requête paginée.
