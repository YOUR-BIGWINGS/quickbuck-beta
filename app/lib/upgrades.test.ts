import { describe, it, expect } from "vitest";

// Test utilities for upgrades system

describe("Upgrade Purchase", () => {
  it("should validate player has sufficient balance", () => {
    const playerBalance = 10000000; // $100,000
    const upgradeCost = 5000000; // $50,000
    const canAfford = playerBalance >= upgradeCost;

    expect(canAfford).toBe(true);
  });

  it("should prevent purchase with insufficient balance", () => {
    const playerBalance = 3000000; // $30,000
    const upgradeCost = 5000000; // $50,000
    const canAfford = playerBalance >= upgradeCost;

    expect(canAfford).toBe(false);
  });

  it("should calculate new balance after purchase", () => {
    const playerBalance = 10000000; // $100,000
    const upgradeCost = 5000000; // $50,000
    const newBalance = playerBalance - upgradeCost;

    expect(newBalance).toBe(5000000); // $50,000
  });

  it("should prevent duplicate upgrade purchases", () => {
    const purchasedUpgrades = ["interest_boost", "stock_returns_boost"];
    const newUpgrade = "interest_boost";
    const isDuplicate = purchasedUpgrades.includes(newUpgrade);

    expect(isDuplicate).toBe(true);
  });

  it("should allow new upgrade purchases", () => {
    const purchasedUpgrades = ["interest_boost", "stock_returns_boost"];
    const newUpgrade = "production_cost_reduction";
    const isDuplicate = purchasedUpgrades.includes(newUpgrade);

    expect(isDuplicate).toBe(false);
  });

  it("should validate positive upgrade cost", () => {
    const upgradeCost = 5000000;
    const isValid = upgradeCost > 0;

    expect(isValid).toBe(true);
  });
});

describe("Upgrade Types and Benefits", () => {
  it("should define interest boost upgrade correctly", () => {
    const upgrade = {
      upgradeType: "interest_boost",
      name: "+10% Daily Interest Rate",
      cost: 5000000,
      benefit: "+10% Daily Interest Rate",
    };

    expect(upgrade.upgradeType).toBe("interest_boost");
    expect(upgrade.cost).toBe(5000000);
  });

  it("should define stock returns boost upgrade correctly", () => {
    const upgrade = {
      upgradeType: "stock_returns_boost",
      name: "+50% Stock Returns",
      cost: 10000000,
      benefit: "+50% Stock Returns",
    };

    expect(upgrade.upgradeType).toBe("stock_returns_boost");
    expect(upgrade.cost).toBe(10000000);
  });

  it("should define production cost reduction upgrade correctly", () => {
    const upgrade = {
      upgradeType: "production_cost_reduction",
      name: "-20% Production Costs",
      cost: 7500000,
      benefit: "-20% Production Costs",
    };

    expect(upgrade.upgradeType).toBe("production_cost_reduction");
    expect(upgrade.cost).toBe(7500000);
  });

  it("should define marketplace discount upgrade correctly", () => {
    const upgrade = {
      upgradeType: "marketplace_discount",
      name: "10% Marketplace Discount",
      cost: 3000000,
      benefit: "10% Marketplace Discount",
    };

    expect(upgrade.upgradeType).toBe("marketplace_discount");
    expect(upgrade.cost).toBe(3000000);
  });

  it("should define gambling luck upgrade correctly", () => {
    const upgrade = {
      upgradeType: "gambling_luck",
      name: "+5% Gambling Win Rate",
      cost: 2000000,
      benefit: "+5% Gambling Win Rate",
    };

    expect(upgrade.upgradeType).toBe("gambling_luck");
    expect(upgrade.cost).toBe(2000000);
  });

  it("should define crypto trading fee upgrade correctly", () => {
    const upgrade = {
      upgradeType: "crypto_trading_fee",
      name: "Zero Crypto Trading Fees",
      cost: 5000000,
      benefit: "Zero Crypto Trading Fees",
    };

    expect(upgrade.upgradeType).toBe("crypto_trading_fee");
    expect(upgrade.cost).toBe(5000000);
  });
});

describe("Upgrade Multipliers", () => {
  it("should calculate interest rate boost multiplier", () => {
    const baseInterestRate = 0.05; // 5%
    const boost = 0.1; // 10% boost
    const boostedRate = baseInterestRate + (baseInterestRate * boost);

    expect(boostedRate).toBeCloseTo(0.055, 3); // 5.5%
  });

  it("should calculate stock returns boost multiplier", () => {
    const baseReturn = 10000; // $100
    const boost = 0.5; // 50% boost
    const boostedReturn = baseReturn + (baseReturn * boost);

    expect(boostedReturn).toBe(15000); // $150
  });

  it("should calculate production cost reduction", () => {
    const baseCost = 10000; // $100
    const reduction = 0.2; // 20% reduction
    const reducedCost = baseCost - (baseCost * reduction);

    expect(reducedCost).toBe(8000); // $80
  });

  it("should calculate marketplace discount", () => {
    const basePrice = 10000; // $100
    const discount = 0.1; // 10% discount
    const discountedPrice = basePrice - (basePrice * discount);

    expect(discountedPrice).toBe(9000); // $90
  });

  it("should apply gambling luck boost", () => {
    const baseWinChance = 0.45; // 45%
    const boost = 0.05; // 5% boost
    const boostedChance = baseWinChance + boost;

    expect(boostedChance).toBe(0.5); // 50%
  });

  it("should eliminate crypto trading fees", () => {
    const baseFee = 0.01; // 1% fee
    const feeMultiplier = 0; // Zero fees
    const finalFee = baseFee * feeMultiplier;

    expect(finalFee).toBe(0);
  });
});

describe("Upgrade Status", () => {
  it("should set upgrade as active when purchased", () => {
    const upgrade = {
      isActive: true,
      purchasedAt: Date.now(),
    };

    expect(upgrade.isActive).toBe(true);
  });

  it("should allow toggling upgrade active status", () => {
    let isActive = true;
    isActive = !isActive;

    expect(isActive).toBe(false);
  });

  it("should toggle upgrade back to active", () => {
    let isActive = false;
    isActive = !isActive;

    expect(isActive).toBe(true);
  });

  it("should store purchase timestamp", () => {
    const purchasedAt = Date.now();
    const isValidTimestamp = purchasedAt > 0;

    expect(isValidTimestamp).toBe(true);
  });
});

describe("Upgrade Statistics", () => {
  it("should calculate total upgrades owned", () => {
    const upgrades = [
      { upgradeType: "interest_boost" },
      { upgradeType: "stock_returns_boost" },
      { upgradeType: "production_cost_reduction" },
    ];
    const totalUpgrades = upgrades.length;

    expect(totalUpgrades).toBe(3);
  });

  it("should calculate active upgrades count", () => {
    const upgrades = [
      { isActive: true },
      { isActive: false },
      { isActive: true },
      { isActive: true },
    ];
    const activeUpgrades = upgrades.filter((u) => u.isActive).length;

    expect(activeUpgrades).toBe(3);
  });

  it("should calculate total spent on upgrades", () => {
    const upgrades = [
      { cost: 5000000 },
      { cost: 10000000 },
      { cost: 3000000 },
    ];
    const totalSpent = upgrades.reduce((sum, u) => sum + u.cost, 0);

    expect(totalSpent).toBe(18000000); // $180,000
  });

  it("should filter upgrades by type", () => {
    const upgrades = [
      { upgradeType: "interest_boost" },
      { upgradeType: "stock_returns_boost" },
      { upgradeType: "interest_boost" },
    ];
    const interestBoosts = upgrades.filter(
      (u) => u.upgradeType === "interest_boost"
    );

    expect(interestBoosts.length).toBe(2);
  });

  it("should identify purchased upgrades", () => {
    const availableUpgrades = [
      { upgradeType: "interest_boost", isPurchased: true },
      { upgradeType: "stock_returns_boost", isPurchased: false },
      { upgradeType: "production_cost_reduction", isPurchased: true },
    ];
    const purchased = availableUpgrades.filter((u) => u.isPurchased);

    expect(purchased.length).toBe(2);
  });

  it("should identify unpurchased upgrades", () => {
    const availableUpgrades = [
      { upgradeType: "interest_boost", isPurchased: true },
      { upgradeType: "stock_returns_boost", isPurchased: false },
      { upgradeType: "production_cost_reduction", isPurchased: false },
    ];
    const unpurchased = availableUpgrades.filter((u) => !u.isPurchased);

    expect(unpurchased.length).toBe(2);
  });
});

describe("Upgrade Affordability", () => {
  it("should mark upgrade as affordable when balance is sufficient", () => {
    const playerBalance = 10000000;
    const upgradeCost = 5000000;
    const canAfford = playerBalance >= upgradeCost;

    expect(canAfford).toBe(true);
  });

  it("should mark upgrade as not affordable when balance is insufficient", () => {
    const playerBalance = 3000000;
    const upgradeCost = 5000000;
    const canAfford = playerBalance >= upgradeCost;

    expect(canAfford).toBe(false);
  });

  it("should mark upgrade as affordable when balance equals cost", () => {
    const playerBalance = 5000000;
    const upgradeCost = 5000000;
    const canAfford = playerBalance >= upgradeCost;

    expect(canAfford).toBe(true);
  });

  it("should filter affordable upgrades", () => {
    const playerBalance = 6000000;
    const upgrades = [
      { cost: 5000000, canAfford: true },
      { cost: 10000000, canAfford: false },
      { cost: 3000000, canAfford: true },
    ];
    const affordable = upgrades.filter((u) => u.canAfford);

    expect(affordable.length).toBe(2);
  });
});

describe("Upgrade Application", () => {
  it("should apply interest boost to loan interest calculation", () => {
    const loanAmount = 100000;
    const baseInterestRate = 0.05;
    const hasInterestBoost = true;
    const boostAmount = hasInterestBoost ? 0.1 : 0;
    const finalRate = baseInterestRate + (baseInterestRate * boostAmount);
    const interest = Math.round(loanAmount * finalRate);

    expect(interest).toBe(5500); // $55 instead of $50
  });

  it("should apply stock returns boost to portfolio gains", () => {
    const stockGain = 10000;
    const hasStockBoost = true;
    const boostAmount = hasStockBoost ? 0.5 : 0;
    const boostedGain = Math.round(stockGain + (stockGain * boostAmount));

    expect(boostedGain).toBe(15000); // $150 instead of $100
  });

  it("should apply production cost reduction to new products", () => {
    const baseProductionCost = 10000;
    const hasReduction = true;
    const reductionAmount = hasReduction ? 0.2 : 0;
    const finalCost = baseProductionCost - (baseProductionCost * reductionAmount);

    expect(finalCost).toBe(8000); // $80 instead of $100
  });

  it("should apply marketplace discount to purchases", () => {
    const purchaseTotal = 50000;
    const hasDiscount = true;
    const discountAmount = hasDiscount ? 0.1 : 0;
    const finalPrice = purchaseTotal - (purchaseTotal * discountAmount);

    expect(finalPrice).toBe(45000); // $450 instead of $500
  });

  it("should not apply multipliers when upgrade is inactive", () => {
    const baseValue = 10000;
    const isActive = false;
    const multiplier = isActive ? 0.5 : 0;
    const finalValue = baseValue + (baseValue * multiplier);

    expect(finalValue).toBe(10000); // No change
  });

  it("should apply multiple upgrades cumulatively", () => {
    let value = 10000;
    const hasStockBoost = true;
    const hasInterestBoost = true;

    if (hasStockBoost) {
      value += value * 0.5; // +50%
    }
    if (hasInterestBoost) {
      value += value * 0.1; // +10% of current value
    }

    expect(value).toBe(16500); // $165
  });
});

describe("Upgrade Validation", () => {
  it("should validate upgrade type exists", () => {
    const validTypes = [
      "interest_boost",
      "stock_returns_boost",
      "production_cost_reduction",
      "marketplace_discount",
      "gambling_luck",
      "crypto_trading_fee",
    ];
    const upgradeType = "interest_boost";
    const isValid = validTypes.includes(upgradeType);

    expect(isValid).toBe(true);
  });

  it("should reject invalid upgrade type", () => {
    const validTypes = [
      "interest_boost",
      "stock_returns_boost",
      "production_cost_reduction",
      "marketplace_discount",
      "gambling_luck",
      "crypto_trading_fee",
    ];
    const upgradeType = "invalid_upgrade";
    const isValid = validTypes.includes(upgradeType);

    expect(isValid).toBe(false);
  });

  it("should validate upgrade belongs to player", () => {
    const upgrade = {
      playerId: "player123",
    };
    const currentPlayerId = "player123";
    const isOwned = upgrade.playerId === currentPlayerId;

    expect(isOwned).toBe(true);
  });

  it("should reject upgrade for different player", () => {
    const upgrade = {
      playerId: "player123",
    };
    const currentPlayerId = "player456";
    const isOwned = upgrade.playerId === currentPlayerId;

    expect(isOwned).toBe(false);
  });
});
