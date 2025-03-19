export const parseNumber = (
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number,
): number => {
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
};

export const parseString = <T extends string>(
  value: string | undefined,
  defaultValue: T,
  validValues?: T[],
): T => {
  if (value === undefined || value === '') return defaultValue;
  if (validValues && !validValues.includes(value as T)) return defaultValue;
  return value as T;
};
