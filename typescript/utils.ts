import Y, { PointFix } from "./y";

export const toChars = (text: string): string[] => [
  ...((text as unknown) as string[])
];

export const map = <A, B>(transform: (input: A) => B): ((list: A[]) => B[]) =>
  Y<A[], B[]>(f => ([head, ...tail]) =>
    head ? [transform(head), ...f(tail)] : []
  );

type Reducer<A, B> = (previous: A) => (current: B) => A;

const applyReduce = <A, B>(
  reducer: Reducer<A, B>
): PointFix<A, (list: B[]) => A> => f => acc => ([head, ...tail]): A =>
  head ? f(reducer(acc)(head))(tail) : acc;

export const reduce = <T>(reducer: Reducer<T, T>): ((list: T[]) => T) => ([
  head,
  ...tail
]) => Y(applyReduce(reducer))(head)(tail);

export const reduceWithStart = <A, B>(
  reducer: Reducer<A, B>
): ((start: A) => (list: B[]) => A) => Y(applyReduce(reducer));

export const concat = <T>(list1: T[]) => (list2: T[]): T[] => [
  ...list1,
  ...list2
];
