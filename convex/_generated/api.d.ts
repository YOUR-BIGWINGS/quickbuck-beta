/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminSubscriptions from "../adminSubscriptions.js";
import type * as alerts from "../alerts.js";
import type * as badges from "../badges.js";
import type * as cart from "../cart.js";
import type * as cleanup from "../cleanup.js";
import type * as companies from "../companies.js";
import type * as companySales from "../companySales.js";
import type * as contentFilter from "../contentFilter.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as diagnostics from "../diagnostics.js";
import type * as gambling from "../gambling.js";
import type * as gameConfig from "../gameConfig.js";
import type * as gameStats from "../gameStats.js";
import type * as http from "../http.js";
import type * as kofiWebhook from "../kofiWebhook.js";
import type * as leaderboard from "../leaderboard.js";
import type * as loans from "../loans.js";
import type * as maintenance from "../maintenance.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as playerTags from "../playerTags.js";
import type * as players from "../players.js";
import type * as portfolio from "../portfolio.js";
import type * as products from "../products.js";
import type * as rebirths from "../rebirths.js";
import type * as rules from "../rules.js";
import type * as stocks from "../stocks.js";
import type * as subscriptions from "../subscriptions.js";
import type * as taxes from "../taxes.js";
import type * as themes from "../themes.js";
import type * as tick from "../tick.js";
import type * as transactions from "../transactions.js";
import type * as upgrades from "../upgrades.js";
import type * as users from "../users.js";
import type * as vipLounge from "../vipLounge.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminSubscriptions: typeof adminSubscriptions;
  alerts: typeof alerts;
  badges: typeof badges;
  cart: typeof cart;
  cleanup: typeof cleanup;
  companies: typeof companies;
  companySales: typeof companySales;
  contentFilter: typeof contentFilter;
  crons: typeof crons;
  crypto: typeof crypto;
  diagnostics: typeof diagnostics;
  gambling: typeof gambling;
  gameConfig: typeof gameConfig;
  gameStats: typeof gameStats;
  http: typeof http;
  kofiWebhook: typeof kofiWebhook;
  leaderboard: typeof leaderboard;
  loans: typeof loans;
  maintenance: typeof maintenance;
  messages: typeof messages;
  migrations: typeof migrations;
  moderation: typeof moderation;
  playerTags: typeof playerTags;
  players: typeof players;
  portfolio: typeof portfolio;
  products: typeof products;
  rebirths: typeof rebirths;
  rules: typeof rules;
  stocks: typeof stocks;
  subscriptions: typeof subscriptions;
  taxes: typeof taxes;
  themes: typeof themes;
  tick: typeof tick;
  transactions: typeof transactions;
  upgrades: typeof upgrades;
  users: typeof users;
  vipLounge: typeof vipLounge;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
