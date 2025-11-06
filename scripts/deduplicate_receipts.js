// ESM stub for deduplicate_receipts — lets main server import safely
export async function dedupeReceipts() {
  return { removed: 0, kept: 0, ts: new Date().toISOString() };
}

export default { dedupeReceipts };

// Optional: standalone test
if (import.meta.url === (process?.argv?.[1]?.startsWith("file:///") ? process.argv[1] : "")) {
  dedupeReceipts().then(() => console.log("deduplicate_receipts stub ok"));
}
