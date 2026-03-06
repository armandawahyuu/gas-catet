export function formatRupiah(amount: number): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("id-ID");
  return `${negative ? "-" : ""}Rp${formatted}`;
}

export function formatDate(dateStr: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

export function formatMonthYear(monthStr: string): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const [y, m] = monthStr.split("-");
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
