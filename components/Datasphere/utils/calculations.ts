export function calculateRelativeSizePercent<T extends Record<string, any>>(
  array: T[],
  sizeProperty: keyof T
): (T & { sizePercent: number })[] {
  if (array.length === 0) return [];

  const values = array.map(obj => obj[sizeProperty] as number);
  const minSize = Math.min(...values);
  const maxSize = Math.max(...values);
  const sizeRange = maxSize - minSize;

  console.log('DEBUG - Size Calculation:', {
    sizeProperty,
    values,
    minSize,
    maxSize,
    sizeRange
  });

  return array.map(obj => {
    const sizePercent = sizeRange > 0 
      ? ((obj[sizeProperty] as number - minSize) / sizeRange) * 100 
      : 100;
    
    console.log('DEBUG - Individual Size:', {
      value: obj[sizeProperty],
      sizePercent
    });

    return {
      ...obj,
      sizePercent
    };
  });
}

export function calculatePercentRanks<T extends Record<string, any>>(
  array: T[],
): (T & { percentRank: number })[] {
  if (array.length === 0) return [];

  const values = array.map(item => item.sizePercent as number);
  values.sort((a, b) => a - b);
  
  return array.map(item => {
    const value = item.sizePercent as number;
    const rank = values.filter(v => v < value).length;
    return {
      ...item,
      percentRank: array.length <= 1 ? 100 : (rank / (array.length - 1)) * 100
    };
  });
}