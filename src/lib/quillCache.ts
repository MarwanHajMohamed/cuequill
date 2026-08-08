import crypto from "crypto";
import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import { User } from "@/lib/models/User";

// Gemini context caching for Quill. The system instruction (trader snapshot +
// rules + strategies + goals) is large and stable across the turns of a single
// conversation, so caching it server-side lets follow-up messages skip
// re-sending / re-billing the whole prefix.
//
// The cache is keyed to the user and a hash of the instruction, stored on the
// user doc so it survives across (stateless) serverless invocations and is
// reused until it expires or the snapshot changes. Caching is a pure
// optimisation — any failure falls back to an ordinary, uncached model so chat
// never breaks because of it.

const MODEL_ID = "gemini-2.5-flash";
const CACHED_MODEL_ID = "models/gemini-2.5-flash";
const TTL_SECONDS = 15 * 60; // reuse window for a conversation burst
// Explicit caches must clear a minimum token count; below it, creation errors.
// ~12k chars ≈ 3k tokens keeps us comfortably above the floor and skips the
// tiny snapshots of brand-new accounts (which wouldn't benefit anyway).
const MIN_CACHE_CHARS = 12_000;

export function hashInstruction(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

export async function getQuillModel(opts: {
  genAI: GoogleGenerativeAI;
  apiKey: string;
  userId: string;
  systemInstruction: string;
  tools: FunctionDeclaration[];
}): Promise<GenerativeModel> {
  const { genAI, apiKey, userId, systemInstruction, tools } = opts;
  const toolConfig = [{ functionDeclarations: tools }];
  const plain = (): GenerativeModel =>
    genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction,
      tools: toolConfig,
    });

  // Too small to cache (new users): not worth it, and create() would reject
  // content under the minimum token count.
  if (systemInstruction.length < MIN_CACHE_CHARS) return plain();

  const hash = hashInstruction(systemInstruction);

  try {
    const user = await User.findById(userId)
      .select("chatCacheName chatCacheHash chatCacheExpiresAt")
      .lean<{
        chatCacheName?: string;
        chatCacheHash?: string;
        chatCacheExpiresAt?: Date;
      }>();

    const now = Date.now();
    const live =
      user?.chatCacheName &&
      user.chatCacheHash === hash &&
      user.chatCacheExpiresAt &&
      new Date(user.chatCacheExpiresAt).getTime() > now + 30_000;

    if (live) {
      // Reuse by reference — getGenerativeModelFromCachedContent only needs
      // the cache's name + model, so no extra fetch is required.
      return genAI.getGenerativeModelFromCachedContent({
        name: user!.chatCacheName!,
        model: CACHED_MODEL_ID,
        contents: [],
      });
    }

    const cacheManager = new GoogleAICacheManager(apiKey);
    const cached = await cacheManager.create({
      model: CACHED_MODEL_ID,
      systemInstruction,
      tools: toolConfig,
      contents: [],
      ttlSeconds: TTL_SECONDS,
    });

    await User.findByIdAndUpdate(userId, {
      $set: {
        chatCacheName: cached.name ?? "",
        chatCacheHash: hash,
        chatCacheExpiresAt: new Date(now + TTL_SECONDS * 1000),
      },
    }).catch(() => {});

    return genAI.getGenerativeModelFromCachedContent(cached);
  } catch {
    // Any caching problem (too small, quota, transient API error) → run
    // uncached. Chat must never depend on the cache succeeding.
    return plain();
  }
}
