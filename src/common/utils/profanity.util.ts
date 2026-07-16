const BLOCKED_TERMS = [
  'damn',
  'hell',
  'shit',
  'fuck',
  'bitch',
  'asshole',
  'bastard',
  'crap',
  'piss',
  'dick',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'faggot',
  'retard',
];

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.some((token) => BLOCKED_TERMS.includes(token));
}
