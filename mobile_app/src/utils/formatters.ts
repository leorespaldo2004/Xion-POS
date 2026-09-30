export function formatUSD(amount: number): string {
  const safeNum = isNaN(amount) ? 0 : amount;
  return `$ ${safeNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatVES(amount: number): string {
  const safeNum = isNaN(amount) ? 0 : amount;
  return `Bs. ${safeNum.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function convertUsdToVes(amountUsd: number, exchangeRate: number): number {
  if (isNaN(amountUsd) || isNaN(exchangeRate) || exchangeRate <= 0) return 0;
  return Number((amountUsd * exchangeRate).toFixed(2));
}

export function convertVesToUsd(amountVes: number, exchangeRate: number): number {
  if (isNaN(amountVes) || isNaN(exchangeRate) || exchangeRate <= 0) return 0;
  return Number((amountVes / exchangeRate).toFixed(2));
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}
