import Y, { PointFix } from "./y";

export const toChars = (text: string): string[] => [
  ...((text as unknown) as string[])
];

export const map = <A, B>(transform: (input: A) => B): ((list: A[]) => B[]) =>
  Y<A[], B[]>(f => ([head, ...tail]) =>
    head ? [transform(head), ...f(tail)] : []
  );

type Reducer<T> = (previous: T) => (current: T) => T;

const applyReduce = <T>(
  reducer: Reducer<T>
): PointFix<T, (list: T[]) => T> => f => acc => ([head, ...tail]): T =>
  head ? f(reducer(acc)(head))(tail) : acc;

export const reduce = <T>(reducer: Reducer<T>): ((list: T[]) => T) => ([
  head,
  ...tail
]) => Y(applyReduce(reducer))(head)(tail);

export const reduceWithStart = <T>(
  reducer: Reducer<T>
): ((start: T) => (list: T[]) => T) => Y(applyReduce(reducer));

export const concat = <T>(list1: T[]) => (list2: T[]): T[] => [
  ...list1,
  ...list2
];
