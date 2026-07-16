import { containsProfanity } from './profanity.util';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export function resolveReviewStatus(
  comment: string | null | undefined,
): ReviewStatus {
  return containsProfanity(comment) ? 'pending' : 'approved';
}
