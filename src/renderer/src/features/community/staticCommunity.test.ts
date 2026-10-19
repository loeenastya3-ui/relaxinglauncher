import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMUNITY_DATA_URL,
  communityHeadUrl,
  communityUserToIUser,
  localProfileUser,
  loadCommunityIndex,
  loadCommunityProfile,
} from "./staticCommunity";
import type { ILocalAccount } from "@/types/Account";

const fetchMock = vi.fn();

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => payload,
  };
}

describe("staticCommunity", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("builds asset urls from the data root", () => {
    expect(communityHeadUrl({ id: "demo-loeena" })).toBe(
      `${COMMUNITY_DATA_URL}/skins/head/demo-loeena.png`,
    );
  });

  it("loads the index and reuses the cache", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        users: [{ id: "a1", nickname: "Alpha" }],
      }),
    );

    const first = await loadCommunityIndex();
    expect(first?.users).toEqual([{ id: "a1", nickname: "Alpha" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadCommunityIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves profiles by id and falls back to the index by nickname", async () => {
    const user = { id: "a1", nickname: "Alpha", bio: "hello" };
    fetchMock.mockImplementation(async (url: string | URL) => {
      if (String(url).endsWith("people/a1.json")) {
        return jsonResponse({ user, rank: 3 });
      }
      if (String(url).endsWith("index.json")) {
        return jsonResponse({ users: [user] });
      }
      return jsonResponse({}, false);
    });

    const byId = await loadCommunityProfile("a1");
    expect(byId?.user.nickname).toBe("Alpha");

    const byNickname = await loadCommunityProfile("Alpha");
    expect(byNickname?.user.id).toBe("a1");
    expect(byNickname?.rank).toBe(3);
  });

  it("maps community users into IUser", () => {
    const user = communityUserToIUser({
      id: "a1",
      nickname: "Alpha",
      bio: "hello",
      achievements: ["ax1", "ax2"],
      playTimeSeconds: 7200,
      createdAt: "2026-01-01T00:00:00.000Z",
      isDonor: true,
    });

    expect(user._id).toBe("a1");
    expect(user.nickname).toBe("Alpha");
    expect(user.headUrl).toContain("/skins/head/a1.png");
    expect(user.playTime).toBe(7200);
    expect(user.achievements).toEqual(["ax1", "ax2"]);
    expect(user.createdAt.getTime()).toBe(
      new Date("2026-01-01T00:00:00.000Z").getTime(),
    );
    expect(user.isDonor).toBe(true);
  });

  it("composes an offline own profile from the local account", () => {
    const account = {
      type: "plain" as ILocalAccount["type"],
      nickname: "LocalNick",
      image: "C:/skins/local.png",
      friends: [],
    };

    const user = localProfileUser(account);
    expect(user?.nickname).toBe("LocalNick");
    expect(user?.platform).toBe("elyby");
    expect(user?.image).toBe("C:/skins/local.png");
    expect(user?._id.startsWith("plain-")).toBe(true);
  });
});
