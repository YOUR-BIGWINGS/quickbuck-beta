/**
 * Shared utilities for filtering, sorting, and deriving insights
 * for the cryptocurrency market list and related views.
 */

export type CryptoSortOption =
  | "marketcap-desc"
  | "price-desc"
  | "price-asc"
  | "change-desc"
  | "change-asc";

export interface CryptoSummary {
  _id: string;
  symbol: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  currentPrice?: number | null;
  marketCap?: number | null;
  lastPriceChange?: number | null; // Represented as a decimal fraction (e.g., 0.012 = 1.2%)
  creatorName?: string | null;
  createdByPlayerId?: string | null;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
}

export interface CryptoFilterOptions {
  searchQuery?: string;
  sortBy?: CryptoSortOption;
}

/**
 * Standardizes queries for case-insensitive matching.
 */
function normalizeSearchQuery(query: string | undefined): string {
  return (query ?? "").trim().toLowerCase();
}

/**
 * Returns true when the crypto matches the search query.
 */
function matchesSearchQuery(crypto: CryptoSummary, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const symbol = (crypto.symbol ?? "").toLowerCase();
  const name = (crypto.name ?? "").toLowerCase();
  const creator = (crypto.creatorName ?? "").toLowerCase();

  return (
    symbol.includes(normalizedQuery) ||
    name.includes(normalizedQuery) ||
    creator.includes(normalizedQuery)
  );
}

/**
 * Filters a collection of cryptos by search query.
 */
export function filterCryptos(
  cryptos: CryptoSummary[],
  options: CryptoFilterOptions = {},
): CryptoSummary[] {
  const query = normalizeSearchQuery(options.searchQuery);

  if (!query) {
    return cryptos.slice();
  }

  return cryptos.filter((crypto) => matchesSearchQuery(crypto, query));
}

/**
 * Converts fractional price change to percentage points.
 */
export function toPercent(changeFraction: number | null | undefined): number {
  if (typeof changeFraction !== "number" || !Number.isFinite(changeFraction)) {
    return 0;
  }
  return changeFraction * 100;
}

/**
 * Sorts cryptos based on the provided sort option.
 */
export function sortCryptos(
  cryptos: CryptoSummary[],
  sortBy: CryptoSortOption = "marketcap-desc",
): CryptoSummary[] {
  const sorted = cryptos.slice();

  sorted.sort((a, b) => {
    const priceA = a.currentPrice ?? 0;
    const priceB = b.currentPrice ?? 0;
    const marketCapA = a.marketCap ?? 0;
    const marketCapB = b.marketCap ?? 0;
    const changeA = toPercent(a.lastPriceChange);
    const changeB = toPercent(b.lastPriceChange);

    switch (sortBy) {
      case "price-asc":
        return priceA - priceB;
      case "price-desc":
        return priceB - priceA;
      case "change-desc":
        return changeB - changeA;
      case "change-asc":
        return changeA - changeB;
      case "marketcap-desc":
      default:
        return marketCapB - marketCapA;
    }
  });

  return sorted;
}

/**
 * Convenience helper to apply both filtering and sorting in a single pass.
 */
export function selectCryptos(
  cryptos: CryptoSummary[],
  options: CryptoFilterOptions = {},
): CryptoSummary[] {
  const filtered = filterCryptos(cryptos, options);
  return sortCryptos(filtered, options.sortBy ?? "marketcap-desc");
}

/**
 * Calculates the top gainers and losers based on the most recent price change.
 */
export function getTopMovers(
  cryptos: CryptoSummary[],
  limit = 3,
): { topGainers: CryptoSummary[]; topLosers: CryptoSummary[] } {
  const validLimit = Math.max(0, Math.floor(limit));

  if (validLimit === 0) {
    return { topGainers: [], topLosers: [] };
  }

  const cryptosWithChange = cryptos.filter(
    (crypto) =>
      typeof crypto.lastPriceChange === "number" &&
      Number.isFinite(crypto.lastPriceChange as number),
  );

  if (cryptosWithChange.length === 0) {
    return { topGainers: [], topLosers: [] };
  }

  const sortedByChange = cryptosWithChange
    .slice()
    .sort((a, b) => (b.lastPriceChange ?? 0) - (a.lastPriceChange ?? 0));

  const topGainers = sortedByChange.slice(0, validLimit);
  const topLosers = sortedByChange.slice(-validLimit).reverse();

  return { topGainers, topLosers };
}
