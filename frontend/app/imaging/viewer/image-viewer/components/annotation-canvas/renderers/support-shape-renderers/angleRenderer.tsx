import { Point } from '../../../../types';

export function angleRenderer([a, b, c]: Point[], color: string) {
  if (!a || !b || !c) return null;
  return (
    <>
      <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke={color} strokeWidth="2" />
      <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke={color} strokeWidth="2" />
    </>
  );
}
