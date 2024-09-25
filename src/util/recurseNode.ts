/**
 * a utility type that takes an object and recursively flattens it into an array of all its object children
 * so { a: { b: { c: 1 } } } becomes { b: { c: 1 } } | { c: 1 }
 */
export type AllChildren<T> = Extract<
  T extends Record<string | number | symbol, unknown>
    ? // map over each value in the object, and if it's an object, include it in the union
      T[keyof T] extends Record<string | number | symbol, unknown>
      ? T[keyof T] | AllChildren<T[keyof T]>
      : T[keyof T]
    : never,
  Record<string | number | symbol, unknown>
>;

export const recurseNode = <
  T extends Record<string | number | symbol, unknown>
>(
  obj: T
): AllChildren<T>[] => {
  const children = Object.values(obj).filter(
    (value): value is Record<string | number, unknown> =>
      typeof value === "object" && value !== null
  );

  return children.flatMap((child) => [
    child,
    ...recurseNode(child),
  ]) as unknown as AllChildren<T>[];
};
