# Company Selling & Marketplace Implementation

## Overview
Implemented a comprehensive company selling system where players can list their companies for sale, make offers, counter-offers, and receive persistent notifications until they respond.

## Features Implemented

### 1. Company Marketplace
- **New Route**: `/dashboard/company-marketplace`
- Browse all companies listed for sale
- View company details including balance, market cap, and asking price
- Make offers on companies
- Cannot purchase your own companies

### 2. List Companies for Sale
- Added "List for Sale" button on the companies management page
- Set an asking price for your company
- Company appears on the marketplace once listed
- Can cancel listing if no active offers exist

### 3. Offer System
- **Make Offers**: Players can make offers on listed companies
- **Accept/Reject**: Sellers can accept or reject offers
- **Counter Offers**: Both parties can make counter-offers
- **Validation**: System checks buyer has sufficient balance before completing sale

### 4. Persistent Notifications
- **New Component**: `CompanyOfferNotifications`
- Displays at the top-right of the screen (fixed position)
- Shows notifications for:
  - New offers (for sellers)
  - Counter-offers (for buyers)
  - Waiting status when counter-offer is pending
- **Will not disappear** until user takes action:
  - Accept the offer/counter-offer
  - Reject the offer/counter-offer
  - Make a new counter-offer
- Multiple notifications stack vertically
- Responsive design for mobile devices

## Files Modified

### Backend (Convex)
1. **`convex/companySales.ts`** (Updated)
   - Enhanced queries to include company and player data
   - `getPlayerPendingOffers` - Returns offers with company/buyer info
   - `getPlayerOffersAsBuyer` - Returns offers with company/seller info
   - `getAllCompaniesForSale` - Returns listings with company/seller info

### Frontend (React)
1. **`app/components/company-offer-notifications.tsx`** (New)
   - Persistent notification component
   - Handles accept/reject/counter-offer actions
   - Styled with inline CSS for consistent appearance
   - Uses useAuth to get current player
   - Shows different UIs for seller vs buyer notifications

2. **`app/routes/dashboard/company-marketplace.tsx`** (New)
   - Full marketplace page
   - Grid display of companies for sale
   - Company details cards with logos
   - Make offer modal with validation
   - Balance checking

3. **`app/routes/dashboard/companies.tsx`** (Updated)
   - Added "List for Sale" button to each company card
   - New list-for-sale modal with asking price input
   - Handler functions for listing companies
   - Import for Store icon

4. **`app/root.tsx`** (Updated)
   - Added `CompanyOfferNotifications` component to global layout
   - Renders on every page alongside `GlobalAlertBanner`

5. **`app/components/dashboard/app-sidebar.tsx`** (Updated)
   - Updated "Company Sales" to "Company Marketplace"
   - Changed URL from `/company-sales` to `/company-marketplace`

## Database Schema
The `companySales` table already exists in the schema with the following structure:
```typescript
companySales: {
  companyId: Id<"companies">
  sellerId: Id<"players">
  buyerId?: Id<"players">
  askingPrice: number // in cents
  offeredPrice?: number // in cents
  counterOfferPrice?: number // in cents
  status: "listed" | "offer_pending" | "counter_offer" | "accepted" | "rejected" | "cancelled"
  createdAt: number
  updatedAt: number
}
```

## User Flow

### Selling a Company
1. Navigate to "Companies" page
2. Click "List for Sale" on any owned company
3. Enter asking price
4. Click "List for Sale"
5. Company appears on marketplace

### Buying a Company
1. Navigate to "Company Marketplace"
2. Browse available companies
3. Click "Make Offer" on desired company
4. Enter offer amount (can be different from asking price)
5. Submit offer
6. Wait for seller response

### Negotiation Flow
1. **Seller receives offer**: 
   - Notification appears at top-right
   - Can Accept, Reject, or Counter
   
2. **Seller makes counter-offer**:
   - Enter new price
   - Notification sent to buyer
   
3. **Buyer receives counter-offer**:
   - Notification appears at top-right
   - Can Accept Counter, Reject, or Counter Again
   
4. **Cycle continues** until:
   - Offer is accepted (sale completes)
   - Offer is rejected (returns to listed state)

### Sale Completion
- Ownership transfers to buyer
- Money transfers from buyer to seller
- Transaction recorded in database
- Sale status updated to "accepted"

## Key Features

### Persistent Notifications
- **Always visible** until action is taken
- Fixed position at top-right
- Slides in with animation
- Shows company name and offer details
- Different styling for seller vs buyer
- Counter-offer input inline
- Error handling for failed actions

### Validation & Security
- ✅ Can't buy your own company
- ✅ Balance validation before offer
- ✅ Safe integer checks on all amounts
- ✅ Ownership verification
- ✅ Status checks (can't accept completed offers)
- ✅ Can't cancel listing with pending offers

### User Experience
- Company logos displayed
- Currency formatting throughout
- Balance display on marketplace
- Company details visible
- Clear action buttons
- Responsive design
- Error messages for failed actions
- Loading states during submissions

## Testing Recommendations

1. **List a Company**
   - Go to Companies page
   - Click "List for Sale"
   - Enter price and submit

2. **Browse Marketplace**
   - Navigate to Company Marketplace
   - View listed companies

3. **Make an Offer**
   - Click "Make Offer" on a company
   - Enter amount and submit

4. **Test Notifications**
   - Check that notification appears for seller
   - Try accepting, rejecting, and counter-offering
   - Verify notification persists until action taken

5. **Test Counter-Offers**
   - Seller makes counter-offer
   - Verify buyer receives notification
   - Buyer accepts or makes another counter-offer

6. **Complete a Sale**
   - Accept an offer or counter-offer
   - Verify ownership transfer
   - Check transaction record
   - Confirm money transfer

## Future Enhancements (Optional)

- Company listing expiration dates
- History of past offers
- Company valuation calculator/suggestions
- Search and filter on marketplace
- Sorting by price, balance, market cap
- Company categories/tags for filtering
- Notifications count badge in sidebar
- Email notifications for offers
- Company sale analytics
- Bulk listing capabilities
