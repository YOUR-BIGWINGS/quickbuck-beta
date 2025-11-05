import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";

describe("Player Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;

  beforeEach(async () => {
    t = convexTest();
    
    // Create a test user first
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
        email: "test@example.com",
      });
    });
  });

  it("should create a new player with starting balance", async () => {
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    const player = await t.query(api.players.getPlayer, { playerId });
    
    expect(player).toBeDefined();
    expect(player.userId).toBe(userId);
    expect(player.balance).toBe(1000000); // $10,000 starting balance
    expect(player.netWorth).toBe(1000000);
  });

  it("should not create duplicate players for same user", async () => {
    const playerId1 = await t.mutation(api.players.createPlayer, { userId });
    const playerId2 = await t.mutation(api.players.createPlayer, { userId });
    
    // Should return the same player ID
    expect(playerId1).toBe(playerId2);
  });

  it("should update player balance correctly", async () => {
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    // Add $50
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 5000,
    });
    
    const balance = await t.query(api.players.getPlayerBalance, { playerId });
    expect(balance).toBe(1005000); // $10,050
  });

  it("should handle negative balance updates", async () => {
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    // Deduct $100
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: -10000,
    });
    
    const balance = await t.query(api.players.getPlayerBalance, { playerId });
    expect(balance).toBe(990000); // $9,900
  });

  it("should calculate net worth from player balance only initially", async () => {
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    const netWorth = await t.query(api.players.getPlayerNetWorth, { playerId });
    expect(netWorth).toBe(1000000); // Same as balance initially
  });

  it("should get player by user ID", async () => {
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    const player = await t.query(api.players.getPlayerByUserId, { userId });
    
    expect(player).toBeDefined();
    expect(player._id).toBe(playerId);
  });

  it("should get all players sorted by balance", async () => {
    // Create multiple players
    const player1Id = await t.mutation(api.players.createPlayer, { userId });
    
    const userId2 = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
        name: "Test User 2",
      });
    });
    const player2Id = await t.mutation(api.players.createPlayer, { userId: userId2 });
    
    // Give player 2 more money
    await t.mutation(api.players.updatePlayerBalance, {
      playerId: player2Id,
      amount: 5000000, // +$50,000
    });
    
    const players = await t.query(api.players.getAllPlayers, { sortBy: "balance" });
    
    expect(players.length).toBe(2);
    expect(players[0]._id).toBe(player2Id); // Higher balance first
    expect(players[1]._id).toBe(player1Id);
  });

  it("should get top N players", async () => {
    // Create 3 players
    const player1Id = await t.mutation(api.players.createPlayer, { userId });
    
    const userId2 = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
      });
    });
    const player2Id = await t.mutation(api.players.createPlayer, { userId: userId2 });
    
    const userId3 = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-789",
      });
    });
    const player3Id = await t.mutation(api.players.createPlayer, { userId: userId3 });
    
    // Get top 2
    const topPlayers = await t.query(api.players.getTopPlayers, {
      limit: 2,
      sortBy: "balance",
    });
    
    expect(topPlayers.length).toBe(2);
  });

  it("should return 0 for non-existent player balance", async () => {
    const fakePlayerId = "fake-player-id" as any;
    const balance = await t.query(api.players.getPlayerBalance, { playerId: fakePlayerId });
    expect(balance).toBe(0);
  });
});
