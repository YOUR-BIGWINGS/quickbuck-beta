import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Add item to cart
export const addToCart = mutation({
  args: {
    userId: v.id("players"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Validate quantity is positive and safe integer
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    if (!Number.isSafeInteger(args.quantity)) {
      throw new Error("Quantity is not a safe integer");
    }

    // EXPLOIT FIX: Set max cart quantity per item
    const MAX_CART_QUANTITY = 100000; // 100k units max per item
    if (args.quantity > MAX_CART_QUANTITY) {
      throw new Error(
        `Cannot add more than ${MAX_CART_QUANTITY} units to cart`
      );
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.isActive || product.isArchived) {
      throw new Error("Product is not available");
    }

    // Check stock availability
    if (
      product.stock !== undefined &&
      product.stock !== null &&
      product.stock < args.quantity
    ) {
      throw new Error("Insufficient stock");
    }

    // Check max per order
    if (product.maxPerOrder && args.quantity > product.maxPerOrder) {
      throw new Error(`Maximum ${product.maxPerOrder} units per order`);
    }

    // Get or create cart
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();

    if (!cart) {
      const cartId = await ctx.db.insert("carts", {
        userId: args.userId,
        totalPrice: 0,
        createdAt: now,
        updatedAt: now,
      });
      cart = await ctx.db.get(cartId);
      if (!cart) throw new Error("Failed to create cart");
    }

    // Check if product already in cart
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (existingItem) {
      // Update quantity
      await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
    } else {
      // Add new item
      await ctx.db.insert("cartItems", {
        cartId: cart._id,
        productId: args.productId,
        quantity: args.quantity,
        pricePerUnit: product.price,
      });
    }

    // Update cart total
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.pricePerUnit * item.quantity,
      0
    );

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: now,
    });

    return cart._id;
  },
});

// Mutation: Remove item from cart
export const removeFromCart = mutation({
  args: {
    userId: v.id("players"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (!cartItem) {
      throw new Error("Item not in cart");
    }

    await ctx.db.delete(cartItem._id);

    // Update cart total
    const remainingItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = remainingItems.reduce(
      (sum, item) => sum + item.pricePerUnit * item.quantity,
      0
    );

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Update cart item quantity
export const updateCartItemQuantity = mutation({
  args: {
    userId: v.id("players"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Validate quantity is positive and safe integer
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    if (!Number.isSafeInteger(args.quantity)) {
      throw new Error("Quantity is not a safe integer");
    }

    // EXPLOIT FIX: Set max cart quantity per item
    const MAX_CART_QUANTITY = 100000;
    if (args.quantity > MAX_CART_QUANTITY) {
      throw new Error(
        `Cannot add more than ${MAX_CART_QUANTITY} units to cart`
      );
    }

    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (!cartItem) {
      throw new Error("Item not in cart");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check stock
    if (
      product.stock !== undefined &&
      product.stock !== null &&
      product.stock < args.quantity
    ) {
      throw new Error("Insufficient stock");
    }

    await ctx.db.patch(cartItem._id, {
      quantity: args.quantity,
    });

    // Update cart total
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.pricePerUnit * item.quantity,
      0
    );

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Checkout cart
export const checkout = mutation({
  args: {
    userId: v.id("players"),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart is empty");
    }

    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Get player for rebirth discount check
    const player = await ctx.db.get(args.userId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if player has rebirth 5 discount
    const rebirthCount = player.rebirthCount || 0;
    const hasRebirthDiscount = rebirthCount >= 5;
    let discountRate = hasRebirthDiscount ? 0.05 : 0; // 5% discount for rebirth 5+

    // Check for marketplace discount upgrade
    const playerUpgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const hasMarketplaceDiscount = playerUpgrades.some(u => u.upgradeType === "marketplace_discount");
    if (hasMarketplaceDiscount) {
      discountRate += 0.1; // Additional 10% discount
    }

    // Verify stock and calculate total
    let total = 0;
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive || product.isArchived) {
        throw new Error(`Product ${item.productId} is not available`);
      }
      if (
        product.stock !== undefined &&
        product.stock !== null &&
        product.stock < item.quantity
      ) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Apply rebirth discount if applicable
      const discountedPrice = hasRebirthDiscount 
        ? Math.floor(product.price * (1 - discountRate))
        : product.price;
      
      const itemTotal = discountedPrice * item.quantity;

      // EXPLOIT FIX: Validate item total is safe
      if (!Number.isSafeInteger(itemTotal)) {
        throw new Error(`Price calculation overflow for ${product.name}`);
      }

      total += itemTotal; // Use discounted price

      // EXPLOIT FIX: Validate running total is safe
      if (!Number.isSafeInteger(total)) {
        throw new Error("Total cost calculation overflow");
      }
    }

    // Calculate 2% transaction tax
    const TRANSACTION_TAX_RATE = 0.02;
    const transactionTax = Math.floor(total * TRANSACTION_TAX_RATE);
    const totalWithTax = total + transactionTax;

    // Check balance (including tax)
    if (args.accountType === "player") {
      const playerId = args.accountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player || player.balance < totalWithTax) {
        throw new Error("Insufficient balance (including 2% transaction tax)");
      }
      await ctx.db.patch(playerId, {
        balance: player.balance - totalWithTax,
        updatedAt: Date.now(),
      });

      // Record transaction tax
      await ctx.db.insert("taxes", {
        playerId: playerId,
        taxType: "transaction",
        amount: transactionTax,
        taxRate: TRANSACTION_TAX_RATE,
        description: `Transaction tax on cart purchase ($${(total / 100).toFixed(2)})`,
        timestamp: Date.now(),
      });
    } else {
      const companyId = args.accountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company || company.balance < totalWithTax) {
        throw new Error("Insufficient balance (including 2% transaction tax)");
      }
      await ctx.db.patch(companyId, {
        balance: company.balance - totalWithTax,
        updatedAt: Date.now(),
      });

      // Record transaction tax (for company owner)
      await ctx.db.insert("taxes", {
        playerId: company.ownerId,
        taxType: "transaction",
        amount: transactionTax,
        taxRate: TRANSACTION_TAX_RATE,
        description: `Transaction tax on company cart purchase ($${(total / 100).toFixed(2)})`,
        timestamp: Date.now(),
      });
    }

    const now = Date.now();

    // Track unique companies for payment distribution
    const companyPayments = new Map<Id<"companies">, number>();
    const itemDescriptions: string[] = [];

    // Process each item
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      // Apply rebirth discount if applicable
      const discountedPrice = hasRebirthDiscount 
        ? Math.floor(product.price * (1 - discountRate))
        : product.price;

      // Update stock
      if (product.stock !== undefined && product.stock !== null) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
          updatedAt: now,
        });
      }

      // Update product revenue and sales (using discounted price)
      await ctx.db.patch(item.productId, {
        totalRevenue: product.totalRevenue + discountedPrice * item.quantity,
        totalSold: product.totalSold + item.quantity,
        updatedAt: now,
      });

      // Add item to player inventory
      const existingInventory = await ctx.db
        .query("playerInventory")
        .withIndex("by_playerId_productId", (q) =>
          q.eq("playerId", args.userId).eq("productId", item.productId)
        )
        .unique();

      if (existingInventory) {
        // Update existing inventory
        await ctx.db.patch(existingInventory._id, {
          quantity: existingInventory.quantity + item.quantity,
          totalPrice:
            existingInventory.totalPrice + discountedPrice * item.quantity,
          purchasedAt: now,
        });
      } else {
        // Create new inventory entry
        await ctx.db.insert("playerInventory", {
          playerId: args.userId,
          productId: item.productId,
          quantity: item.quantity,
          purchasedAt: now,
          totalPrice: discountedPrice * item.quantity,
        });
      }

      // Credit company (using discounted price)
      const company = await ctx.db.get(product.companyId);
      if (company) {
        await ctx.db.patch(product.companyId, {
          balance: company.balance + discountedPrice * item.quantity,
          updatedAt: now,
        });
      }

      // Create marketplace sale record
      await ctx.db.insert("marketplaceSales", {
        productId: item.productId,
        companyId: product.companyId,
        quantity: item.quantity,
        purchaserId: args.userId,
        purchaserType: "player" as const,
        totalPrice: discountedPrice * item.quantity,
        createdAt: now,
      });

      // Track company payments for consolidated transaction
      const itemTotal = discountedPrice * item.quantity;
      const currentAmount = companyPayments.get(product.companyId) || 0;
      companyPayments.set(product.companyId, currentAmount + itemTotal);

      // Build description
      itemDescriptions.push(`${item.quantity}x ${product.name}`);

      // Delete cart item
      await ctx.db.delete(item._id);
    }

    // DUPLICATE FIX: Create ONE consolidated transaction for the entire cart purchase
    // instead of separate transactions per item
    const itemCount = cartItems.length;
    const description = itemCount === 1 
      ? itemDescriptions[0] 
      : `Cart checkout: ${itemCount} items (${itemDescriptions.slice(0, 3).join(", ")}${itemCount > 3 ? "..." : ""})`;

    await ctx.db.insert("transactions", {
      fromAccountId: args.accountId,
      fromAccountType: args.accountType,
      toAccountId: args.accountId, // Self-reference for cart purchases
      toAccountType: args.accountType,
      amount: total,
      assetType: "product" as const,
      description: description,
      createdAt: now,
    });

    // Clear cart
    await ctx.db.patch(cart._id, {
      totalPrice: 0,
      updatedAt: now,
    });

    return { success: true, total, transactionTax, totalWithTax };
  },
});

// Mutation: Checkout with crypto payment
export const checkoutWithCrypto = mutation({
  args: {
    userId: v.id("players"),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
    cryptoId: v.id("cryptocurrencies"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart is empty");
    }

    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Get crypto for current price
    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) {
      throw new Error("Cryptocurrency not found");
    }

    if (crypto.currentPrice <= 0) {
      throw new Error("Invalid crypto price");
    }

    // Get player for rebirth discount check
    const playerId = args.accountId as Id<"players">;
    const player = await ctx.db.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if player has rebirth 5 discount
    const rebirthCount = player.rebirthCount || 0;
    const hasRebirthDiscount = rebirthCount >= 5;
    const discountRate = hasRebirthDiscount ? 0.05 : 0; // 5% discount for rebirth 5+

    // Verify stock and calculate total in base currency
    let total = 0;
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive || product.isArchived) {
        throw new Error(`Product ${item.productId} is not available`);
      }
      if (
        product.stock !== undefined &&
        product.stock !== null &&
        product.stock < item.quantity
      ) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Apply rebirth discount if applicable
      const discountedPrice = hasRebirthDiscount 
        ? Math.floor(product.price * (1 - discountRate))
        : product.price;

      const itemTotal = discountedPrice * item.quantity;

      if (!Number.isSafeInteger(itemTotal)) {
        throw new Error(`Price calculation overflow for ${product.name}`);
      }

      total += itemTotal;

      if (!Number.isSafeInteger(total)) {
        throw new Error("Total cost calculation overflow");
      }
    }

    // Calculate crypto needed based on current price
    const cryptoNeeded = total / crypto.currentPrice;

    // Calculate 2% transaction tax (in cash)
    const TRANSACTION_TAX_RATE = 0.02;
    const transactionTax = Math.floor(total * TRANSACTION_TAX_RATE);

    // Check player has enough crypto
    if (args.accountType !== "player") {
      throw new Error("Only players can use crypto for marketplace purchases");
    }

    // Check player has enough cash for transaction tax
    if (player.balance < transactionTax) {
      throw new Error(
        `Insufficient cash balance for 2% transaction tax ($${(transactionTax / 100).toFixed(2)})`
      );
    }

    const wallet = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_player_crypto", (q) =>
        q.eq("playerId", playerId).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (!wallet || wallet.balance < cryptoNeeded) {
      throw new Error(
        `Insufficient ${crypto.symbol} balance. Need ${cryptoNeeded.toFixed(
          8
        )}, have ${wallet?.balance.toFixed(8) || "0"}`
      );
    }

    // Deduct transaction tax from cash balance
    await ctx.db.patch(playerId, {
      balance: player.balance - transactionTax,
      updatedAt: Date.now(),
    });

    // Record transaction tax
    await ctx.db.insert("taxes", {
      playerId: playerId,
      taxType: "transaction",
      amount: transactionTax,
      taxRate: TRANSACTION_TAX_RATE,
      description: `Transaction tax on crypto cart purchase ($${(total / 100).toFixed(2)})`,
      timestamp: Date.now(),
    });

    // Deduct from crypto wallet
    const newWalletBalance = wallet.balance - cryptoNeeded;
    await ctx.db.patch(wallet._id, {
      balance: newWalletBalance,
      updatedAt: Date.now(),
    });

    // Record crypto transaction
    await ctx.db.insert("cryptoTransactions", {
      playerId: playerId,
      cryptoId: args.cryptoId,
      type: "sell" as const,
      amount: cryptoNeeded,
      pricePerCoin: crypto.currentPrice,
      totalValue: total,
      priceImpact: 0,
      timestamp: Date.now(),
    });

    const now = Date.now();

    // Track items for consolidated transaction
    const itemDescriptions: string[] = [];

    // Process each item
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      // Apply rebirth discount if applicable
      const discountedPrice = hasRebirthDiscount 
        ? Math.floor(product.price * (1 - discountRate))
        : product.price;

      // Update stock
      if (product.stock !== undefined && product.stock !== null) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
          updatedAt: now,
        });
      }

      // Update product revenue and sales (using discounted price)
      await ctx.db.patch(item.productId, {
        totalRevenue: product.totalRevenue + discountedPrice * item.quantity,
        totalSold: product.totalSold + item.quantity,
        updatedAt: now,
      });

      // Add item to player inventory
      const existingInventory = await ctx.db
        .query("playerInventory")
        .withIndex("by_playerId_productId", (q) =>
          q.eq("playerId", args.userId).eq("productId", item.productId)
        )
        .unique();

      if (existingInventory) {
        await ctx.db.patch(existingInventory._id, {
          quantity: existingInventory.quantity + item.quantity,
          totalPrice:
            existingInventory.totalPrice + discountedPrice * item.quantity,
          purchasedAt: now,
        });
      } else {
        await ctx.db.insert("playerInventory", {
          playerId: args.userId,
          productId: item.productId,
          quantity: item.quantity,
          purchasedAt: now,
          totalPrice: discountedPrice * item.quantity,
        });
      }

      // Credit company in base currency (using discounted price)
      const company = await ctx.db.get(product.companyId);
      if (company) {
        await ctx.db.patch(product.companyId, {
          balance: company.balance + discountedPrice * item.quantity,
          updatedAt: now,
        });
      }

      // Create marketplace sale record
      await ctx.db.insert("marketplaceSales", {
        productId: item.productId,
        companyId: product.companyId,
        quantity: item.quantity,
        purchaserId: args.userId,
        purchaserType: "player" as const,
        totalPrice: discountedPrice * item.quantity,
        createdAt: now,
      });

      // Build description
      itemDescriptions.push(`${item.quantity}x ${product.name}`);

      await ctx.db.delete(item._id);
    }

    // DUPLICATE FIX: Create ONE consolidated transaction for the entire crypto cart purchase
    const itemCount = cartItems.length;
    const description = itemCount === 1 
      ? `Purchased ${itemDescriptions[0]} (paid with ${cryptoNeeded.toFixed(8)} ${crypto.symbol})`
      : `Cart checkout: ${itemCount} items (${itemDescriptions.slice(0, 3).join(", ")}${itemCount > 3 ? "..." : ""}) (paid with ${cryptoNeeded.toFixed(8)} ${crypto.symbol})`;

    await ctx.db.insert("transactions", {
      fromAccountId: args.accountId,
      fromAccountType: "player" as const,
      toAccountId: args.accountId, // Self-reference for cart purchases
      toAccountType: "player" as const,
      amount: total,
      assetType: "crypto" as const,
      assetId: args.cryptoId,
      description: description,
      createdAt: now,
    });

    // Clear cart
    await ctx.db.patch(cart._id, {
      totalPrice: 0,
      updatedAt: now,
    });

    return {
      success: true,
      totalInBaseCurrency: total,
      cryptoUsed: cryptoNeeded,
      cryptoSymbol: crypto.symbol,
      cryptoPrice: crypto.currentPrice,
      transactionTax,
    };
  },
});

// Query: Get player's cart
export const getPlayerCart = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      return null;
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    return { cart, items };
  },
});

// Query: Get cart item count
export const getCartItemCount = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) return 0;

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
});
