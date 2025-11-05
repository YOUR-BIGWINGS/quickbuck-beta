#!/usr/bin/env node

/**
 * Local Tick Scheduler
 *
 * Usage:
 *   node scripts/local-scheduler.js
 *
 * This runs ticks every 5 minutes (300,000 ms) by calling the HTTP endpoint.
 * Use this in development if Convex crons aren't working.
 */

const http = require("http");

const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CONVEX_DEPLOYMENT_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";
const TICK_ENDPOINT = `${CONVEX_DEPLOYMENT_URL}/api/tick`;

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function executeTick() {
  try {
    log(`🔄 Triggering tick via ${TICK_ENDPOINT}...`);

    const response = await fetch(TICK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log(`✅ Tick #${data.data.tickNumber} completed`);
      log(
        `   Bot purchases: ${data.data.botPurchases}, Stock updates: ${data.data.stockUpdates}, Crypto updates: ${data.data.cryptoUpdates}`
      );
    } else {
      log(`❌ Tick failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    log(`❌ Error triggering tick: ${error.message}`);
  }
}

async function start() {
  log("🚀 Local Tick Scheduler Started");
  log(`   Interval: every 5 minutes (${TICK_INTERVAL_MS / 1000} seconds)`);
  log(`   Endpoint: ${TICK_ENDPOINT}`);
  log("");

  // Execute once immediately on startup (optional - comment out to start after first interval)
  // await executeTick();

  // Then schedule recurring ticks
  setInterval(executeTick, TICK_INTERVAL_MS);
}

start();
