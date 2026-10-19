import { describe, expect, it } from "vitest";
import {
  MAX_INITIAL_DATA_BASE64_LENGTH,
  isValidGatewayUrl,
  parseTunnelControlMessage,
} from "./shareProtocol";

describe("parseTunnelControlMessage", () => {
  it("accepts a well formed OPEN_STREAM", () => {
    const message = parseTunnelControlMessage(
      JSON.stringify({
        type: "OPEN_STREAM",
        streamId: 7,
        peerIp: "203.0.113.10",
        peerPort: 51234,
        initialDataBase64: "",
      }),
    );

    expect(message).toEqual({
      type: "OPEN_STREAM",
      streamId: 7,
      peerIp: "203.0.113.10",
      peerPort: 51234,
      initialDataBase64: "",
      statusPing: false,
    });
  });

  it("marks an OPEN_STREAM opened for a server-list ping", () => {
    const message = parseTunnelControlMessage(
      JSON.stringify({
        type: "OPEN_STREAM",
        streamId: 8,
        peerIp: "203.0.113.10",
        peerPort: 51235,
        initialDataBase64: "",
        statusPing: true,
      }),
    );

    expect(message).toMatchObject({ statusPing: true });
  });

  it("rejects malformed OPEN_STREAM fields", () => {
    const base = {
      type: "OPEN_STREAM",
      streamId: 1,
      peerIp: "127.0.0.1",
      peerPort: 25565,
      initialDataBase64: "",
    };

    const invalid = [
      { ...base, streamId: "1" },
      { ...base, streamId: -1 },
      { ...base, streamId: 1.5 },
      { ...base, peerIp: "not-an-ip" },
      { ...base, peerPort: 0 },
      { ...base, peerPort: 70000 },
      {
        ...base,
        initialDataBase64: "a".repeat(MAX_INITIAL_DATA_BASE64_LENGTH + 1),
      },
    ];

    for (const payload of invalid) {
      expect(() => parseTunnelControlMessage(JSON.stringify(payload))).toThrow();
    }
  });

  it("keeps the guest identity the gateway attaches to OPEN_STREAM", () => {
    const message = parseTunnelControlMessage(
      JSON.stringify({
        type: "OPEN_STREAM",
        streamId: 7,
        peerIp: "203.0.113.10",
        peerPort: 51234,
        initialDataBase64: "",
        guestUserId: "64b7f0c2e1a4d9f3b2c10a55",
        guestUsername: "Steve",
      }),
    );

    expect(message).toMatchObject({
      guestUserId: "64b7f0c2e1a4d9f3b2c10a55",
      guestUsername: "Steve",
    });
  });

  it("rejects a malformed guest identity on OPEN_STREAM", () => {
    const base = {
      type: "OPEN_STREAM",
      streamId: 1,
      peerIp: "127.0.0.1",
      peerPort: 25565,
      initialDataBase64: "",
    };

    const invalid = [
      { ...base, guestUserId: 42 },
      { ...base, guestUserId: "has spaces" },
      { ...base, guestUserId: "a".repeat(65) },
      { ...base, guestUsername: 42 },
      { ...base, guestUsername: "ThisNameIsWayTooLong" },
      { ...base, guestUsername: "with space" },
      { ...base, guestUsername: "bad\u0000name" },
    ];

    for (const payload of invalid) {
      expect(() => parseTunnelControlMessage(JSON.stringify(payload))).toThrow();
    }
  });

  it("treats an absent or empty guest identity as unknown", () => {
    const message = parseTunnelControlMessage(
      JSON.stringify({
        type: "OPEN_STREAM",
        streamId: 1,
        peerIp: "127.0.0.1",
        peerPort: 25565,
        initialDataBase64: "",
        guestUserId: "",
        guestUsername: "",
      }),
    );

    expect(message).toMatchObject({
      guestUserId: undefined,
      guestUsername: undefined,
    });
  });

  it("rejects unknown and shapeless messages", () => {
    expect(() => parseTunnelControlMessage("[]")).toThrow();
    expect(() => parseTunnelControlMessage("null")).toThrow();
    expect(() => parseTunnelControlMessage('{"type":"WAT"}')).toThrow();
    expect(() =>
      parseTunnelControlMessage('{"type":"CLOSE_STREAM","streamId":1}'),
    ).toThrow();
    expect(() =>
      parseTunnelControlMessage('{"type":"AUTH_OK","sessionId":"a","slug":"b"}'),
    ).toThrow();
  });

  it("keeps the negotiated handshake version from AUTH_OK", () => {
    expect(
      parseTunnelControlMessage(
        JSON.stringify({
          type: "AUTH_OK",
          connectionId: "c",
          sessionId: "s",
          slug: "world-abcd",
          protocolVersion: 2,
          minSupportedVersion: 1,
        }),
      ),
    ).toMatchObject({ protocolVersion: 2, minSupportedVersion: 1 });
  });
});

describe("isValidGatewayUrl", () => {
  it("accepts the production gateway over TLS", () => {
    expect(isValidGatewayUrl("wss://tunnel.relaxinglauncher.com/ws")).toBe(true);
    expect(isValidGatewayUrl("")).toBe(true);
  });

  it("refuses plaintext and foreign hosts", () => {
    expect(isValidGatewayUrl("ws://tunnel.relaxinglauncher.com/ws")).toBe(false);
    expect(isValidGatewayUrl("wss://evil.example.com/ws")).toBe(false);
    expect(isValidGatewayUrl("wss://relaxinglauncher.com.evil.example/ws")).toBe(
      false,
    );
    expect(isValidGatewayUrl("http://tunnel.relaxinglauncher.com/ws")).toBe(false);
    expect(isValidGatewayUrl("not a url")).toBe(false);
  });

  it("allows a plaintext loopback gateway only while developing", () => {
    const previous = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = "development";
      expect(isValidGatewayUrl("ws://127.0.0.1:8080/ws")).toBe(true);
      expect(isValidGatewayUrl("ws://localhost:8080/ws")).toBe(true);
      expect(isValidGatewayUrl("ws://[::1]:8080/ws")).toBe(true);

      process.env.NODE_ENV = "production";
      expect(isValidGatewayUrl("ws://127.0.0.1:8080/ws")).toBe(false);
      expect(isValidGatewayUrl("ws://localhost:8080/ws")).toBe(false);
      expect(isValidGatewayUrl("ws://[::1]:8080/ws")).toBe(false);
      expect(isValidGatewayUrl("wss://127.0.0.1:8080/ws")).toBe(true);
      expect(isValidGatewayUrl("wss://localhost:8080/ws")).toBe(true);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
