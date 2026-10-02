/**
 * Converts a numerical amount in Indian Rupees (INR) to words.
 * Example: 53100 -> "Fifty-Three Thousand One Hundred Rupees Only"
 */
const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let word = '';
  if (n >= 100) {
    word += `${ones[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    word += `${tens[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    word += `${ones[n]} `;
  }
  return word.trim();
}

export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let current = rupees;
  let words = '';

  // Crores (>= 1,00,00,000)
  const crores = Math.floor(current / 10000000);
  if (crores > 0) {
    words += `${convertBelowThousand(crores)} Crore `;
    current %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  const lakhs = Math.floor(current / 100000);
  if (lakhs > 0) {
    words += `${convertBelowThousand(lakhs)} Lakh `;
    current %= 100000;
  }

  // Thousands (>= 1,000)
  const thousands = Math.floor(current / 1000);
  if (thousands > 0) {
    words += `${convertBelowThousand(thousands)} Thousand `;
    current %= 1000;
  }

  // Remaining (< 1,000)
  if (current > 0) {
    words += `${convertBelowThousand(current)} `;
  }

  words = words.trim();
  if (words) {
    words += ' Rupees';
  }

  if (paise > 0) {
    const paiseWords = convertBelowThousand(paise);
    words += words ? ` and ${paiseWords} Paise` : `${paiseWords} Paise`;
  }

  words += ' Only';

  return (isNegative ? 'Minus ' : '') + words.trim();
}
