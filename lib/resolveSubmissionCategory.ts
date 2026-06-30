import type { Category } from '../services/models';

/** Split hierarchical selector values ("Parent → Child" or "Parent -> Child"). */
export function splitCategorySelectorValue(value: string): { parent?: string; child?: string } {
  const normalized = String(value || '').trim();
  if (!normalized) return {};

  const arrowMatch = normalized.split(/\s*(?:→|->)\s*/);
  if (arrowMatch.length >= 2) {
    return {
      parent: arrowMatch[0]?.trim() || undefined,
      child: arrowMatch.slice(1).join(' → ').trim() || undefined,
    };
  }

  return { child: normalized };
}

/**
 * Resolve a Category Selector / Award Selector response to a categories.id.
 * Hierarchical options map to the leaf (child) category when present.
 */
export function resolveCategoryIdFromSelectorValue(
  categories: Pick<Category, 'id' | 'title' | 'parentId'>[],
  selectorValue?: string | null,
): string | null {
  const value = typeof selectorValue === 'string' ? selectorValue.trim() : '';
  if (!value || value === 'General') return null;

  const byId = new Map(categories.map((category) => [category.id, category]));
  if (byId.has(value)) return value;

  const byTitle = new Map(categories.map((category) => [category.title.toLowerCase(), category]));
  const exact = byTitle.get(value.toLowerCase());
  if (exact) return exact.id;

  const { parent, child } = splitCategorySelectorValue(value);
  if (child) {
    const childMatches = categories.filter((category) => category.title.toLowerCase() === child.toLowerCase());
    if (childMatches.length === 1) return childMatches[0].id;

    if (parent) {
      const parentCategory = categories.find(
        (category) => !category.parentId && category.title.toLowerCase() === parent.toLowerCase(),
      );
      if (parentCategory) {
        const scopedChild = categories.find(
          (category) =>
            category.parentId === parentCategory.id &&
            category.title.toLowerCase() === child.toLowerCase(),
        );
        if (scopedChild) return scopedChild.id;
      }
    }
  }

  return null;
}
