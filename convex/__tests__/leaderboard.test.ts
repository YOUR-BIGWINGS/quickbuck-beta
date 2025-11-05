import { describe, expect, it } from "vitest";

/**
 * Leaderboard calculation and sorting tests
 */

describe("Leaderboard Calculations and Sorting", () => {
  // Test data
  const mockPlayers = [
    { _id: "p1" as any, balance: 5000000, netWorth: 10000000, userId: "u1" as any },
    { _id: "p2" as any, balance: 3000000, netWorth: 8000000, userId: "u2" as any },
    { _id: "p3" as any, balance: 7000000, netWorth: 15000000, userId: "u3" as any },
    { _id: "p4" as any, balance: 2000000, netWorth: 5000000, userId: "u4" as any },
    { _id: "p5" as any, balance: 9000000, netWorth: 20000000, userId: "u5" as any },
  ];

  const mockCompanies = [
    {
      _id: "c1" as any,
      balance: 1000000,
      marketCap: 5000000,
      isPublic: true,
      ownerId: "p1" as any,
    },
    {
      _id: "c2" as any,
      balance: 5000000,
      marketCap: 15000000,
      isPublic: true,
      ownerId: "p2" as any,
    },
    {
      _id: "c3" as any,
      balance: 2000000,
      marketCap: 8000000,
      isPublic: true,
      ownerId: "p3" as any,
    },
    {
      _id: "c4" as any,
      balance: 3000000,
      marketCap: 0,
      isPublic: false,
      ownerId: "p4" as any,
    },
    {
      _id: "c5" as any,
      balance: 4000000,
      marketCap: 20000000,
      isPublic: true,
      ownerId: "p5" as any,
    },
  ];

  it("should sort players by balance descending", () => {
    const sorted = mockPlayers.sort((a, b) => b.balance - a.balance).slice(0, 5);

    expect(sorted[0].balance).toBe(9000000);
    expect(sorted[1].balance).toBe(7000000);
    expect(sorted[2].balance).toBe(5000000);
    expect(sorted[3].balance).toBe(3000000);
    expect(sorted[4].balance).toBe(2000000);
  });

  it("should sort players by net worth descending", () => {
    const sorted = mockPlayers.sort((a, b) => b.netWorth - a.netWorth).slice(0, 5);

    expect(sorted[0].netWorth).toBe(20000000);
    expect(sorted[1].netWorth).toBe(15000000);
    expect(sorted[2].netWorth).toBe(10000000);
    expect(sorted[3].netWorth).toBe(8000000);
    expect(sorted[4].netWorth).toBe(5000000);
  });

  it("should sort public companies by market cap descending", () => {
    const sorted = mockCompanies
      .filter((c) => c.isPublic)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 5);

    expect(sorted[0].marketCap).toBe(20000000);
    expect(sorted[1].marketCap).toBe(15000000);
    expect(sorted[2].marketCap).toBe(8000000);
    expect(sorted[3].marketCap).toBe(5000000);
    expect(sorted.length).toBe(4); // Only 4 public companies
  });

  it("should sort companies by balance descending", () => {
    const sorted = mockCompanies.sort((a, b) => b.balance - a.balance).slice(0, 5);

    expect(sorted[0].balance).toBe(5000000);
    expect(sorted[1].balance).toBe(4000000);
    expect(sorted[2].balance).toBe(3000000);
    expect(sorted[3].balance).toBe(2000000);
    expect(sorted[4].balance).toBe(1000000);
  });

  it("should calculate rankings correctly with offset", () => {
    const limit = 2;
    const offset = 0;
    const sorted = mockPlayers.sort((a, b) => b.netWorth - a.netWorth);
    const paginated = sorted.slice(offset, offset + limit);

    const ranked = paginated.map((player, index) => ({
      ...player,
      rank: offset + index + 1,
    }));

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it("should calculate rankings correctly with offset pagination", () => {
    const limit = 2;
    const offset = 2;
    const sorted = mockPlayers.sort((a, b) => b.netWorth - a.netWorth);
    const paginated = sorted.slice(offset, offset + limit);

    const ranked = paginated.map((player, index) => ({
      ...player,
      rank: offset + index + 1,
    }));

    expect(ranked[0].rank).toBe(3);
    expect(ranked[1].rank).toBe(4);
  });

  it("should filter public companies only", () => {
    const publicCompanies = mockCompanies.filter((c) => c.isPublic);

    expect(publicCompanies.length).toBe(4);
    expect(publicCompanies.every((c) => c.isPublic)).toBe(true);
  });

  it("should search players by partial name match", () => {
    const players = [
      { name: "Alice Smith", userId: "u1" as any },
      { name: "Bob Johnson", userId: "u2" as any },
      { name: "Alice Cooper", userId: "u3" as any },
    ];

    const searchResults = players.filter((p) =>
      p.name.toLowerCase().includes("alice")
    );

    expect(searchResults.length).toBe(2);
    expect(searchResults[0].name).toBe("Alice Smith");
    expect(searchResults[1].name).toBe("Alice Cooper");
  });

  it("should search companies by name or ticker", () => {
    const companies = [
      { name: "TechCorp", ticker: "TECH", _id: "c1" as any },
      { name: "Finance Inc", ticker: "FIN", _id: "c2" as any },
      { name: "Tech Ventures", ticker: "TVNC", _id: "c3" as any },
    ];

    const searchQuery = "tech";
    const searchResults = companies.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(searchQuery);
      const tickerMatch = c.ticker.toLowerCase().includes(searchQuery);
      return nameMatch || tickerMatch;
    });

    expect(searchResults.length).toBe(2);
    expect(searchResults[0].name).toBe("TechCorp");
    expect(searchResults[1].name).toBe("Tech Ventures");
  });

  it("should search products by name", () => {
    const products = [
      { name: "Laptop Pro", companyId: "c1" as any },
      { name: "Desktop Computer", companyId: "c1" as any },
      { name: "Keyboard", companyId: "c2" as any },
    ];

    const searchQuery = "computer";
    const searchResults = products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery)
    );

    expect(searchResults.length).toBe(1);
    expect(searchResults[0].name).toBe("Desktop Computer");
  });

  it("should handle empty search results", () => {
    const players = [
      { name: "Alice Smith", userId: "u1" as any },
      { name: "Bob Johnson", userId: "u2" as any },
    ];

    const searchResults = players.filter((p) =>
      p.name.toLowerCase().includes("zzzz")
    );

    expect(searchResults.length).toBe(0);
  });

  it("should handle case-insensitive search", () => {
    const companies = [
      { name: "TechCorp", ticker: "TECH", _id: "c1" as any },
    ];

    const searchQuery1 = "techcorp".toLowerCase();
    const searchQuery2 = "TECHCORP".toLowerCase();

    const result1 = companies.filter((c) =>
      c.name.toLowerCase().includes(searchQuery1)
    );
    const result2 = companies.filter((c) =>
      c.name.toLowerCase().includes(searchQuery2)
    );

    expect(result1.length).toBe(1);
    expect(result2.length).toBe(1);
  });

  it("should correctly calculate total pagination info", () => {
    const total = mockPlayers.length;
    const limit = 2;
    const offset = 0;

    const totalPages = Math.ceil(total / limit);

    expect(totalPages).toBe(3); // 5 players / 2 per page = 2.5 = 3 pages
    expect(total).toBe(5);
  });

  it("should handle tie-breaking in rankings", () => {
    const tiePlayers = [
      { _id: "p1" as any, balance: 5000000, netWorth: 10000000 },
      { _id: "p2" as any, balance: 5000000, netWorth: 10000000 },
      { _id: "p3" as any, balance: 3000000, netWorth: 8000000 },
    ];

    const sorted = tiePlayers.sort((a, b) => b.netWorth - a.netWorth);

    // First two should have same net worth
    expect(sorted[0].netWorth).toBe(10000000);
    expect(sorted[1].netWorth).toBe(10000000);
    expect(sorted[2].netWorth).toBe(8000000);
  });
});
