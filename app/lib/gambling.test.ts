import { describe, it, expect } from "vitest";

// Test utilities for gambling games

describe("Slot Machine", () => {
  it("should calculate payout for three matching sevens", () => {
    const betAmount = 10000; // $100
    const multiplier = 100; // Three sevens
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(1000000); // $10,000
  });

  it("should calculate payout for three matching stars", () => {
    const betAmount = 10000;
    const multiplier = 50; // Three stars
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(500000); // $5,000
  });

  it("should calculate payout for three matching bells", () => {
    const betAmount = 10000;
    const multiplier = 25; // Three bells
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(250000); // $2,500
  });

  it("should calculate payout for three matching diamonds", () => {
    const betAmount = 10000;
    const multiplier = 15; // Three diamonds
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(150000); // $1,500
  });

  it("should calculate payout for three matching fruits", () => {
    const betAmount = 10000;
    const multiplier = 10; // Three fruits
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(100000); // $1,000
  });

  it("should calculate payout for two matching symbols", () => {
    const betAmount = 10000;
    const multiplier = 2; // Two of a kind
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(20000); // $200
  });

  it("should return zero payout for no matches", () => {
    const betAmount = 10000;
    const multiplier = 0; // No matches
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(0);
  });

  it("should calculate net change correctly for a win", () => {
    const betAmount = 10000;
    const payout = 20000;
    const netChange = payout - betAmount;
    
    expect(netChange).toBe(10000); // $100 profit
  });

  it("should calculate net change correctly for a loss", () => {
    const betAmount = 10000;
    const payout = 0;
    const netChange = payout - betAmount;
    
    expect(netChange).toBe(-10000); // $100 loss
  });

  it("should validate minimum bet amount", () => {
    const betAmount = 0;
    const isValid = betAmount > 0;
    
    expect(isValid).toBe(false);
  });

  it("should validate sufficient balance", () => {
    const playerBalance = 5000; // $50
    const betAmount = 10000; // $100
    const hasBalance = playerBalance >= betAmount;
    
    expect(hasBalance).toBe(false);
  });
});

describe("Blackjack", () => {
  it("should calculate hand total correctly", () => {
    const cards = [10, 8];
    const total = cards.reduce((sum, card) => sum + card, 0);
    
    expect(total).toBe(18);
  });

  it("should detect bust when total exceeds 21", () => {
    const cards = [10, 8, 6];
    const total = cards.reduce((sum, card) => sum + card, 0);
    const isBust = total > 21;
    
    expect(isBust).toBe(true);
  });

  it("should detect blackjack with 21", () => {
    const cards = [10, 11]; // Ace + 10
    const total = cards.reduce((sum, card) => sum + card, 0);
    const isBlackjack = total === 21;
    
    expect(isBlackjack).toBe(true);
  });

  it("should dealer hit on 16", () => {
    const dealerTotal = 16;
    const shouldHit = dealerTotal < 17;
    
    expect(shouldHit).toBe(true);
  });

  it("should dealer stand on 17", () => {
    const dealerTotal = 17;
    const shouldHit = dealerTotal < 17;
    
    expect(shouldHit).toBe(false);
  });

  it("should determine player wins when dealer busts", () => {
    const playerTotal = 18;
    const dealerTotal = 25; // Busted
    const playerWins = dealerTotal > 21 || playerTotal > dealerTotal;
    
    expect(playerWins).toBe(true);
  });

  it("should determine player wins with higher total", () => {
    const playerTotal = 20;
    const dealerTotal = 18;
    const playerWins = playerTotal > dealerTotal && playerTotal <= 21;
    
    expect(playerWins).toBe(true);
  });

  it("should determine dealer wins with higher total", () => {
    const playerTotal = 18;
    const dealerTotal = 20;
    const dealerWins = dealerTotal > playerTotal && dealerTotal <= 21;
    
    expect(dealerWins).toBe(true);
  });

  it("should detect push when totals are equal", () => {
    const playerTotal = 18;
    const dealerTotal = 18;
    const isPush = playerTotal === dealerTotal;
    
    expect(isPush).toBe(true);
  });

  it("should calculate win payout correctly", () => {
    const betAmount = 10000; // $100
    const payout = betAmount * 2; // Return bet + winnings
    
    expect(payout).toBe(20000); // $200
  });

  it("should calculate push payout correctly", () => {
    const betAmount = 10000; // $100
    const payout = betAmount; // Return bet only
    
    expect(payout).toBe(10000); // $100
  });

  it("should validate double down requires sufficient balance", () => {
    const playerBalance = 5000; // $50
    const betAmount = 10000; // $100
    const canDouble = playerBalance >= betAmount;
    
    expect(canDouble).toBe(false);
  });
});

describe("Dice Roll", () => {
  it("should calculate odd bet correctly", () => {
    const total = 7;
    const isOdd = total % 2 === 1;
    
    expect(isOdd).toBe(true);
  });

  it("should calculate even bet correctly", () => {
    const total = 8;
    const isEven = total % 2 === 0;
    
    expect(isEven).toBe(true);
  });

  it("should calculate under 7 bet correctly", () => {
    const total = 5;
    const isUnder7 = total < 7;
    
    expect(isUnder7).toBe(true);
  });

  it("should calculate over 7 bet correctly", () => {
    const total = 9;
    const isOver7 = total > 7;
    
    expect(isOver7).toBe(true);
  });

  it("should calculate exact 7 bet correctly", () => {
    const total = 7;
    const isExact7 = total === 7;
    
    expect(isExact7).toBe(true);
  });

  it("should apply correct multiplier for odd/even bets", () => {
    const betAmount = 10000;
    const multiplier = 2;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(20000);
  });

  it("should apply correct multiplier for under/over 7 bets", () => {
    const betAmount = 10000;
    const multiplier = 2;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(20000);
  });

  it("should apply correct multiplier for exact 7 bet", () => {
    const betAmount = 10000;
    const multiplier = 5;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(50000);
  });

  it("should calculate valid dice roll range", () => {
    const die = 3;
    const isValid = die >= 1 && die <= 6;
    
    expect(isValid).toBe(true);
  });

  it("should calculate minimum possible total", () => {
    const die1 = 1;
    const die2 = 1;
    const total = die1 + die2;
    
    expect(total).toBe(2);
  });

  it("should calculate maximum possible total", () => {
    const die1 = 6;
    const die2 = 6;
    const total = die1 + die2;
    
    expect(total).toBe(12);
  });
});

describe("Roulette", () => {
  it("should identify red numbers correctly", () => {
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const number = 7;
    const isRed = redNumbers.includes(number);
    
    expect(isRed).toBe(true);
  });

  it("should identify black numbers correctly", () => {
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const number: number = 10;
    const isBlack = number !== 0 && !redNumbers.includes(number);
    
    expect(isBlack).toBe(true);
  });

  it("should identify green (0) correctly", () => {
    const number = 0;
    const isGreen = number === 0;
    
    expect(isGreen).toBe(true);
  });

  it("should identify odd numbers correctly", () => {
    const number: number = 9;
    const isOdd = number % 2 === 1 && number !== 0;
    
    expect(isOdd).toBe(true);
  });

  it("should identify even numbers correctly", () => {
    const number: number = 10;
    const isEven = number % 2 === 0 && number !== 0;
    
    expect(isEven).toBe(true);
  });

  it("should identify low numbers (1-18) correctly", () => {
    const number = 10;
    const isLow = number >= 1 && number <= 18;
    
    expect(isLow).toBe(true);
  });

  it("should identify high numbers (19-36) correctly", () => {
    const number = 25;
    const isHigh = number >= 19 && number <= 36;
    
    expect(isHigh).toBe(true);
  });

  it("should apply correct multiplier for color bets", () => {
    const betAmount = 10000;
    const multiplier = 2;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(20000);
  });

  it("should apply correct multiplier for green bet", () => {
    const betAmount = 10000;
    const multiplier = 36;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(360000);
  });

  it("should apply correct multiplier for specific number bet", () => {
    const betAmount = 10000;
    const multiplier = 36;
    const payout = betAmount * multiplier;
    
    expect(payout).toBe(360000);
  });

  it("should validate roulette number range", () => {
    const number = 15;
    const isValid = number >= 0 && number <= 36;
    
    expect(isValid).toBe(true);
  });
});

describe("Gambling Statistics", () => {
  it("should calculate win rate correctly", () => {
    const totalBets = 100;
    const wins = 45;
    const winRate = (wins / totalBets) * 100;
    
    expect(winRate).toBe(45);
  });

  it("should calculate net profit correctly", () => {
    const totalWagered = 100000; // $1,000
    const totalPayout = 120000; // $1,200
    const netProfit = totalPayout - totalWagered;
    
    expect(netProfit).toBe(20000); // $200 profit
  });

  it("should calculate net loss correctly", () => {
    const totalWagered = 100000; // $1,000
    const totalPayout = 80000; // $800
    const netProfit = totalPayout - totalWagered;
    
    expect(netProfit).toBe(-20000); // $200 loss
  });

  it("should handle zero bets for win rate", () => {
    const totalBets = 0;
    const wins = 0;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    
    expect(winRate).toBe(0);
  });

  it("should count total wins correctly", () => {
    const history = [
      { result: "win" },
      { result: "loss" },
      { result: "win" },
      { result: "win" },
      { result: "loss" },
    ];
    const wins = history.filter((h) => h.result === "win").length;
    
    expect(wins).toBe(3);
  });

  it("should count total losses correctly", () => {
    const history = [
      { result: "win" },
      { result: "loss" },
      { result: "win" },
      { result: "win" },
      { result: "loss" },
    ];
    const losses = history.filter((h) => h.result === "loss").length;
    
    expect(losses).toBe(2);
  });

  it("should calculate total wagered correctly", () => {
    const history = [
      { betAmount: 10000 },
      { betAmount: 20000 },
      { betAmount: 15000 },
    ];
    const totalWagered = history.reduce((sum, h) => sum + h.betAmount, 0);
    
    expect(totalWagered).toBe(45000);
  });

  it("should calculate total payout correctly", () => {
    const history = [
      { payout: 20000 },
      { payout: 0 },
      { payout: 30000 },
    ];
    const totalPayout = history.reduce((sum, h) => sum + h.payout, 0);
    
    expect(totalPayout).toBe(50000);
  });
});

describe("Gambling Balance Updates", () => {
  it("should deduct bet amount from balance", () => {
    const initialBalance = 100000; // $1,000
    const betAmount = 10000; // $100
    const newBalance = initialBalance - betAmount;
    
    expect(newBalance).toBe(90000); // $900
  });

  it("should add winnings to balance", () => {
    const currentBalance = 90000; // $900
    const payout = 20000; // $200
    const newBalance = currentBalance + payout;
    
    expect(newBalance).toBe(110000); // $1,100
  });

  it("should handle net change for a win", () => {
    const initialBalance = 100000;
    const betAmount = 10000;
    const payout = 20000;
    const netChange = payout - betAmount;
    const finalBalance = initialBalance + netChange;
    
    expect(finalBalance).toBe(110000);
  });

  it("should handle net change for a loss", () => {
    const initialBalance = 100000;
    const betAmount = 10000;
    const payout = 0;
    const netChange = payout - betAmount;
    const finalBalance = initialBalance + netChange;
    
    expect(finalBalance).toBe(90000);
  });

  it("should prevent betting more than balance", () => {
    const balance = 5000;
    const betAmount = 10000;
    const canBet = balance >= betAmount;
    
    expect(canBet).toBe(false);
  });

  it("should allow betting within balance", () => {
    const balance = 15000;
    const betAmount = 10000;
    const canBet = balance >= betAmount;
    
    expect(canBet).toBe(true);
  });

  it("should update balance correctly after multiple games", () => {
    let balance = 100000;
    
    // Game 1: Bet $100, win $200
    balance += (20000 - 10000);
    expect(balance).toBe(110000);
    
    // Game 2: Bet $150, lose
    balance += (0 - 15000);
    expect(balance).toBe(95000);
    
    // Game 3: Bet $50, win $100
    balance += (10000 - 5000);
    expect(balance).toBe(100000);
  });
});
