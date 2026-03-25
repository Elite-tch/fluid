export function calculateFeeBumpFee(
  operationCount: number,
  baseFee: number,
  multiplier: number = 1,
): number {
  const calculatedFee = (operationCount + 1) * baseFee;
  return Math.ceil(calculatedFee * multiplier);
}
