export type SeedMetadataSummary = {
  daysToGerminateMin: number | null;
  daysToGerminateMax: number | null;
  daysToTransplantMin: number | null;
  daysToTransplantMax: number | null;
  daysToMaturity: number | null;
  sunRequirement: string | null;
  spacingCm: string | null;
};

export function formatGerminationRange(
  m: Pick<SeedMetadataSummary, "daysToGerminateMin" | "daysToGerminateMax">
): string | null {
  const { daysToGerminateMin: min, daysToGerminateMax: max } = m;
  if (min && max) return min === max ? `${min}d` : `${min}–${max}d`;
  if (min || max) return `${min ?? max}d`;
  return null;
}

export function formatTransplantRange(
  m: Pick<SeedMetadataSummary, "daysToTransplantMin" | "daysToTransplantMax">
): string | null {
  const { daysToTransplantMin: min, daysToTransplantMax: max } = m;
  if (min && max) return min === max ? `${min}d` : `${min}–${max}d`;
  if (min || max) return `${min ?? max}d`;
  return null;
}
