export function parse(text, vendor){
  const U = String(vendor||'').toUpperCase();
  const is = (k)=> U.includes(k);
  const money = [...String(text).matchAll(/\$?\b(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\b/g)].map(m=>parseFloat(m[1].replace(/,/g,'')));
  const total = money.length? money[money.length-1] : undefined;
  const date = (String(text).match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)||[]).slice(1,4).join('-')||undefined;
  const invoice = (String(text).match(/INVOICE\s*(?:NO\.|#)?\s*([A-Z0-9-]+)/i)||[])[1];
  const tax = (String(text).match(/HST\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/i)||[])[1];
  return { total, date, invoice, tax: tax? parseFloat(String(tax).replace(/,/g,'')) : undefined };
}
