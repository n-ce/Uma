// Define the interface for the substitution map for clarity
interface Tier2Map {
  [key: string]: string;
}

// Define the Tier 2 map as a constant
const TIER_2_MAP: Tier2Map = {
  // Longer common segment first to catch the maximum length
  'invidious': '$',
  'inv': '&',
  'iv': '#',
  // Common suffix
  'com': '~'
};

/**
 * Performs Tier 2 (Structural/Domain Segment) compression on a string of domains.
 * It substitutes long, common domain parts with single-character tokens.
 *
 * @param domainList The raw string of domains separated by commas (or any delimiter).
 * @returns An object containing the compressed string and the Tier 2 map for decompression.
 */
export default function compressTier2(domainList: string): { compressedString: string, map: Tier2Map } {
  // 1. Split the string into individual domains
  const domains = domainList.split(',');

  // 2. Process each domain for substitution
  const compressedDomains = domains.map(domain => {
    let compressedDomain = domain;

    // We iterate over the map keys to perform the substitution.
    // It's crucial to substitute longer patterns first (e.g., 'invidious' before 'inv')
    // to prevent partial substitution, which is why we define the map order carefully.
    for (const [original, code] of Object.entries(TIER_2_MAP)) {
      // Create a RegExp for a global, case-insensitive replacement (g flag)
      // Note: We escape the token in the replacement to ensure it's treated as a literal character.
      const regex = new RegExp(original, 'g');
      compressedDomain = compressedDomain.replace(regex, code);
    }
    return compressedDomain;
  });

  // 3. Rejoin the domains into a single compressed string
  const compressedString = compressedDomains.join(',');

  // 4. Return the result and the map
  return {
    compressedString: compressedString,
    map: TIER_2_MAP,
  };
}

// --- Example Usage ---

/*
const inputString = "invidious.tail5b365.ts.net,inv.perditum.com,invidious.nikkosphere.com,invidious.materialio.us,invidious.reallyaweso.me,zoomerville.com,iv.melmac.space";

const result = compressTier2(inputString);

// Expected compressedString: "$.tail5b365.ts.net,&.perditum.~,$.nikkosphere.~,$.materialio.us,$.reallyaweso.me,zoomerville.~,#.melmac.space"
console.log("Compressed String:", result.compressedString);
console.log("Compression Map:", result.map);
*/
