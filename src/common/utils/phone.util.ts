export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (hasPlus) {
    return `+${digits}`;
  }

  // Nigeria local format: 08012345678 → +2348012345678
  if (digits.startsWith('0') && digits.length >= 10) {
    return `+234${digits.slice(1)}`;
  }

  if (digits.startsWith('234') && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+234${digits}`;
  }

  return `+${digits}`;
}

export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
