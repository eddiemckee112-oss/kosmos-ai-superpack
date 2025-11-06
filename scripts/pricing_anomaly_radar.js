// ESM stub for pricing_anomaly_radar — replaces old CommonJS logic
export async function scanPricingAnomalies() {
  return {
    day: new Date().toISOString().slice(0, 10),
    vendorWarnings: [],
    skuWarnings: []
  };
}

export default { scanPricingAnomalies };

// Optional test runner
if (import.meta.url === (process?.argv?.[1]?.startsWith("file:///") ? process.argv[1] : "")) {
  scanPricingAnomalies().then(() => console.log("pricing_anomaly_radar stub ok"));
}
