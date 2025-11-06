// ESM stub — allows server to run until learning logic is ready
export async function applyLearningRules(receipt = {}) {
  return receipt; // no-op, just pass data through
}

export async function updateVendorRules() {
  return null; // placeholder for vendor learning updates
}

export default { applyLearningRules, updateVendorRules };

// Optional: standalone test
if (import.meta.url === (process?.argv?.[1]?.startsWith("file:///") ? process.argv[1] : "")) {
  console.log("learning_rules stub ok");
}
