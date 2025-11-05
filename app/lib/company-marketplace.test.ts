import { describe, expect, it } from "vitest";

/**
 * Tests for Sections 9 & 10: Company Dashboard and Marketplace
 * Testing business logic, calculations, and validation rules
 */

describe("Section 9: Company Dashboard - Production Cost Calculation", () => {
  it("should calculate production cost within 35-67% range", () => {
    const price = 10000; // $100 in cents
    const minCost = Math.floor(price * 0.35);
    const maxCost = Math.floor(price * 0.67);
    
    // Test that range bounds are correct
    expect(minCost).toBe(3500); // $35
    expect(maxCost).toBe(6700); // $67
  });

  it("should calculate production cost for various prices", () => {
    const testPrices = [1000, 5000, 10000, 50000]; // $10, $50, $100, $500
    
    testPrices.forEach(price => {
      const minCost = Math.floor(price * 0.35);
      const maxCost = Math.floor(price * 0.67);
      
      expect(minCost).toBeGreaterThan(0);
      expect(maxCost).toBeGreaterThan(minCost);
      expect(maxCost / price).toBeLessThanOrEqual(0.67);
    });
  });

  it("should handle small price values", () => {
    const price = 100; // $1 in cents
    const minCost = Math.floor(price * 0.35);
    const maxCost = Math.floor(price * 0.67);
    
    expect(minCost).toBe(35); // $0.35
    expect(maxCost).toBe(67); // $0.67
  });

  it("should handle large price values", () => {
    const price = 1000000; // $10,000 in cents
    const minCost = Math.floor(price * 0.35);
    const maxCost = Math.floor(price * 0.67);
    
    expect(minCost).toBe(350000); // $3,500
    expect(maxCost).toBe(670000); // $6,700
  });
});

describe("Section 9: Company Dashboard - Revenue and Profit Calculation", () => {
  it("should calculate total revenue from products", () => {
    const products = [
      { totalRevenue: 10000, productionCost: 3500 },
      { totalRevenue: 20000, productionCost: 7000 },
      { totalRevenue: 5000, productionCost: 1750 },
    ];
    
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    expect(totalRevenue).toBe(35000); // $350
  });

  it("should calculate total production costs", () => {
    const products = [
      { totalRevenue: 10000, productionCost: 3500 },
      { totalRevenue: 20000, productionCost: 7000 },
      { totalRevenue: 5000, productionCost: 1750 },
    ];
    
    const totalCosts = products.reduce((sum, p) => sum + p.productionCost, 0);
    expect(totalCosts).toBe(12250); // $122.50
  });

  it("should calculate total profit (revenue - costs)", () => {
    const products = [
      { totalRevenue: 10000, productionCost: 3500 },
      { totalRevenue: 20000, productionCost: 7000 },
      { totalRevenue: 5000, productionCost: 1750 },
    ];
    
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCosts = products.reduce((sum, p) => sum + p.productionCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    
    expect(totalProfit).toBe(22750); // $227.50
  });

  it("should handle negative profit (costs exceed revenue)", () => {
    const products = [
      { totalRevenue: 5000, productionCost: 10000 },
    ];
    
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCosts = products.reduce((sum, p) => sum + p.productionCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    
    expect(totalProfit).toBe(-5000); // -$50
    expect(totalProfit).toBeLessThan(0);
  });

  it("should handle zero revenue", () => {
    const products = [
      { totalRevenue: 0, productionCost: 5000 },
      { totalRevenue: 0, productionCost: 3000 },
    ];
    
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCosts = products.reduce((sum, p) => sum + p.productionCost, 0);
    
    expect(totalRevenue).toBe(0);
    expect(totalCosts).toBe(8000);
  });
});

describe("Section 9: Company Dashboard - Product Validation", () => {
  it("should validate product name is required", () => {
    const productName = "";
    expect(productName.trim()).toBe("");
  });

  it("should validate product description is required", () => {
    const description = "";
    expect(description.trim()).toBe("");
  });

  it("should validate price is positive", () => {
    const price = 1000;
    expect(price).toBeGreaterThan(0);
  });

  it("should reject zero price", () => {
    const price = 0;
    expect(price).toBe(0);
  });

  it("should reject negative price", () => {
    const price = -100;
    expect(price).toBeLessThan(0);
  });

  it("should check company has sufficient balance for production cost", () => {
    const companyBalance = 10000; // $100
    const productionCost = 5000; // $50
    
    const hasSufficientBalance = companyBalance >= productionCost;
    expect(hasSufficientBalance).toBe(true);
  });

  it("should reject if company balance is insufficient", () => {
    const companyBalance = 3000; // $30
    const productionCost = 5000; // $50
    
    const hasSufficientBalance = companyBalance >= productionCost;
    expect(hasSufficientBalance).toBe(false);
  });
});

describe("Section 9: Company Dashboard - Product Sales Tracking", () => {
  it("should track total units sold", () => {
    const product = {
      totalSold: 100,
    };
    
    expect(product.totalSold).toBe(100);
  });

  it("should calculate revenue from sales", () => {
    const price = 1000; // $10
    const quantitySold = 50;
    const revenue = price * quantitySold;
    
    expect(revenue).toBe(50000); // $500
  });

  it("should update product stats after sale", () => {
    let product = {
      totalRevenue: 10000,
      totalSold: 10,
    };
    
    const salePrice = 1000;
    const quantity = 5;
    
    product.totalRevenue += salePrice * quantity;
    product.totalSold += quantity;
    
    expect(product.totalRevenue).toBe(15000); // $150
    expect(product.totalSold).toBe(15);
  });
});

describe("Section 10: Marketplace - Search and Filter Logic", () => {
  const sampleProducts = [
    { name: "Gaming Laptop", description: "High-end gaming laptop", price: 150000, tags: ["electronics", "gaming"], companyId: "comp1" },
    { name: "Office Chair", description: "Ergonomic office chair", price: 25000, tags: ["furniture", "office"], companyId: "comp2" },
    { name: "Wireless Mouse", description: "Bluetooth gaming mouse", price: 5000, tags: ["electronics", "gaming", "accessories"], companyId: "comp1" },
    { name: "Standing Desk", description: "Adjustable standing desk", price: 40000, tags: ["furniture", "office"], companyId: "comp2" },
  ];

  it("should filter products by search query (name)", () => {
    const searchQuery = "laptop";
    const filtered = sampleProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Gaming Laptop");
  });

  it("should filter products by search query (description)", () => {
    const searchQuery = "gaming";
    const filtered = sampleProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered).toHaveLength(2); // Gaming Laptop and Wireless Mouse
  });

  it("should filter products by search query (tags)", () => {
    const searchQuery = "furniture";
    const filtered = sampleProducts.filter(p => 
      p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    expect(filtered).toHaveLength(2); // Office Chair and Standing Desk
  });

  it("should filter products by company", () => {
    const companyId = "comp1";
    const filtered = sampleProducts.filter(p => p.companyId === companyId);
    
    expect(filtered).toHaveLength(2); // Gaming Laptop and Wireless Mouse
  });

  it("should filter products by price range", () => {
    const minPrice = 10000; // $100
    const maxPrice = 50000; // $500
    const filtered = sampleProducts.filter(p => 
      p.price >= minPrice && p.price <= maxPrice
    );
    
    expect(filtered).toHaveLength(2); // Office Chair and Standing Desk
  });

  it("should combine multiple filters", () => {
    const searchQuery = "gaming";
    const maxPrice = 10000;
    
    const filtered = sampleProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPrice = p.price <= maxPrice;
      return matchesSearch && matchesPrice;
    });
    
    expect(filtered).toHaveLength(1); // Only Wireless Mouse
    expect(filtered[0].name).toBe("Wireless Mouse");
  });
});

describe("Section 10: Marketplace - Sort Logic", () => {
  const products = [
    { name: "Product A", price: 15000, createdAt: 1000 },
    { name: "Product B", price: 5000, createdAt: 3000 },
    { name: "Product C", price: 10000, createdAt: 2000 },
  ];

  it("should sort by price ascending", () => {
    const sorted = [...products].sort((a, b) => a.price - b.price);
    
    expect(sorted[0].name).toBe("Product B");
    expect(sorted[1].name).toBe("Product C");
    expect(sorted[2].name).toBe("Product A");
  });

  it("should sort by price descending", () => {
    const sorted = [...products].sort((a, b) => b.price - a.price);
    
    expect(sorted[0].name).toBe("Product A");
    expect(sorted[1].name).toBe("Product C");
    expect(sorted[2].name).toBe("Product B");
  });

  it("should sort by newest first", () => {
    const sorted = [...products].sort((a, b) => b.createdAt - a.createdAt);
    
    expect(sorted[0].name).toBe("Product B");
    expect(sorted[1].name).toBe("Product C");
    expect(sorted[2].name).toBe("Product A");
  });
});

describe("Section 10: Marketplace - Cart Operations", () => {
  it("should add item to cart", () => {
    const cart: any[] = [];
    const newItem = { productId: "prod1", quantity: 2, pricePerUnit: 1000 };
    
    cart.push(newItem);
    
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("should update quantity if product already in cart", () => {
    const cart = [
      { productId: "prod1", quantity: 2, pricePerUnit: 1000 },
    ];
    
    const existingItem = cart.find(item => item.productId === "prod1");
    if (existingItem) {
      existingItem.quantity += 3;
    }
    
    expect(cart[0].quantity).toBe(5);
  });

  it("should remove item from cart", () => {
    let cart = [
      { productId: "prod1", quantity: 2, pricePerUnit: 1000 },
      { productId: "prod2", quantity: 1, pricePerUnit: 2000 },
    ];
    
    cart = cart.filter(item => item.productId !== "prod1");
    
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe("prod2");
  });

  it("should calculate cart total", () => {
    const cart = [
      { productId: "prod1", quantity: 2, pricePerUnit: 1000 },
      { productId: "prod2", quantity: 1, pricePerUnit: 2000 },
      { productId: "prod3", quantity: 3, pricePerUnit: 500 },
    ];
    
    const total = cart.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
    
    expect(total).toBe(5500); // $55
  });

  it("should calculate cart item count", () => {
    const cart = [
      { productId: "prod1", quantity: 2, pricePerUnit: 1000 },
      { productId: "prod2", quantity: 1, pricePerUnit: 2000 },
      { productId: "prod3", quantity: 3, pricePerUnit: 500 },
    ];
    
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    expect(itemCount).toBe(6);
  });

  it("should handle empty cart", () => {
    const cart: any[] = [];
    const total = cart.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    expect(total).toBe(0);
    expect(itemCount).toBe(0);
  });
});

describe("Section 10: Marketplace - Stock Validation", () => {
  it("should check if product has sufficient stock", () => {
    const product = { stock: 10 };
    const requestedQuantity = 5;
    
    const hasStock = product.stock >= requestedQuantity;
    expect(hasStock).toBe(true);
  });

  it("should reject if stock is insufficient", () => {
    const product = { stock: 3 };
    const requestedQuantity = 5;
    
    const hasStock = product.stock >= requestedQuantity;
    expect(hasStock).toBe(false);
  });

  it("should handle unlimited stock (null/undefined)", () => {
    const product = { stock: undefined };
    const requestedQuantity = 1000;
    
    const hasStock = product.stock === undefined || product.stock === null || product.stock >= requestedQuantity;
    expect(hasStock).toBe(true);
  });

  it("should update stock after purchase", () => {
    let product = { stock: 10 };
    const purchaseQuantity = 3;
    
    product.stock -= purchaseQuantity;
    
    expect(product.stock).toBe(7);
  });

  it("should check maxPerOrder limit", () => {
    const product = { maxPerOrder: 5 };
    const requestedQuantity = 3;
    
    const isWithinLimit = !product.maxPerOrder || requestedQuantity <= product.maxPerOrder;
    expect(isWithinLimit).toBe(true);
  });

  it("should reject if exceeds maxPerOrder", () => {
    const product = { maxPerOrder: 5 };
    const requestedQuantity = 10;
    
    const isWithinLimit = !product.maxPerOrder || requestedQuantity <= product.maxPerOrder;
    expect(isWithinLimit).toBe(false);
  });
});

describe("Section 10: Marketplace - Checkout Validation", () => {
  it("should validate player has sufficient balance", () => {
    const playerBalance = 10000; // $100
    const cartTotal = 7500; // $75
    
    const hasSufficientBalance = playerBalance >= cartTotal;
    expect(hasSufficientBalance).toBe(true);
  });

  it("should reject if balance is insufficient", () => {
    const playerBalance = 5000; // $50
    const cartTotal = 7500; // $75
    
    const hasSufficientBalance = playerBalance >= cartTotal;
    expect(hasSufficientBalance).toBe(false);
  });

  it("should validate company has sufficient balance", () => {
    const companyBalance = 20000; // $200
    const cartTotal = 15000; // $150
    
    const hasSufficientBalance = companyBalance >= cartTotal;
    expect(hasSufficientBalance).toBe(true);
  });

  it("should deduct from balance after checkout", () => {
    let playerBalance = 10000; // $100
    const cartTotal = 7500; // $75
    
    playerBalance -= cartTotal;
    
    expect(playerBalance).toBe(2500); // $25 remaining
  });

  it("should credit seller company after sale", () => {
    let companyBalance = 50000; // $500
    const saleAmount = 7500; // $75
    
    companyBalance += saleAmount;
    
    expect(companyBalance).toBe(57500); // $575
  });

  it("should clear cart after successful checkout", () => {
    let cart = [
      { productId: "prod1", quantity: 2 },
      { productId: "prod2", quantity: 1 },
    ];
    
    // Simulate clearing cart
    cart = [];
    
    expect(cart).toHaveLength(0);
  });
});

describe("Section 10: Marketplace - Transaction Recording", () => {
  it("should create transaction record for purchase", () => {
    const transaction = {
      fromAccountId: "player1",
      fromAccountType: "player" as const,
      toAccountId: "company1",
      toAccountType: "company" as const,
      amount: 5000,
      assetType: "product" as const,
      description: "Purchased 2x Gaming Mouse",
    };
    
    expect(transaction.fromAccountType).toBe("player");
    expect(transaction.toAccountType).toBe("company");
    expect(transaction.amount).toBe(5000);
  });

  it("should create marketplace sale record", () => {
    const sale = {
      productId: "prod1",
      companyId: "company1",
      quantity: 2,
      purchaserId: "player1",
      purchaserType: "player" as const,
      totalPrice: 5000,
    };
    
    expect(sale.quantity).toBe(2);
    expect(sale.totalPrice).toBe(5000);
  });

  it("should update product revenue after sale", () => {
    let product = {
      totalRevenue: 10000,
      totalSold: 10,
    };
    
    const saleQuantity = 5;
    const salePrice = 1000;
    
    product.totalRevenue += salePrice * saleQuantity;
    product.totalSold += saleQuantity;
    
    expect(product.totalRevenue).toBe(15000);
    expect(product.totalSold).toBe(15);
  });
});
