export const time = (fn: () => Promise<void>) => async () => {
  console.info(fn.name);
  console.time(fn.name);
  await fn();
  console.timeEnd(fn.name);
};
