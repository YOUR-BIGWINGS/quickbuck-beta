import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Product Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let companyId: any;
  let productId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    // Create test user, player, and company
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Test Company",
    });
  });

  it("should create a new product", async () => {
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Test Product",
      description: "A test product",
      basePrice: 5000, // $50
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.8,
      tags: ["test", "sample"],
    });
    
    const product = await t.query(api.products.getProduct, { productId });
    
    expect(product).toBeDefined();
    expect(product.name).toBe("Test Product");
    expect(product.companyId).toBe(companyId);
    expect(product.basePrice).toBe(5000);
    expect(product.currentStock).toBe(100);
    expect(product.qualityRating).toBe(0.8);
    expect(product.totalRevenue).toBe(0);
    expect(product.totalUnitsSold).toBe(0);
  });

  it("should update product details", async () => {
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Original Name",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.5,
    });
    
    await t.mutation(api.products.updateProduct, {
      productId,
      name: "Updated Name",
      description: "Updated description",
      basePrice: 7500,
      qualityRating: 0.9,
    });
    
    const product = await t.query(api.products.getProduct, { productId });
    
    expect(product.name).toBe("Updated Name");
    expect(product.description).toBe("Updated description");
    expect(product.basePrice).toBe(7500);
    expect(product.qualityRating).toBe(0.9);
  });

  it("should update product stock", async () => {
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Stock Test",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.7,
    });
    
    await t.mutation(api.products.updateProductStock, {
      productId,
      quantityChange: 50,
    });
    
    const product = await t.query(api.products.getProduct, { productId });
    expect(product.currentStock).toBe(150);
    
    // Test negative change
    await t.mutation(api.products.updateProductStock, {
      productId,
      quantityChange: -30,
    });
    
    const updatedProduct = await t.query(api.products.getProduct, { productId });
    expect(updatedProduct.currentStock).toBe(120);
  });

  it("should not allow stock to exceed maxStock", async () => {
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Max Stock Test",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.7,
    });
    
    await expect(
      t.mutation(api.products.updateProductStock, {
        productId,
        quantityChange: 500, // Would exceed maxStock
      })
    ).rejects.toThrow("Cannot exceed");
  });

  it("should record product sales", async () => {
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Sales Test",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.7,
    });
    
    await t.mutation(api.products.recordProductSale, {
      productId,
      quantity: 10,
      totalRevenue: 50000, // 10 × $50
    });
    
    const product = await t.query(api.products.getProduct, { productId });
    
    expect(product.totalUnitsSold).toBe(10);
    expect(product.totalRevenue).toBe(50000);
  });

  it("should get company products", async () => {
    const product1Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Product 1",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.7,
    });
    
    const product2Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Product 2",
      basePrice: 10000,
      initialStock: 50,
      maxStock: 200,
      qualityRating: 0.9,
    });
    
    const products = await t.query(api.products.getCompanyProducts, { companyId });
    
    expect(products.length).toBe(2);
    expect(products.map((p: any) => p._id)).toContain(product1Id);
    expect(products.map((p: any) => p._id)).toContain(product2Id);
  });

  it("should search products by name", async () => {
    await t.mutation(api.products.createProduct, {
      companyId,
      name: "Gaming Laptop",
      basePrice: 100000,
      initialStock: 10,
      maxStock: 50,
      qualityRating: 0.9,
    });
    
    await t.mutation(api.products.createProduct, {
      companyId,
      name: "Office Desk",
      basePrice: 20000,
      initialStock: 20,
      maxStock: 100,
      qualityRating: 0.7,
    });
    
    const results = await t.query(api.products.searchProducts, {
      searchTerm: "laptop",
    });
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Gaming Laptop");
  });

  it("should get products by price range", async () => {
    await t.mutation(api.products.createProduct, {
      companyId,
      name: "Cheap Item",
      basePrice: 1000, // $10
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.5,
    });
    
    await t.mutation(api.products.createProduct, {
      companyId,
      name: "Mid Item",
      basePrice: 5000, // $50
      initialStock: 50,
      maxStock: 200,
      qualityRating: 0.7,
    });
    
    await t.mutation(api.products.createProduct, {
      companyId,
      name: "Expensive Item",
      basePrice: 10000, // $100
      initialStock: 10,
      maxStock: 50,
      qualityRating: 0.9,
    });
    
    const results = await t.query(api.products.getProductsByPriceRange, {
      minPrice: 4000,
      maxPrice: 6000,
    });
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Mid Item");
  });

  it("should get top products by revenue", async () => {
    const product1Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Best Seller",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.8,
    });
    
    const product2Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Slow Mover",
      basePrice: 5000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.6,
    });
    
    // Record sales
    await t.mutation(api.products.recordProductSale, {
      productId: product1Id,
      quantity: 50,
      totalRevenue: 250000,
    });
    
    await t.mutation(api.products.recordProductSale, {
      productId: product2Id,
      quantity: 10,
      totalRevenue: 50000,
    });
    
    const topProducts = await t.query(api.products.getTopProductsByRevenue, {
      limit: 2,
    });
    
    expect(topProducts.length).toBe(2);
    expect(topProducts[0]._id).toBe(product1Id); // Highest revenue first
    expect(topProducts[1]._id).toBe(product2Id);
  });

  it("should get top products by units sold", async () => {
    const product1Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Popular",
      basePrice: 1000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.7,
    });
    
    const product2Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Niche",
      basePrice: 10000,
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.9,
    });
    
    // Record sales
    await t.mutation(api.products.recordProductSale, {
      productId: product1Id,
      quantity: 100,
      totalRevenue: 100000,
    });
    
    await t.mutation(api.products.recordProductSale, {
      productId: product2Id,
      quantity: 20,
      totalRevenue: 200000,
    });
    
    const topProducts = await t.query(api.products.getTopProductsBySales, {
      limit: 2,
    });
    
    expect(topProducts.length).toBe(2);
    expect(topProducts[0]._id).toBe(product1Id); // Most units sold first
    expect(topProducts[0].totalUnitsSold).toBe(100);
  });
});
