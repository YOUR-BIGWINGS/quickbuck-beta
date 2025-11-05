/**
 * Migration: Clean up old stock market system
 * 
 * This migration:
 * 1. Removes old stock tables (company-based stocks)
 * 2. Removes ticker, marketCap, and sharesOutstanding from companies
 * 3. Removes old companyShares table data
 */

import { internalMutation } from "./_generated/server";

/**
 * Migration: Fix products with missing productionCostPercentage
 * Sets a default of 0.35 (35%) for any products that don't have this field
 */
export const fixMissingProductionCostPercentage = internalMutation({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let fixed = 0;
    
    for (const product of products) {
      if (product.productionCostPercentage === undefined || 
          product.productionCostPercentage === null ||
          isNaN(product.productionCostPercentage)) {
        await ctx.db.patch(product._id, {
          productionCostPercentage: 0.35 + Math.random() * 0.32, // 35%-67%
          updatedAt: Date.now(),
        });
        fixed++;
      }
    }
    
    return {
      success: true,
      totalProducts: products.length,
      fixedProducts: fixed,
    };
  },
});

export const cleanupOldStockSystem = internalMutation({
  handler: async (ctx) => {
    let deletedStocks = 0;
    let deletedHistory = 0;
    let deletedShares = 0;
    let migratedCompanies = 0;
    
    // Delete all old stocks (company-based)
    const oldStocks = await ctx.db.query("stocks").collect();
    for (const stock of oldStocks) {
      const stockData = stock as any;
      // Only delete if it has companyId (old system)
      if (stockData.companyId !== undefined) {
        await ctx.db.delete(stock._id);
        deletedStocks++;
      }
    }
    
    // Delete all old stock price history (has "price" instead of OHLC)
    const oldHistory = await ctx.db.query("stockPriceHistory").collect();
    for (const history of oldHistory) {
      const historyData = history as any;
      if (historyData.price !== undefined) {
        await ctx.db.delete(history._id);
        deletedHistory++;
      }
    }
    
    // Delete all company shares (old system)
    const oldShares = await ctx.db.query("companyShares").collect();
    for (const share of oldShares) {
      await ctx.db.delete(share._id);
      deletedShares++;
    }
    
    // Clean up companies
    const companies = await ctx.db.query("companies").collect();
    
    for (const company of companies) {
      const companyData = company as any;
      
      if (companyData.ticker !== undefined || 
          companyData.marketCap !== undefined || 
          companyData.sharesOutstanding !== undefined) {
        
        // Create a clean copy without the old fields
        const cleanData: any = {
          name: company.name,
          description: company.description,
          logo: company.logo,
          tags: company.tags,
          ownerId: company.ownerId,
          balance: company.balance,
          isPublic: company.isPublic,
          reputationScore: company.reputationScore,
          flaggedStatus: company.flaggedStatus,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
        };
        
        // Delete and recreate the company
        await ctx.db.delete(company._id);
        await ctx.db.insert("companies", cleanData);
        
        migratedCompanies++;
      }
    }
    
    return {
      success: true,
      deletedStocks,
      deletedHistory,
      deletedShares,
      migratedCompanies,
      totalCompanies: companies.length,
    };
  },
});
