import { describe, expect, it } from "vitest";

import {
  LIVE_PROTOCOLS,
  LIVE_SOURCES,
  PROTOCOL_REGISTRY,
  SUPPORTED_PROTOCOLS,
  assertLiveProtocols,
  getSource,
  requireSource
} from "./source-config.js";

describe("PROTOCOL_REGISTRY", () => {
  it("registers exactly ten protocols", () => {
    expect(PROTOCOL_REGISTRY).toHaveLength(10);
  });

  it("marks exactly six protocols live", () => {
    expect(LIVE_SOURCES).toHaveLength(6);
    expect(LIVE_SOURCES.every((source) => source.live)).toBe(true);
    expect(LIVE_SOURCES.every((source) => source.schemaVersion === "3.1.0")).toBe(
      true
    );
  });

  it("pins every subgraph id to the verified task values", () => {
    const byProtocol = Object.fromEntries(
      PROTOCOL_REGISTRY.map((source) => [source.protocol, source.subgraphId])
    );
    expect(byProtocol).toMatchObject({
      "aave-v3": "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
      "compound-v3": "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
      "spark-lend": "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
      "aave-v2": "C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j",
      "uwu-lend": "CZBD7e8VGvNa6WkBHZAaC688bsZ35UvAM1AuDdVng2aE",
      zerolend: "4Zf4doH54RDit9KVsfCp3MkjrP3szhJZwvw2z5PHczx9",
      "compound-v2": "4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a9a",
      "rari-fuse": "kecp6SPMvbB4GTqg9r5PXvztYriexj5F3ZCaATpjmb2",
      makerdao: "8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1",
      euler: "95nyAWFFaiz6gykko3HtBCyhRuP5vZzuKYsZiLxHxLhr"
    });
  });

  it("keeps deferred protocols out of the live list", () => {
    const deferred = ["compound-v2", "rari-fuse", "makerdao", "euler"];
    for (const protocol of deferred) {
      const source = getSource(protocol);
      expect(source?.live).toBe(false);
      expect(LIVE_PROTOCOLS).not.toContain(protocol);
    }
  });

  it("exposes supported protocol slugs for registry validation", () => {
    expect(SUPPORTED_PROTOCOLS).toEqual([
      "aave-v3",
      "compound-v3",
      "spark-lend",
      "aave-v2",
      "uwu-lend",
      "zerolend",
      "compound-v2",
      "rari-fuse",
      "makerdao",
      "euler"
    ]);
  });
});

describe("getSource / requireSource", () => {
  it("resolves a known protocol", () => {
    expect(getSource("aave-v3")?.subgraphId).toBe(
      "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk"
    );
    expect(requireSource("zerolend").live).toBe(true);
  });

  it("returns undefined for an unknown protocol", () => {
    expect(getSource("dforce")).toBeUndefined();
  });

  it("throws for an unknown protocol and lists supported slugs", () => {
    expect(() => requireSource("dforce")).toThrow(/Unknown protocol: dforce/);
    expect(() => requireSource("dforce")).toThrow(/aave-v3/);
    expect(() => requireSource("dforce")).toThrow(/euler/);
  });
});

describe("assertLiveProtocols", () => {
  it("accepts only live protocols", () => {
    expect(() =>
      assertLiveProtocols(["aave-v3", "compound-v3", "zerolend"])
    ).not.toThrow();
  });

  it("rejects deferred protocols with a live list hint", () => {
    expect(() =>
      assertLiveProtocols(["aave-v3", "compound-v2"])
    ).toThrow(/Protocols not yet live: compound-v2/);
    expect(() =>
      assertLiveProtocols(["aave-v3", "compound-v2"])
    ).toThrow(/Live: aave-v3/);
  });
});