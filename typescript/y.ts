export type PointFix<A, B> = (f: (x: A) => B) => (x: A) => B;
type SelfRef<A, B> = (x: SelfRef<A, B>) => (x: A) => B;

const Y = <A, B>(f: PointFix<A, B>): ((x: A) => B) =>
  ((x: SelfRef<A, B>) => x(x))(y => f(x => y(y)(x)));

export default Y;
