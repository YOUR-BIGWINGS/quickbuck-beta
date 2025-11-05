"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

/**
 * Hook for fetching leaderboard data
 * 
 * NOTE: These hooks reference api.leaderboard which needs to be regenerated
 * by Convex once the leaderboard.ts file is picked up by the dev server.
 * For now, keeping as reference for implementation.
 */

// export function useTopPlayersByBalance() {
//   return useQuery(api.leaderboard.getTopPlayersByBalance, { limit: 5 });
// }

// export function useTopPlayersByNetWorth() {
//   return useQuery(api.leaderboard.getTopPlayersByNetWorth, { limit: 5 });
// }

// export function useTopCompaniesByMarketCap() {
//   return useQuery(api.leaderboard.getTopCompaniesByMarketCap, { limit: 5 });
// }

// export function useTopCompaniesByBalance() {
//   return useQuery(api.leaderboard.getTopCompaniesByBalance, { limit: 5 });
// }

// export function useAllPlayersSorted(
//   sortBy: "netWorth" | "balance" = "netWorth",
//   limit: number = 50,
//   offset: number = 0
// ) {
//   return useQuery(api.leaderboard.getAllPlayersSorted, { sortBy, limit, offset });
// }

// export function useAllCompaniesSorted(
//   sortBy: "marketCap" | "balance" = "marketCap",
//   limit: number = 50,
//   offset: number = 0
// ) {
//   return useQuery(api.leaderboard.getAllCompaniesSorted, { sortBy, limit, offset });
// }

// export function useAllProductsSorted(limit: number = 50, offset: number = 0) {
//   return useQuery(api.leaderboard.getAllProductsSorted, { limit, offset });
// }

// export function useSearchPlayers(searchQuery: string, limit: number = 20) {
//   return useQuery(api.leaderboard.searchPlayers, { query: searchQuery, limit });
// }

// export function useSearchCompanies(searchQuery: string, limit: number = 20) {
//   return useQuery(api.leaderboard.searchCompanies, { query: searchQuery, limit });
// }

// export function useSearchProducts(searchQuery: string, limit: number = 20) {
//   return useQuery(api.leaderboard.searchProducts, { query: searchQuery, limit });
// }
