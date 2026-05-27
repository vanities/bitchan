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
import type * as admin from "../admin.js";
import type * as avatar from "../avatar.js";
import type * as crons from "../crons.js";
import type * as engagement from "../engagement.js";
import type * as galleries from "../galleries.js";
import type * as galleryActions from "../galleryActions.js";
import type * as governance from "../governance.js";
import type * as http from "../http.js";
import type * as indexer from "../indexer.js";
import type * as lib_eip712 from "../lib/eip712.js";
import type * as lib_gallery from "../lib/gallery.js";
import type * as lib_imageType from "../lib/imageType.js";
import type * as media from "../media.js";
import type * as mediaActions from "../mediaActions.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as profile from "../profile.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reactions from "../reactions.js";
import type * as stats from "../stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  admin: typeof admin;
  avatar: typeof avatar;
  crons: typeof crons;
  engagement: typeof engagement;
  galleries: typeof galleries;
  galleryActions: typeof galleryActions;
  governance: typeof governance;
  http: typeof http;
  indexer: typeof indexer;
  "lib/eip712": typeof lib_eip712;
  "lib/gallery": typeof lib_gallery;
  "lib/imageType": typeof lib_imageType;
  media: typeof media;
  mediaActions: typeof mediaActions;
  notifications: typeof notifications;
  posts: typeof posts;
  profile: typeof profile;
  rateLimit: typeof rateLimit;
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
