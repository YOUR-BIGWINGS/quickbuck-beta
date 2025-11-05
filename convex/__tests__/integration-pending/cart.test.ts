import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Shopping Cart Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let companyId: any;
  let productId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Seller Company",
    });
    
    productId = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Test Product",
      description: "A test product",
      basePrice: 5000, // $50
      initialStock: 100,
      maxStock: 500,
      qualityRating: 0.8,
    });
  });

  it("should add item to cart", async () => {
    const cartItemId = await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].productId).toBe(productId);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.totalItems).toBe(5);
    expect(cart.totalPrice).toBe(25000); // 5 × $50
  });

  it("should update quantity if item already in cart", async () => {
    // Add 5 items
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    // Add 3 more
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 3,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items.length).toBe(1); // Still just one item
    expect(cart.items[0].quantity).toBe(8); // 5 + 3
  });

  it("should fail if adding more than available stock", async () => {
    await expect(
      t.mutation(api.cart.addToCart, {
        playerId,
        productId,
        quantity: 150, // More than 100 in stock
      })
    ).rejects.toThrow("Insufficient stock");
  });

  it("should remove item from cart", async () => {
    const cartItemId = await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    await t.mutation(api.cart.removeFromCart, {
      cartItemId,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items.length).toBe(0);
  });

  it("should update cart item quantity", async () => {
    const cartItemId = await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    await t.mutation(api.cart.updateCartItemQuantity, {
      cartItemId,
      quantity: 10,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items[0].quantity).toBe(10);
  });

  it("should remove item if quantity set to 0", async () => {
    const cartItemId = await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    await t.mutation(api.cart.updateCartItemQuantity, {
      cartItemId,
      quantity: 0,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items.length).toBe(0);
  });

  it("should checkout cart and complete purchase", async () => {
    // Add items to cart
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 10,
    });
    
    // Give player more money
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000, // +$1k
    });
    
    const initialPlayerBalance = (await t.query(api.players.getPlayer, { playerId })).balance;
    const initialCompanyBalance = (await t.query(api.companies.getCompany, { companyId })).balance;
    
    await t.mutation(api.cart.checkout, {
      accountId: playerId,
      accountType: "player",
    });
    
    // Check cart is empty
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    expect(cart.items.length).toBe(0);
    
    // Check product stock decreased
    const product = await t.query(api.products.getProduct, { productId });
    expect(product.currentStock).toBe(90); // 100 - 10
    expect(product.totalUnitsSold).toBe(10);
    expect(product.totalRevenue).toBe(50000); // 10 × $50
    
    // Check money transferred
    const player = await t.query(api.players.getPlayer, { playerId });
    const company = await t.query(api.companies.getCompany, { companyId });
    
    expect(player.balance).toBe(initialPlayerBalance - 50000);
    expect(company.balance).toBe(initialCompanyBalance + 50000);
  });

  it("should fail checkout if insufficient balance", async () => {
    // Add expensive items
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 50, // $2,500 worth
    });
    
    await expect(
      t.mutation(api.cart.checkout, {
        accountId: playerId,
        accountType: "player",
      })
    ).rejects.toThrow("Insufficient balance");
  });

  it("should allow company to checkout", async () => {
    // Create buyer company
    const buyerCompanyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Buyer Company",
    });
    
    // Give company money
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId: buyerCompanyId,
      amount: 100000,
    });
    
    // Add items to company's cart (using player's cart for simplicity)
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    await t.mutation(api.cart.checkout, {
      accountId: buyerCompanyId,
      accountType: "company",
    });
    
    const company = await t.query(api.companies.getCompany, {
      companyId: buyerCompanyId,
    });
    
    expect(company.balance).toBe(75000); // $1k - $250 spent
  });

  it("should get cart item count", async () => {
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    const count = await t.query(api.cart.getCartItemCount, { playerId });
    
    expect(count).toBe(5);
  });

  it("should handle multiple products in cart", async () => {
    const product2Id = await t.mutation(api.products.createProduct, {
      companyId,
      name: "Product 2",
      basePrice: 10000, // $100
      initialStock: 50,
      maxStock: 200,
      qualityRating: 0.7,
    });
    
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 5,
    });
    
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId: product2Id,
      quantity: 3,
    });
    
    const cart = await t.query(api.cart.getPlayerCart, { playerId });
    
    expect(cart.items.length).toBe(2);
    expect(cart.totalItems).toBe(8); // 5 + 3
    expect(cart.totalPrice).toBe(55000); // (5 × $50) + (3 × $100)
  });

  it("should validate stock availability at checkout", async () => {
    // Add 10 items to cart
    await t.mutation(api.cart.addToCart, {
      playerId,
      productId,
      quantity: 10,
    });
    
    // Manually reduce stock to simulate concurrent purchase
    await t.mutation(api.products.updateProductStock, {
      productId,
      quantityChange: -95, // Only 5 left
    });
    
    // Give player money
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await expect(
      t.mutation(api.cart.checkout, {
        accountId: playerId,
        accountType: "player",
      })
    ).rejects.toThrow("Insufficient stock");
  });
});
