import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Diagnostic query to check ALL products
export const checkAllProducts = query({
  handler: async (ctx) => {
    const allProducts = await ctx.db.query("products").take(20);
    
    const activeProducts = allProducts.filter(p => p.isActive && !p.isArchived);
    const inactiveProducts = allProducts.filter(p => !p.isActive || p.isArchived);
    
    return {
      total: allProducts.length,
      active: activeProducts.length,
      inactive: inactiveProducts.length,
      allProducts: allProducts.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        isArchived: p.isArchived,
        totalRevenue: p.totalRevenue,
        totalSold: p.totalSold,
        qualityRating: p.qualityRating,
        companyId: p.companyId,
      })),
    };
  },
});

// Diagnostic query to check active products
export const checkActiveProducts = query({
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_isActive_totalRevenue", (q) => q.eq("isActive", true))
      .order("desc")
      .take(10);

    return {
      count: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        isArchived: p.isArchived,
        totalRevenue: p.totalRevenue,
        totalSold: p.totalSold,
        qualityRating: p.qualityRating,
        companyId: p.companyId,
      })),
    };
  },
});

// Check companies
export const checkCompanies = query({
  handler: async (ctx) => {
    const companies = await ctx.db
      .query("companies")
      .take(10);

    return {
      count: companies.length,
      companies: companies.map(c => ({
        id: c._id,
        name: c.name,
        balance: c.balance,
        ownerId: c.ownerId,
      })),
    };
  },
});

// Check recent marketplace sales
export const checkMarketplaceSales = query({
  handler: async (ctx) => {
    const sales = await ctx.db
      .query("marketplaceSales")
      .order("desc")
      .take(20);

    return {
      count: sales.length,
      sales: sales.map(s => ({
        id: s._id,
        productId: s.productId,
        companyId: s.companyId,
        quantity: s.quantity,
        totalPrice: s.totalPrice,
        purchaserId: s.purchaserId,
        purchaserType: s.purchaserType,
        createdAt: s.createdAt,
      })),
    };
  },
});

// Query to simulate the exact bot purchase query
export const testBotProductQuery = query({
  handler: async (ctx) => {
    console.log("[TEST] Running exact bot product query...");
    
    // This is the EXACT query from executeBotPurchases
    const products = await ctx.db
      .query("products")
      .withIndex("by_isActive_totalRevenue", (q) => q.eq("isActive", true))
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.lte(q.field("price"), 5000000) // Max price: $50,000
        )
      )
      .take(50);
    
    console.log(`[TEST] Found ${products.length} products`);
    
    const eligibleProducts = products.filter((p: any) => {
      const hasValidPrice = p.price && p.price > 0 && isFinite(p.price);
      const hasStock = p.stock === undefined || p.stock === null || p.stock > 0;
      return hasValidPrice && hasStock;
    });
    
    console.log(`[TEST] ${eligibleProducts.length} eligible after filtering`);
    
    return {
      totalFound: products.length,
      eligible: eligibleProducts.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        isArchived: p.isArchived,
        totalRevenue: p.totalRevenue,
        hasValidPrice: p.price && p.price > 0 && isFinite(p.price),
        hasStock: p.stock === undefined || p.stock === null || p.stock > 0,
      })),
    };
  },
});

// Simple query that anyone can run to check bot status
export const quickDiagnostic = query({
  handler: async (ctx) => {
    // Check products
    const allProducts = await ctx.db.query("products").take(100);
    const activeProducts = allProducts.filter(p => p.isActive && !p.isArchived);
    const eligibleProducts = activeProducts.filter(p => 
      p.price && p.price > 0 && p.price <= 5000000 &&
      (p.stock === undefined || p.stock === null || p.stock > 0)
    );
    
    // Check recent bot purchases
    const recentSales = await ctx.db
      .query("marketplaceSales")
      .order("desc")
      .take(10);
    const botSales = recentSales.filter(s => s.purchaserType === "bot");
    
    return {
      diagnosis: {
        totalProducts: allProducts.length,
        activeProducts: activeProducts.length,
        eligibleForBot: eligibleProducts.length,
        recentBotPurchases: botSales.length,
      },
      problem: 
        allProducts.length === 0 ? "NO_PRODUCTS_EXIST" :
        activeProducts.length === 0 ? "ALL_PRODUCTS_INACTIVE_OR_ARCHIVED" :
        eligibleProducts.length === 0 ? "NO_ELIGIBLE_PRODUCTS" :
        botSales.length === 0 ? "BOT_NOT_PURCHASING" :
        "LOOKS_OK",
      recommendation:
        allProducts.length === 0 ? "Create products in companies" :
        activeProducts.length === 0 ? "Set products to isActive=true and isArchived=false" :
        eligibleProducts.length === 0 ? "Check product prices (<$50k) and stock (>0 or null)" :
        botSales.length === 0 ? "Run a manual tick to test" :
        "Bot appears to be working",
      sampleProducts: allProducts.slice(0, 3).map(p => ({
        name: p.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        isArchived: p.isArchived,
      })),
    };
  },
});

// Test bot purchase with detailed logging
export const testBotPurchase = internalMutation({
  args: { budget: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const budget = args.budget || 1000000; // Default $10k
    
    console.log(`[TEST] Starting test bot purchase with budget: $${budget / 100}`);
    
    // Step 1: Check for products
    const products = await ctx.db
      .query("products")
      .withIndex("by_isActive_totalRevenue", (q) => q.eq("isActive", true))
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.lte(q.field("price"), 5000000)
        )
      )
      .take(10);
    
    console.log(`[TEST] Found ${products.length} active products`);
    
    if (products.length === 0) {
      return { error: "No active products found" };
    }
    
    // Step 2: Check first product in detail
    const product = products[0];
    console.log(`[TEST] First product:`, {
      id: product._id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
      isArchived: product.isArchived,
      companyId: product.companyId,
    });
    
    // Step 3: Check if company exists
    const company = await ctx.db.get(product.companyId);
    if (!company) {
      return { error: `Company ${product.companyId} not found for product ${product._id}` };
    }
    
    console.log(`[TEST] Company found:`, {
      id: company._id,
      name: company.name,
      balance: company.balance,
    });
    
    // Step 4: Try a test purchase
    const quantity = 1;
    const totalPrice = product.price * quantity;
    
    console.log(`[TEST] Attempting to purchase ${quantity}x ${product.name} for $${totalPrice / 100}`);
    
    try {
      // Update product
      await ctx.db.patch(product._id, {
        totalSold: (product.totalSold || 0) + quantity,
        totalRevenue: (product.totalRevenue || 0) + totalPrice,
        updatedAt: Date.now(),
      });
      
      // Update company
      await ctx.db.patch(product.companyId, {
        balance: company.balance + totalPrice,
        updatedAt: Date.now(),
      });
      
      // Record sale
      await ctx.db.insert("marketplaceSales", {
        productId: product._id,
        companyId: product.companyId,
        quantity,
        purchaserId: "bot" as const,
        purchaserType: "bot" as const,
        totalPrice,
        createdAt: Date.now(),
      });
      
      console.log(`[TEST] Purchase successful!`);
      
      return {
        success: true,
        purchase: {
          productId: product._id,
          productName: product.name,
          quantity,
          totalPrice,
          companyBalance: company.balance + totalPrice,
        },
      };
    } catch (error) {
      console.error(`[TEST] Purchase failed:`, error);
      return {
        error: error instanceof Error ? error.message : String(error),
        details: {
          productId: product._id,
          productName: product.name,
          quantity,
          totalPrice,
        },
      };
    }
  },
});
