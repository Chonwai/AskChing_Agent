import { describe, expect, it } from "vitest";

import { MARKET_FIXTURES, MARKET_HISTORY_FIXTURES } from "./fixtures.js";
import { LIVE_PROTOCOLS, PROTOCOL_REGISTRY } from "./source-config.js";

/**
 * Guards the fixture/live contract.
 *
 * On 2026-09-12 a verification pass found that `MARKET_FIXTURES` contained USDC
 * observations for `uwu-lend` and `zerolend`, even though neither deployment
 * can serve USDC: uwu-lend's mainnet markets list sifu/sDAI/sSPELL/USDT, and
 * every zerolend mainnet market is inactive with zero TVL. Fixture mode passed
 * while live mode could never reproduce those rows, which made the fixture set
 * a promise the product could not keep.
 *
 * These tests make that class of drift fail loudly.
 */
describe("fixture / live consistency", () => {
  it("only uses protocols that are registered", () => {
    const registered = new Set(PROTOCOL_REGISTRY.map((source) => source.protocol));
    const used = new Set([
      ...MARKET_FIXTURES.map((row) => row.protocol),
      ...MARKET_HISTORY_FIXTURES.map((row) => row.protocol)
    ]);

    for (const protocol of used) {
      expect(registered, `${protocol} is not in PROTOCOL_REGISTRY`).toContain(protocol);
    }
  });

  it("only uses live protocols, so every fixture row is reachable live", () => {
    const used = new Set([
      ...MARKET_FIXTURES.map((row) => row.protocol),
      ...MARKET_HISTORY_FIXTURES.map((row) => row.protocol)
    ]);

    for (const protocol of used) {
      expect(LIVE_PROTOCOLS, `${protocol} has fixtures but is not live`).toContain(
        protocol
      );
    }
  });

  it("gives the default asset a fixture for every live protocol", () => {
    // USDC is the default asset, so a live protocol without a USDC fixture
    // would make fixture mode and live mode disagree on the happy path.
    const usdcProtocols = new Set(
      MARKET_FIXTURES.filter((row) => row.asset === "USDC").map((row) => row.protocol)
    );

    for (const protocol of LIVE_PROTOCOLS) {
      expect(usdcProtocols, `${protocol} is live but has no USDC fixture`).toContain(
        protocol
      );
    }
  });

  it("gives every live protocol a supply_apy fixture", () => {
    const supplyApy = new Set(
      MARKET_FIXTURES.filter((row) => row.metric === "supply_apy").map((row) => row.protocol)
    );

    for (const protocol of LIVE_PROTOCOLS) {
      expect(supplyApy, `${protocol} is live but has no supply_apy fixture`).toContain(
        protocol
      );
    }
  });
});
