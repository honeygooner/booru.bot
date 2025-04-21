export const time = (fn: () => Promise<void>) => async () => {
  console.time(fn.name);
  await fn();
  console.timeEnd(fn.name);
};

export const mapByAsync = async <T, K extends PropertyKey>(
  iterable: Iterable<T> | AsyncIterable<T>,
  selector: (value: T) => K,
) => {
  const map = new Map<K, T>();

  for await (const value of iterable) {
    const key = selector(value);
    if (map.has(key)) continue;
    map.set(key, value);
  }

  return map;
};
