import twitterText from "twitter-text";

const { parseTweet, extractUrlsWithIndices } = twitterText;

export const X_WEIGHTED_LIMIT = 280;
export const X_LONG_POST_LIMIT = 25_000;

export type PostTextStats = {
  weightedLength: number;
  remaining: number;
  overLimit: boolean;
  valid: boolean;
  hasUrl: boolean;
  urlCount: number;
};

export function analyzePostText(
  text: string,
  limit = X_WEIGHTED_LIMIT
): PostTextStats {
  const result = parseTweet(text);
  const urlCount = text.trim().length > 0 ? extractUrlsWithIndices(text).length : 0;
  return {
    weightedLength: result.weightedLength,
    remaining: limit - result.weightedLength,
    overLimit: result.weightedLength > limit,
    valid: result.valid,
    hasUrl: urlCount > 0,
    urlCount,
  };
}
