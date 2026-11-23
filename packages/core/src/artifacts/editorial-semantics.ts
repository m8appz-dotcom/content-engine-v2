/** Shared semantic gate for selecting and rendering recorded-review visuals. */
export function hasEditorialReviewSemantics(text:string):boolean {
  // Unicode word boundaries avoid accepting review inside preview/prereview,
  // including when either adjacent letter has an accent.
  return /(?:^|[^\p{L}\p{N}_])(?:review(?:s|ed|ing)?|approv(?:e[sd]?|als?|ing)|decid(?:e[sd]?|ing)|decisions?|choose(?:s)?|choosing|chose|chosen|sign(?:s|ed|ing)?[\s-]+off|make\s+(?:the|your)\s+call|revis(?:ar|a|as|an|amos|ad[ao]s?|ando|ión|iones)|aprob(?:ar|a|as|amos|ad[ao]s?|ación|aciones|ando)|aprueb(?:a|as|an|e|en)|decid(?:ir|e|es|en|id[ao]s?|iendo)|decisi[oó]n(?:es)?)(?=$|[^\p{L}\p{N}_])/iu.test(text);
}
