export const chunk = <T>(array: T[], size: number) => {
  const chunks: T[][] = [];
  for (let offset = 0; offset < array.length; offset += size) {
    chunks.push(array.slice(offset, offset + size));
  }
  return chunks;
};

export const time = (fn: () => Promise<void>) => async () => {
  console.info(fn.name);
  console.time(fn.name);
  await fn();
  console.timeEnd(fn.name);
};
