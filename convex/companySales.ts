import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation: List company for sale
export const listCompanyForSale = mutation({
  args: {
    companyId: v.id("companies"),
    askingPrice: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Check if already listed
    const existing = await ctx.db
      .query("companySales")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "listed"),
          q.eq(q.field("status"), "offer_pending"),
          q.eq(q.field("status"), "counter_offer")
        )
      )
      .first();

    if (existing) {
      throw new Error("Company is already listed for sale");
    }

    const now = Date.now();

    const saleId = await ctx.db.insert("companySales", {
      companyId: args.companyId,
      sellerId: company.ownerId,
      askingPrice: args.askingPrice,
      status: "listed" as const,
      createdAt: now,
      updatedAt: now,
    });

    return saleId;
  },
});

// Mutation: Make offer on company
export const makeCompanySaleOffer = mutation({
  args: {
    companyId: v.id("companies"),
    buyerId: v.id("players"),
    offeredPrice: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const buyer = await ctx.db.get(args.buyerId);
    if (!buyer) {
      throw new Error("Buyer not found");
    }

    // Check buyer isn't the owner
    if (company.ownerId === args.buyerId) {
      throw new Error("Cannot buy your own company");
    }

    // Check buyer balance
    if (buyer.balance < args.offeredPrice) {
      throw new Error("Insufficient balance for offer");
    }

    // Check if company is listed
    const listing = await ctx.db
      .query("companySales")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "listed"))
      .first();

    const now = Date.now();

    if (listing) {
      // Update existing listing with offer
      await ctx.db.patch(listing._id, {
        buyerId: args.buyerId,
        offeredPrice: args.offeredPrice,
        status: "offer_pending" as const,
        updatedAt: now,
      });
      return listing._id;
    } else {
      // Create new offer (unsolicited)
      const saleId = await ctx.db.insert("companySales", {
        companyId: args.companyId,
        sellerId: company.ownerId,
        buyerId: args.buyerId,
        askingPrice: 0, // Unsolicited offer
        offeredPrice: args.offeredPrice,
        status: "offer_pending" as const,
        createdAt: now,
        updatedAt: now,
      });
      return saleId;
    }
  },
});

// Mutation: Respond to company sale offer
export const respondToCompanySaleOffer = mutation({
  args: {
    offerId: v.id("companySales"),
    response: v.union(v.literal("accept"), v.literal("reject"), v.literal("counter")),
    counterOfferPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }

    if (offer.status !== "offer_pending" && offer.status !== "counter_offer") {
      throw new Error("Offer is not pending");
    }

    const company = await ctx.db.get(offer.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const now = Date.now();

    if (args.response === "accept") {
      // Process sale
      if (!offer.buyerId || !offer.offeredPrice) {
        throw new Error("Invalid offer data");
      }

      const buyer = await ctx.db.get(offer.buyerId);
      if (!buyer) {
        throw new Error("Buyer not found");
      }

      const finalPrice = offer.counterOfferPrice || offer.offeredPrice;

      if (buyer.balance < finalPrice) {
        throw new Error("Buyer has insufficient balance");
      }

      // Transfer payment
      await ctx.db.patch(offer.buyerId, {
        balance: buyer.balance - finalPrice,
        updatedAt: now,
      });

      const seller = await ctx.db.get(offer.sellerId);
      if (seller) {
        await ctx.db.patch(offer.sellerId, {
          balance: seller.balance + finalPrice,
          updatedAt: now,
        });
      }

      // Transfer company ownership
      await ctx.db.patch(offer.companyId, {
        ownerId: offer.buyerId,
        updatedAt: now,
      });

      // Update offer status
      await ctx.db.patch(args.offerId, {
        status: "accepted" as const,
        updatedAt: now,
      });

      // Create transaction
      await ctx.db.insert("transactions", {
        fromAccountId: offer.buyerId,
        fromAccountType: "player" as const,
        toAccountId: offer.sellerId,
        toAccountType: "player" as const,
        amount: finalPrice,
        assetType: "cash" as const,
        description: `Company sale: ${company.name}`,
        createdAt: now,
      });

      return { success: true, newOwnerId: offer.buyerId };
    } else if (args.response === "reject") {
      await ctx.db.patch(args.offerId, {
        status: "rejected" as const,
        updatedAt: now,
      });
      return { success: true };
    } else if (args.response === "counter") {
      if (!args.counterOfferPrice) {
        throw new Error("Counter offer price is required");
      }
      await ctx.db.patch(args.offerId, {
        counterOfferPrice: args.counterOfferPrice,
        status: "counter_offer" as const,
        updatedAt: now,
      });
      return { success: true, counterPrice: args.counterOfferPrice };
    }

    throw new Error("Invalid response");
  },
});

// Mutation: Cancel company sale listing
export const cancelCompanySaleListing = mutation({
  args: {
    offerId: v.id("companySales"),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }

    await ctx.db.patch(args.offerId, {
      status: "cancelled" as const,
      updatedAt: Date.now(),
    });
  },
});

// Query: Get company sale offers
export const getCompanySaleOffers = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companySales")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// Query: Get player's pending offers (as seller)
export const getPlayerPendingOffers = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const offers = await ctx.db
      .query("companySales")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", args.playerId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "offer_pending"),
          q.eq(q.field("status"), "counter_offer")
        )
      )
      .collect();

    // Enrich with company data
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        const company = await ctx.db.get(offer.companyId);
        const buyer = offer.buyerId ? await ctx.db.get(offer.buyerId) : null;
        return {
          ...offer,
          company,
          buyer,
        };
      })
    );

    return enrichedOffers;
  },
});

// Query: Get player's offers as buyer
export const getPlayerOffersAsBuyer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const offers = await ctx.db
      .query("companySales")
      .withIndex("by_buyerId", (q) => q.eq("buyerId", args.playerId))
      .collect();

    // Enrich with company data
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        const company = await ctx.db.get(offer.companyId);
        const seller = await ctx.db.get(offer.sellerId);
        return {
          ...offer,
          company,
          seller,
        };
      })
    );

    return enrichedOffers;
  },
});

// Query: Get all companies for sale
export const getAllCompaniesForSale = query({
  handler: async (ctx) => {
    const sales = await ctx.db
      .query("companySales")
      .withIndex("by_status", (q) => q.eq("status", "listed"))
      .collect();

    // Enrich with company and seller data
    const enrichedSales = await Promise.all(
      sales.map(async (sale) => {
        const company = await ctx.db.get(sale.companyId);
        const seller = await ctx.db.get(sale.sellerId);
        return {
          ...sale,
          company,
          seller,
        };
      })
    );

    return enrichedSales.filter((s) => s.company && s.seller);
  },
});
