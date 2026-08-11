function normalizeIdCard(value: string): string {
  return value.trim().replace(/\s/g, '');
}

function isValidDateParts(year: string, month: string, day: string): boolean {
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
}

export function extractBirthDateFromIdCard(value: string): string {
  const idCard = normalizeIdCard(value);
  const year =
    idCard.length === 18 ? idCard.slice(6, 10) : `19${idCard.slice(6, 8)}`;
  const month =
    idCard.length === 18 ? idCard.slice(10, 12) : idCard.slice(8, 10);
  const day =
    idCard.length === 18 ? idCard.slice(12, 14) : idCard.slice(10, 12);
  return (idCard.length === 15 || idCard.length === 18) &&
    isValidDateParts(year, month, day)
    ? `${year}-${month}-${day}`
    : '';
}

export function extractGenderFromIdCard(value: string): string {
  const idCard = normalizeIdCard(value);
  const index = idCard.length === 18 ? 16 : idCard.length === 15 ? 14 : -1;
  const code = index >= 0 ? Number(idCard[index]) : Number.NaN;
  return Number.isInteger(code) ? (code % 2 === 0 ? '女' : '男') : '';
}

export function validateIdCard(value: string): boolean {
  const idCard = normalizeIdCard(value);
  if (idCard.length === 15) {
    return /^\d{15}$/.test(idCard) && extractBirthDateFromIdCard(idCard) !== '';
  }
  if (!/^\d{17}[\dXx]$/.test(idCard)) return false;
  if (!extractBirthDateFromIdCard(idCard)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const sum = weights.reduce(
    (total, weight, index) => total + Number(idCard[index]) * weight,
    0
  );
  return idCard[17].toUpperCase() === checkCodes[sum % 11];
}

export function formatIdCard(value: string): string {
  const idCard = normalizeIdCard(value);
  if (idCard.length === 18) {
    return `${idCard.slice(0, 6)} ${idCard.slice(6, 14)} ${idCard.slice(14)}`;
  }
  if (idCard.length === 15) {
    return `${idCard.slice(0, 6)} ${idCard.slice(6, 12)} ${idCard.slice(12)}`;
  }
  return idCard;
}
