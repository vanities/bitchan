/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as crons from "../crons.js";
import type * as engagement from "../engagement.js";
import type * as governance from "../governance.js";
import type * as http from "../http.js";
import type * as indexer from "../indexer.js";
import type * as media from "../media.js";
import type * as mediaActions from "../mediaActions.js";
import type * as posts from "../posts.js";
import type * as reactions from "../reactions.js";
import type * as stats from "../stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  crons: typeof crons;
  engagement: typeof engagement;
  governance: typeof governance;
  http: typeof http;
  indexer: typeof indexer;
  media: typeof media;
  mediaActions: typeof mediaActions;
  posts: typeof posts;
  reactions: typeof reactions;
  stats: typeof stats;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
