import { createHmac } from 'crypto';

export function generateQrSignature(
  eventId: string,
  vendorId: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${eventId}:${vendorId}`)
    .digest('hex')
    .slice(0, 16);
}

export function buildQrPayload(
  eventId: string,
  vendorId: string,
  secret: string,
): string {
  const sig = generateQrSignature(eventId, vendorId, secret);
  return `https://app.fvl.io/e/${eventId}/v/${vendorId}?sig=${sig}`;
}

export function verifyQrSignature(
  eventId: string,
  vendorId: string,
  sig: string,
  secret: string,
): boolean {
  const expected = generateQrSignature(eventId, vendorId, secret);
  return expected === sig;
}
