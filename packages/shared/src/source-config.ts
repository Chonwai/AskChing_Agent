export type ProtocolSlug = "aave-v3" | "compound-v3";

export interface SubgraphSource {
  protocol: ProtocolSlug;
  network: "mainnet";
  subgraphId: string;
  explorerUrl: string;
}

export const LIVE_SOURCES: readonly SubgraphSource[] = [
  {
    protocol: "aave-v3",
    network: "mainnet",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    explorerUrl:
      "https://thegraph.com/explorer/subgraphs/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk"
  },
  {
    protocol: "compound-v3",
    network: "mainnet",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    explorerUrl:
      "https://thegraph.com/explorer/subgraphs/AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9"
  }
] as const;

