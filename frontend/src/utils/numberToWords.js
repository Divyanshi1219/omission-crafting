// Convert numeric amount into words (supports Indian numbering system & international)
export function numberToWords(num, currency = "INR") {
  if (isNaN(num) || num === null || num === undefined || num === 0) {
    return currency === "INR" ? "Zero Rupees Only" : "Zero Only";
  }

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertTwoDigits(n) {
    if (n < 20) return a[n];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return b[tens] + (units ? " " + a[units] : "");
  }

  function convertThreeDigits(n) {
    let str = "";
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      str += convertTwoDigits(n);
    }
    return str.trim();
  }

  // Handle integers and decimals
  const wholePart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - wholePart) * 100);

  let words = "";

  if (currency === "INR") {
    // Indian Numbering System: Crores, Lakhs, Thousands, Hundreds
    const crore = Math.floor(wholePart / 10000000);
    let rem = wholePart % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    const hundred = rem % 1000;

    if (crore > 0) words += convertTwoDigits(crore) + " Crore ";
    if (lakh > 0) words += convertTwoDigits(lakh) + " Lakh ";
    if (thousand > 0) words += convertTwoDigits(thousand) + " Thousand ";
    if (hundred > 0) words += convertThreeDigits(hundred) + " ";

    words = words.trim();
    if (!words) words = "Zero";
    words += " Rupees";

    if (decimalPart > 0) {
      words += " and " + convertTwoDigits(decimalPart) + " Paise";
    }
  } else {
    // Western system
    const million = Math.floor(wholePart / 1000000);
    let rem = wholePart % 1000000;
    const thousand = Math.floor(rem / 1000);
    const hundred = rem % 1000;

    if (million > 0) words += convertThreeDigits(million) + " Million ";
    if (thousand > 0) words += convertThreeDigits(thousand) + " Thousand ";
    if (hundred > 0) words += convertThreeDigits(hundred) + " ";

    words = words.trim();
    if (!words) words = "Zero";
    
    if (currency === "USD") words += " Dollars";
    else if (currency === "EUR") words += " Euros";
    else if (currency === "GBP") words += " Pounds";

    if (decimalPart > 0) {
      words += " and " + convertTwoDigits(decimalPart) + " Cents";
    }
  }

  return words + " Only";
}
