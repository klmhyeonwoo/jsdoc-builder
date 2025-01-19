interface test {
  x: string;
  y: string[];
}
/**
 * @description Press Your { Function add } Description
 * @param {number} a
 * @param {number} b
 * @returns {void}
 */
function add(a: number, b: number) {
  return a + b;
}
/**
 * @description Press Your { Function add2 } Description
 * @param {number} a
 * @param {number} b
 * @returns {void}
 */
const add2 = (a: number, b: number) => {
  return a + b;
};
/**
 * @description Press Your { Function multiply } Description
 * @param {test} { x, y }
 * @returns {number}
 */
const multiply = ({ x, y }: test): number => x * y;
