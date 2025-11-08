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

// Get total trades count (stock and crypto trades)
export const getTotalTradesCount = query({
  handler: async (ctx) => {
    const [stockTransactions, cryptoTransactions] = await Promise.all([
      ctx.db.query("stockTransactions").collect(),
      ctx.db.query("cryptoTransactions").collect(),
    ]);
    return stockTransactions.length + cryptoTransactions.length;
  },
});

// Get all game stats in one query for efficiency
export const getGameStats = query({
  handler: async (ctx) => {
    const [players, companies, stockTransactions, cryptoTransactions] = await Promise.all([
      ctx.db.query("players").collect(),
      ctx.db.query("companies").collect(),
      ctx.db.query("stockTransactions").collect(),
      ctx.db.query("cryptoTransactions").collect(),
    ]);

    const totalMarketCap = companies.reduce((sum, company) => sum + company.balance, 0);
    const totalTrades = stockTransactions.length + cryptoTransactions.length;

    return {
      activePlayers: players.length,
      totalCompanies: companies.length,
      totalMarketCap,
      totalTrades,
    };
  },
});
