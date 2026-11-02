type Region = { id: string; name: string };
const curated = [
  { id: 'edc', name: 'Every day carry' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'things-for-you', name: 'For you' },
];

// Input is the catalog visible to this page; preserve its ordering for extra regions.
export function homeCategories(regions: readonly Region[]) {
  const used = new Set<string>();
  const entries = curated.map(category => {
    const region = regions.find(region => !used.has(region.id) && region.id === category.id)
      ?? regions.find(region => !used.has(region.id) && region.name.toLowerCase() === category.name.toLowerCase());
    if (region) used.add(region.id);
    return { ...category, regionId: region?.id };
  });
  return [...entries, ...regions.filter(region => !used.has(region.id)).map(region => ({ ...region, regionId: region.id }))];
}
