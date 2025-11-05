# Quickbuck Backend API Quick Reference

## Player Operations

### Create & Manage Players
```typescript
// Create new player
await api.players.createPlayer({ userId: Id<"users"> });

// Get player
await api.players.getPlayer({ playerId: Id<"players"> });

// Get player by user ID
await api.players.getPlayerByUserId({ userId: Id<"users"> });

// Update balance
await api.players.updatePlayerBalance({ playerId, amount: 5000 }); // +$50

// Get net worth (includes stocks, crypto, companies)
await api.players.getPlayerNetWorth({ playerId });

// Get top players
await api.players.getTopPlayers({ limit: 10, sortBy: "netWorth" });
```

## Company Operations

### Create & Manage Companies
```typescript
// Create company
await api.companies.createCompany({
  ownerId: playerId,
  name: "My Company",
  ticker: "MYC", // optional, for public companies
  description: "A great company",
  logo: "https://..."
});

// Make company public (IPO) - requires $50k balance
await api.companies.makeCompanyPublic({
  companyId,
  ticker: "MYC",
  totalShares: 1000000
});
// Note: Market cap is automatically set to company balance * 5
// Share price is automatically calculated as: market cap / total shares

// Get player's companies
await api.companies.getPlayerCompanies({ playerId });

// Get all public companies
await api.companies.getAllPublicCompanies({});

// Get top companies by market cap
await api.companies.getTopCompaniesByMarketCap({ limit: 10 });
```

## Product Operations

### Create & Manage Products
```typescript
// Create product
await api.products.createProduct({
  companyId,
  name: "Widget",
  description: "A useful widget",
  price: 1999, // $19.99 in cents
  productionCost: 1000, // $10.00
  image: "https://...",
  tags: ["electronics", "gadget"],
  stock: 100, // optional, null = unlimited
  maxPerOrder: 10
});

// Update product
await api.products.updateProduct({
  productId,
  price: 2499, // Change price to $24.99
  qualityRating: 0.8
});

// Get all products
await api.products.getAllProducts({});

// Search products
await api.products.searchProducts({ query: "widget" });

// Get top products by revenue
await api.products.getTopProductsByRevenue({ limit: 10 });
```

## Stock Trading

### Buy & Sell Stocks
```typescript
// Buy stock
await api.stocks.buyStock({
  userId: playerId,
  stockId,
  shares: 100,
  accountType: "player", // or "company"
  accountId: playerId // or companyId
});

// Sell stock
await api.stocks.sellStock({
  userId: playerId,
  stockId,
  shares: 50,
  accountType: "player",
  accountId: playerId
});

// Get player's holdings
await api.stocks.getPlayerStockHoldings({ playerId });

// Get stock info
await api.stocks.getStockByTicker({ ticker: "MYC" });

// Get top holders
await api.stocks.getTopStockHolders({ companyId, limit: 10 });
```

## Cryptocurrency

### Create & Trade Crypto
```typescript
// Create cryptocurrency (costs $10,000)
await api.crypto.createCryptocurrency({
  creatorId: playerId,
  name: "My Coin",
  ticker: "MYC",
  description: "A revolutionary coin",
  image: "https://...",
  initialSupply: 1000000
});

// Buy crypto
await api.crypto.buyCryptocurrency({
  userId: playerId,
  cryptoId,
  amount: 100,
  accountType: "player",
  accountId: playerId
});

// Sell crypto
await api.crypto.sellCryptocurrency({
  userId: playerId,
  cryptoId,
  amount: 50,
  accountType: "player",
  accountId: playerId
});

// Get all cryptocurrencies
await api.crypto.getAllCryptocurrencies({});

// Get top cryptos by market cap
await api.crypto.getTopCryptosByMarketCap({ limit: 10 });
```

## Shopping Cart & Checkout

### Cart Operations
```typescript
// Add to cart
await api.cart.addToCart({
  userId: playerId,
  productId,
  quantity: 2
});

// Update quantity
await api.cart.updateCartItemQuantity({
  userId: playerId,
  productId,
  quantity: 5
});

// Remove from cart
await api.cart.removeFromCart({
  userId: playerId,
  productId
});

// Get cart
const cart = await api.cart.getPlayerCart({ userId: playerId });

// Checkout
await api.cart.checkout({
  userId: playerId,
  accountType: "player", // or "company"
  accountId: playerId // or companyId
});
```

## Loans

### Borrow & Repay
```typescript
// Create loan (max $5M, 5% daily interest)
await api.loans.createLoan({
  playerId,
  amount: 100000 // $1,000
});

// Repay loan
await api.loans.repayLoan({
  loanId,
  amount: 50000 // $500
});

// Get player's loans
await api.loans.getPlayerLoans({ playerId });

// Get active loans
await api.loans.getPlayerActiveLoans({ playerId });

// Get total debt
await api.loans.getPlayerTotalDebt({ playerId });
```

## Transactions & Transfers

### Transfer Money
```typescript
// Transfer cash between accounts
await api.transactions.transferCash({
  fromAccountId: playerId,
  fromAccountType: "player",
  toAccountId: companyId,
  toAccountType: "company",
  amount: 10000, // $100
  description: "Investment"
});

// Get transaction history
await api.transactions.getPlayerTransactionHistory({
  playerId,
  limit: 50
});

// Get company transactions
await api.transactions.getCompanyTransactionHistory({
  companyId,
  limit: 50
});
```

## Company Sales

### Buy & Sell Companies
```typescript
// List company for sale
await api.companySales.listCompanyForSale({
  companyId,
  askingPrice: 1000000 // $10,000
});

// Make offer
await api.companySales.makeCompanySaleOffer({
  companyId,
  buyerId: playerId,
  offeredPrice: 950000 // $9,500
});

// Respond to offer
await api.companySales.respondToCompanySaleOffer({
  offerId,
  response: "accept", // or "reject" or "counter"
  counterOfferPrice: 975000 // if counter
});

// Get companies for sale
await api.companySales.getAllCompaniesForSale({});

// Get pending offers (as seller)
await api.companySales.getPlayerPendingOffers({ playerId });
```

## Bot Tick System

### Execute Game Tick
```typescript
// Manually trigger tick (normally runs every 5 minutes)
await api.tick.executeTick({});

// The tick will:
// 1. Purchase products from marketplace (bot budget allocation)
// 2. Update all stock prices based on fundamentals
// 3. Update all crypto prices
// 4. Apply loan interest
// 5. Record tick history
```

## Game Configuration

### Manage Config
```typescript
// Initialize default config
await api.gameConfig.initializeGameConfig({});

// Get config value
const budget = await api.gameConfig.getConfig({ key: "botBudget" });

// Update config
await api.gameConfig.updateConfig({
  key: "botBudget",
  value: 20000000 // $200,000
});

// Get all config
await api.gameConfig.getAllConfig({});
```

## Key Constants

- All monetary values are in **cents** (100 cents = $1.00)
- Starting player balance: **$10,000** (1,000,000 cents)
- Crypto creation cost: **$10,000** (1,000,000 cents)
- Max loan amount: **$5,000,000** (500,000,000 cents)
- Loan interest rate: **5% daily**
- Min company balance for IPO: **$50,000** (5,000,000 cents)
- Bot budget per tick: **$100,000** (10,000,000 cents)
- Tick interval: **5 minutes**

## Important Notes

1. **Always use cents for amounts** - Never use floating point for money
2. **Account types** - Can be "player" or "company" for most operations
3. **Stock/Crypto holdings** - Use `userId` for the player making the trade, even if buying with company account
4. **Transaction logging** - All financial operations automatically log transactions
5. **Indexes** - All queries are optimized with proper database indexes
6. **Type safety** - Use `Id<"tableName">` types from Convex

## Example: Complete Player Flow

```typescript
// 1. Create player
const playerId = await api.players.createPlayer({ userId });

// 2. Create a company
const companyId = await api.companies.createCompany({
  ownerId: playerId,
  name: "Tech Startup"
});

// 3. Add a product
const productId = await api.products.createProduct({
  companyId,
  name: "Widget Pro",
  price: 4999, // $49.99
  productionCost: 2000,
  stock: 1000
});

// 4. Bot tick runs and buys products
await api.tick.executeTick({});

// 5. Company earns revenue, player sees company balance increase
const company = await api.companies.getCompany({ companyId });
console.log(`Company balance: $${company.balance / 100}`);

// 6. Player can now IPO if balance >= $50k
if (company.balance >= 5000000) {
  await api.companies.makeCompanyPublic({
    companyId,
    ticker: "TECH",
    totalShares: 100000
    // Market cap will be automatically set to: company.balance * 5
    // Share price will be automatically calculated: marketCap / totalShares
  });
}
```
