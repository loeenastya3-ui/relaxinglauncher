import type { IModpackCard } from "@/types/Backend";
import type { ILocalAccount } from "@/types/Account";
import type { IUser } from "@/types/IUser";
import {
  accountSubject,
  accountUuid,
} from "@renderer/features/accounts/identity";

export const COMMUNITY_DATA_URL =
  "https://cdn.jsdelivr.net/gh/loeenastya3-ui/relaxinglauncher@main/community";

export function communityAssetUrl(path: string): string {
  return `${COMMUNITY_DATA_URL}/${path.replace(/^\/+/, "")}`;
}

export interface ICommunityUser {
  id: string;
  nickname: string;
  friendCode?: string;
  platform?: IUser["platform"];
  uuid?: string | null;
  bio?: string | null;
  createdAt?: string;
  lastActive?: string;
  playTimeSeconds?: number;
  achievements?: string[];
  isDonor?: boolean;
}

export interface ICommunityIndex {
  updatedAt?: string;
  users: ICommunityUser[];
}

export interface ICommunityProfile {
  user: ICommunityUser;
  modpacks?: IModpackCard[];
  rank?: number;
}

const TTL_MS = 5 * 60 * 1000;

let indexAt = 0;
let indexValue: ICommunityIndex | null | undefined;
const profileCache = new Map<
  string,
  { at: number; value: ICommunityProfile | null }
>();

type Freshness = { at: number; value: unknown };

function isFresh(entry: Freshness | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.at < TTL_MS;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadCommunityIndex(
  force = false,
): Promise<ICommunityIndex | null> {
  if (!force && isFresh({ at: indexAt, value: indexValue ?? {} })) {
    return indexValue ?? null;
  }

  const value = await fetchJson<ICommunityIndex>(communityAssetUrl("index.json"));
  if (value && Array.isArray(value.users)) {
    indexAt = Date.now();
    indexValue = value;
  }

  return indexValue ?? null;
}

export async function loadCommunityProfile(
  idOrNickname: string,
): Promise<ICommunityProfile | null> {
  const key = idOrNickname.trim();
  if (!key) return null;

  const cached = profileCache.get(key);
  if (cached && isFresh(cached)) return cached.value;

  let profile =
    await fetchJson<ICommunityProfile>(communityAssetUrl(`people/${key}.json`));

  if (!profile || !profile.user) {
    const index = await loadCommunityIndex();
    const match = index?.users.find(
      (entry) => entry.id === key || entry.nickname === key,
    );
    if (match && match.id !== key) {
      profile = await loadCommunityProfile(match.id);
    }
  }

  if (profile?.user && !profile.user.id) profile.user.id = key;

  profileCache.set(key, { at: Date.now(), value: profile ?? null });

  return profile ?? null;
}

export function communityHeadUrl(user: Pick<ICommunityUser, "id">): string {
  return communityAssetUrl(`skins/head/${encodeURIComponent(user.id)}.png`);
}

export function communityUserToIUser(
  user: ICommunityUser,
  createdAt?: string,
): IUser {
  return {
    _id: user.id,
    uuid: user.uuid ?? "",
    friendCode: user.friendCode,
    friendRequestsEnabled: false,
    nickname: user.nickname,
    platform: user.platform ?? "elyby",
    friends: [],
    image: communityHeadUrl(user),
    headUrl: communityHeadUrl(user),
    lastActive: new Date(user.lastActive ?? user.createdAt ?? createdAt ?? 0),
    createdAt: new Date(user.createdAt ?? createdAt ?? 0),
    playTime: user.playTimeSeconds ?? 0,
    achievements: user.achievements ?? [],
    achievementPoints: (user.achievements ?? []).length,
    publicLeaderboard: true,
    publicProfile: true,
    isDonor: Boolean(user.isDonor),
  };
}

function localPlatform(account: ILocalAccount): IUser["platform"] {
  switch (account.type) {
    case "microsoft":
      return "microsoft";
    case "discord":
      return "discord";
    default:
      return "elyby";
  }
}

export function localProfileUser(
  account: ILocalAccount | null | undefined,
): IUser | null {
  if (!account) return null;

  const id =
    accountSubject(account) ??
    (account.id?.trim() || `plain-${account.nickname}`);

  return {
    _id: id,
    uuid: accountUuid(account) ?? "",
    nickname: account.nickname,
    platform: localPlatform(account),
    friends: [],
    image: account.image || null,
    headUrl: null,
    lastActive: new Date(),
    createdAt: new Date(0),
    playTime: 0,
    achievements: [],
    achievementPoints: 0,
    publicLeaderboard: false,
    publicProfile: false,
  };
}
