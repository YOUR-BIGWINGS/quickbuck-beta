#!/bin/bash

# Investigation script for player finances using Convex API
# This uses curl to query the Convex backend directly

CONVEX_URL="https://exuberant-donkey-345.convex.cloud"
PLAYER_ID="nh7bpj2xf1b9qw7x3gx803gr7h7tfqk7"

echo "=================================="
echo "PLAYER INVESTIGATION REPORT"
echo "=================================="
echo "Player ID: $PLAYER_ID"
echo ""

# Function to query Convex API
query_convex() {
  local function_name=$1
  local args_json=$2
  
  curl -s -X POST "$CONVEX_URL/api/query/$function_name" \
    -H "Content-Type: application/json" \
    -d "$args_json"
}

# 1. Get player info
echo "1. FETCHING PLAYER INFO..."
echo "---"
PLAYER_RESPONSE=$(query_convex "players:getPlayer" "{\"playerId\": \"$PLAYER_ID\"}")
echo "Raw response: $PLAYER_RESPONSE" | head -1

BALANCE=$(echo "$PLAYER_RESPONSE" | jq -r '.balance' 2>/dev/null || echo "ERROR")
NET_WORTH=$(echo "$PLAYER_RESPONSE" | jq -r '.netWorth' 2>/dev/null || echo "ERROR")
ROLE=$(echo "$PLAYER_RESPONSE" | jq -r '.role' 2>/dev/null || echo "ERROR")

echo "Balance: $BALANCE cents"
echo "Net Worth: $NET_WORTH cents"
echo "Role: $ROLE"
echo ""

# 2. Get transactions
echo "2. FETCHING TRANSACTIONS..."
echo "---"
TXNS_RESPONSE=$(query_convex "transactions:getPlayerTransactionHistory" "{\"playerId\": \"$PLAYER_ID\", \"limit\": 50}")
TXNS_COUNT=$(echo "$TXNS_RESPONSE" | jq 'length' 2>/dev/null || echo "ERROR")
echo "Total transactions: $TXNS_COUNT"
echo ""

# 3. Get loans
echo "3. FETCHING LOANS..."
echo "---"
LOANS_RESPONSE=$(query_convex "loans:getPlayerLoans" "{\"playerId\": \"$PLAYER_ID\"}")
LOANS_COUNT=$(echo "$LOANS_RESPONSE" | jq 'length' 2>/dev/null || echo "ERROR")
echo "Total loans: $LOANS_COUNT"
echo ""

# 4. Pretty print raw data
echo "=================================="
echo "RAW DATA"
echo "=================================="
echo ""
echo "PLAYER DATA:"
echo "$PLAYER_RESPONSE" | jq '.' 2>/dev/null || echo "$PLAYER_RESPONSE"
echo ""
echo "TRANSACTIONS (first 5):"
echo "$TXNS_RESPONSE" | jq '.[0:5]' 2>/dev/null || echo "$TXNS_RESPONSE"
echo ""
echo "LOANS:"
echo "$LOANS_RESPONSE" | jq '.' 2>/dev/null || echo "$LOANS_RESPONSE"

