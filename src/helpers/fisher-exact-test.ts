const RELATIVE_TOLERANCE = 1e-9;

const getLogFactorial = (value: number): number => {
  let total = 0;
  for (let factor = 2; factor <= value; factor += 1) {
    total += Math.log(factor);
  }
  return total;
};

export const getFisherExactPValue = (
  firstYes: number,
  firstNo: number,
  secondYes: number,
  secondNo: number
): number => {
  const firstTotal = firstYes + firstNo;
  const secondTotal = secondYes + secondNo;
  const yesTotal = firstYes + secondYes;
  const grandTotal = firstTotal + secondTotal;

  if (firstTotal === 0 || secondTotal === 0) {
    return 1;
  }

  const fixedPart =
    getLogFactorial(firstTotal) +
    getLogFactorial(secondTotal) +
    getLogFactorial(yesTotal) +
    getLogFactorial(grandTotal - yesTotal) -
    getLogFactorial(grandTotal);

  const getTableProbability = (cell: number): number =>
    Math.exp(
      fixedPart -
        getLogFactorial(cell) -
        getLogFactorial(firstTotal - cell) -
        getLogFactorial(yesTotal - cell) -
        getLogFactorial(secondTotal - yesTotal + cell)
    );

  const observed = getTableProbability(firstYes);
  const lowest = Math.max(0, yesTotal - secondTotal);
  const highest = Math.min(firstTotal, yesTotal);

  let pValue = 0;
  for (let cell = lowest; cell <= highest; cell += 1) {
    const probability = getTableProbability(cell);
    if (probability <= observed * (1 + RELATIVE_TOLERANCE)) {
      pValue += probability;
    }
  }

  return Math.min(1, pValue);
};
