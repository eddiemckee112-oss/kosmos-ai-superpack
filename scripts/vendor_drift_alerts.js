// ESM stub for vendor drift alerts — neutralizes old CommonJS code
export async function scanDrift() {
  return { day: new Date().toISOString().slice(0, 10), alerts: [] };
}

export default { scanDrift };

// Optional: standalone test
if (import.meta.url === (process?.argv?.[1]?.startsWith("file:///") ? process.argv[1] : "")) {
  scanDrift().then(() => console.log("vendor_drift_alerts stub ok"));
}
