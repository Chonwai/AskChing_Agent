import {
  compareObservations,
  createMarketDataSource
} from "../packages/shared/src/index.js";

const dataSource = createMarketDataSource(process.env);
const observations = await dataSource.getObservations("usdc_supply_apy", [
  "aave-v3",
  "compound-v3",
  "spark-lend"
]);
const result = compareObservations(observations, "usdc_supply_apy");

console.log(JSON.stringify(result, null, 2));

