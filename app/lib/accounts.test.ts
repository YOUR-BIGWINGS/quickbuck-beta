import { describe, expect, it } from "vitest";

/**
 * Tests for Accounts page logic - balance calculations and company filtering
 */

describe("Account Balance Calculations", () => {
  it("should calculate total company assets correctly", () => {
    const companies = [
      { _id: "c1" as any, balance: 50000, name: "Company A" },
      { _id: "c2" as any, balance: 30000, name: "Company B" },
      { _id: "c3" as any, balance: 20000, name: "Company C" },
    ];

    const totalAssets = companies.reduce((sum, company) => sum + company.balance, 0);

    expect(totalAssets).toBe(100000);
  });

  it("should handle empty companies array", () => {
    const companies: any[] = [];
    const totalAssets = companies.reduce((sum, company) => sum + company.balance, 0);

    expect(totalAssets).toBe(0);
  });

  it("should calculate total assets with zero balances", () => {
    const companies = [
      { _id: "c1" as any, balance: 0, name: "Company A" },
      { _id: "c2" as any, balance: 0, name: "Company B" },
    ];

    const totalAssets = companies.reduce((sum, company) => sum + company.balance, 0);

    expect(totalAssets).toBe(0);
  });

  it("should filter companies by public status", () => {
    const companies = [
      { _id: "c1" as any, balance: 50000, isPublic: true, name: "Public Co" },
      { _id: "c2" as any, balance: 30000, isPublic: false, name: "Private Co" },
      { _id: "c3" as any, balance: 20000, isPublic: true, name: "Public Co 2" },
    ];

    const publicCompanies = companies.filter((c) => c.isPublic);
    const privateCompanies = companies.filter((c) => !c.isPublic);

    expect(publicCompanies.length).toBe(2);
    expect(privateCompanies.length).toBe(1);
  });

  it("should sort companies by balance descending", () => {
    const companies = [
      { _id: "c1" as any, balance: 30000, name: "Company A" },
      { _id: "c2" as any, balance: 50000, name: "Company B" },
      { _id: "c3" as any, balance: 20000, name: "Company C" },
    ];

    const sorted = [...companies].sort((a, b) => b.balance - a.balance);

    expect(sorted[0].balance).toBe(50000);
    expect(sorted[1].balance).toBe(30000);
    expect(sorted[2].balance).toBe(20000);
  });

  it("should sort companies by name alphabetically", () => {
    const companies = [
      { _id: "c1" as any, balance: 30000, name: "Charlie Corp" },
      { _id: "c2" as any, balance: 50000, name: "Alpha Inc" },
      { _id: "c3" as any, balance: 20000, name: "Bravo LLC" },
    ];

    const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));

    expect(sorted[0].name).toBe("Alpha Inc");
    expect(sorted[1].name).toBe("Bravo LLC");
    expect(sorted[2].name).toBe("Charlie Corp");
  });

  it("should calculate net worth including company balances", () => {
    const personalBalance = 1000000;
    const companies = [
      { _id: "c1" as any, balance: 50000 },
      { _id: "c2" as any, balance: 30000 },
    ];
    const totalCompanyAssets = companies.reduce((sum, c) => sum + c.balance, 0);

    const netWorth = personalBalance + totalCompanyAssets;

    expect(netWorth).toBe(1080000);
  });

  it("should handle negative company balances", () => {
    const companies = [
      { _id: "c1" as any, balance: 50000 },
      { _id: "c2" as any, balance: -10000 },
      { _id: "c3" as any, balance: 30000 },
    ];

    const totalAssets = companies.reduce((sum, company) => sum + company.balance, 0);

    expect(totalAssets).toBe(70000);
  });

  it("should filter companies by search query", () => {
    const companies = [
      { _id: "c1" as any, name: "TechCorp", ticker: "TECH" },
      { _id: "c2" as any, name: "Finance Inc", ticker: "FIN" },
      { _id: "c3" as any, name: "Tech Ventures", ticker: "TVNT" },
    ];

    const searchQuery = "tech";
    const filtered = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ticker?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].name).toBe("TechCorp");
    expect(filtered[1].name).toBe("Tech Ventures");
  });

  it("should display correct market cap for public companies", () => {
    const companies = [
      { _id: "c1" as any, isPublic: true, marketCap: 5000000, balance: 100000 },
      { _id: "c2" as any, isPublic: false, marketCap: null, balance: 200000 },
    ];

    const publicCompany = companies.find((c) => c.isPublic);

    expect(publicCompany?.marketCap).toBe(5000000);
    expect(publicCompany?.balance).toBe(100000);
  });

  it("should calculate total value including market cap for public companies", () => {
    const companies = [
      { _id: "c1" as any, isPublic: true, marketCap: 5000000, balance: 100000 },
      { _id: "c2" as any, isPublic: false, marketCap: null, balance: 200000 },
    ];

    const totalValue = companies.reduce((sum, c) => {
      let value = c.balance;
      if (c.isPublic && c.marketCap) {
        value += c.marketCap;
      }
      return sum + value;
    }, 0);

    expect(totalValue).toBe(5300000); // 100000 + 5000000 + 200000
  });
});

describe("Company Filtering", () => {
  const mockCompanies = [
    {
      _id: "c1" as any,
      name: "TechCorp",
      ticker: "TECH",
      balance: 500000,
      isPublic: true,
      marketCap: 5000000,
    },
    {
      _id: "c2" as any,
      name: "Finance Inc",
      ticker: "FIN",
      balance: 300000,
      isPublic: true,
      marketCap: 3000000,
    },
    {
      _id: "c3" as any,
      name: "Startup Co",
      ticker: null,
      balance: 50000,
      isPublic: false,
      marketCap: null,
    },
  ];

  it("should filter public companies only", () => {
    const publicCompanies = mockCompanies.filter((c) => c.isPublic);
    expect(publicCompanies.length).toBe(2);
  });

  it("should filter companies with balance above threshold", () => {
    const threshold = 100000;
    const filtered = mockCompanies.filter((c) => c.balance > threshold);
    expect(filtered.length).toBe(2);
  });

  it("should find company by ticker", () => {
    const ticker = "TECH";
    const company = mockCompanies.find((c) => c.ticker === ticker);
    expect(company?.name).toBe("TechCorp");
  });

  it("should handle case-insensitive ticker search", () => {
    const ticker = "tech".toLowerCase();
    const company = mockCompanies.find((c) => c.ticker?.toLowerCase() === ticker);
    expect(company?.name).toBe("TechCorp");
  });
});

describe("Balance Display Formatting", () => {
  it("should format large balances correctly", () => {
    const balance = 1234567890;
    const formatted = `$${(balance / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    expect(formatted).toBe("$12,345,678.90");
  });

  it("should format zero balance correctly", () => {
    const balance = 0;
    const formatted = `$${(balance / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    expect(formatted).toBe("$0.00");
  });

  it("should format negative balance correctly", () => {
    const balance = -50000;
    const formatted = `$${(balance / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    expect(formatted).toBe("$-500.00");
  });
});
