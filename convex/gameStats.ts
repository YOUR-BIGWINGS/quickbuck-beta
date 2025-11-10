import { query } from "./_generated/server";

/**
 * Game statistics queries for real-time homepage stats
 */

// Get total active players count
export const getActivePlayersCount = query({
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players.length;
  },
});

// Get total companies count
export const getTotalCompaniesCount = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    return companies.length;
  },
});

// Get total market cap (sum of all company balances)
export const getTotalMarketCap = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    const totalMarketCap = companies.reduce((sum, company) => sum + company.balance, 0);
    return totalMarketCap;
  },
});

// Get active products count
export const getActiveProductsCount = query({
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return products.length;
  },
});

// Get all game stats in one query for efficiency
export const getGameStats = query({
  handler: async (ctx) => {
    const [players, companies, allProducts] = await Promise.all([
      ctx.db.query("players").collect(),
      ctx.db.query("companies").collect(),
      ctx.db.query("products").collect(),
    ]);

    const totalMarketCap = companies.reduce((sum, company) => sum + company.balance, 0);
    const activeProducts = allProducts.filter((p) => p.isActive && !p.isArchived).length;

    return {
      activePlayers: players.length,
      totalCompanies: companies.length,
      totalMarketCap,
      activeProducts,
    };
  },
});
