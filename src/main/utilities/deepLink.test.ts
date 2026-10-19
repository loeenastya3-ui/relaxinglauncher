import { describe, expect, it } from "vitest";
import { extractLauncherDeepLink, parseLauncherDeepLink } from "./deepLink";

describe("launcher deep links", () => {
  it("parses valid pack links", () => {
    expect(
      parseLauncherDeepLink(
        "relaxinglauncher://pack/507f1f77bcf86cd799439011",
      ),
    ).toEqual({
      type: "pack",
      shareCode: "507f1f77bcf86cd799439011",
    });
  });

  it("ignores invalid scheme, path and code", () => {
    expect(
      parseLauncherDeepLink("https://grubielauncher.com/pack/507f"),
    ).toBeNull();
    expect(
      parseLauncherDeepLink(
        "relaxinglauncher://user/507f1f77bcf86cd799439011",
      ),
    ).toBeNull();
    expect(parseLauncherDeepLink("relaxinglauncher://pack/bad-code")).toBeNull();
  });

  it("parses friend links and rejects malformed ids", () => {
    expect(
      parseLauncherDeepLink(
        "relaxinglauncher://friend/507f1f77bcf86cd799439011",
      ),
    ).toEqual({
      type: "friend",
      userId: "507f1f77bcf86cd799439011",
    });
    expect(parseLauncherDeepLink("relaxinglauncher://friend/nick")).toBeNull();
    expect(parseLauncherDeepLink("relaxinglauncher://friend/")).toBeNull();
  });

  it("parses launch links with an instance", () => {
    expect(
      parseLauncherDeepLink("relaxinglauncher://launch/My%20Pack?instance=2"),
    ).toEqual({
      type: "launch",
      versionName: "My Pack",
      instance: 2,
    });
  });

  it("defaults the launch instance to 0", () => {
    expect(parseLauncherDeepLink("relaxinglauncher://launch/Vanilla")).toEqual({
      type: "launch",
      versionName: "Vanilla",
      instance: 0,
    });
    expect(
      parseLauncherDeepLink("relaxinglauncher://launch/Vanilla?instance=-1"),
    ).toEqual({
      type: "launch",
      versionName: "Vanilla",
      instance: 0,
    });
  });

  it("rejects launch links without a version name", () => {
    expect(parseLauncherDeepLink("relaxinglauncher://launch/")).toBeNull();
    expect(parseLauncherDeepLink("relaxinglauncher://launch")).toBeNull();
  });

  it("extracts a deep link from process argv", () => {
    expect(
      extractLauncherDeepLink([
        "Relaxing Launcher.exe",
        "--flag",
        "relaxinglauncher://pack/507f1f77bcf86cd799439011",
      ]),
    ).toEqual({
      type: "pack",
      shareCode: "507f1f77bcf86cd799439011",
    });
  });
});
