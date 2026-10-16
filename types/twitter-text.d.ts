declare module "twitter-text" {
  export type ParsedTweet = {
    weightedLength: number;
    permillage: number;
    valid: boolean;
    displayRangeStart: number;
    displayRangeEnd: number;
    validRangeStart: number;
    validRangeEnd: number;
  };

  export type UrlEntity = {
    url: string;
    indices: [number, number];
  };

  const twitterText: {
    parseTweet(text: string): ParsedTweet;
    extractUrlsWithIndices(text: string): UrlEntity[];
  };

  export default twitterText;
}
