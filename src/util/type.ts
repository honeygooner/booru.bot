export type FilterRecord<T, U> = {
  [key in keyof T as T[key] extends U ? key : never]: T[key];
};
