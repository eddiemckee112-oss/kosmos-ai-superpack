import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import * as gmailSvc from '../scripts/gmail_oauth.js';
import { parse as parseSupplier } from '../scripts/supplier_parsers.js';
import * as learn from '../scripts/learning_rules.js';
import { generateReport } from '../scripts/reconcile_report.js';
import { scanDrift } from '../scripts/vendor_drift_alerts.js';
import { dedupeReceipts } from '../scripts/deduplicate_receipts.js';
import { scanPricingAnomalies } from '../scripts/pricing_anomaly_radar.js';
const app = express();
app.use(bodyParser.json()); app.use(express.static('public'));
function JLread(p){ if(!fs.existsSync(p)) return []; return fs.readFileSync(p,'utf8').split(/\n/).filter(Boolean).map(l=>{ try{return JSON.parse(l)}catch{return null}}).filter(Boolean); }
function JLappend(p,row){ fs.appendFileSync(p, JSON.stringify(row)+'\n'); }
function daysBetween(a,b){ return Math.abs((new Date(a).getTime()-new Date(b).getTime())/86400000); }
function sim(a,b){ a=String(a||'').toUpperCase(); b=String(b||'').toUpperCase(); if(!a||!b) return 0; if(a===b) return 1; if(a.includes(b)||b.includes(a)) return 0.7; const ta=new Set(a.split(/[^A-Z0-9]/).filter(Boolean)); const tb=new Set(b.split(/[^A-Z0-9]/).filter(Boolean)); const inter=[...ta].filter(x=>tb.has(x)).length; const uni=new Set([...ta,...tb]).size||1; return inter/uni; }
function bestTxnFor(rec){ const txns=JLread('./store/transactions.jsonl'); let best=null, bestS=0; for(const t of txns){ const amountClose=Math.abs(Number(rec.total||0)-Number(t.amount||0))<0.01; const dateClose=daysBetween(rec.date||t.date,t.date||rec.date)<=5; const vendorSim=sim(rec.vendor,t.vendor||t.description); const score=vendorSim*0.6+(amountClose?0.3:0)+(dateClose?0.1:0); if(score>bestS){ bestS=score; best={ txn_id:t.id, score:+score.toFixed(3), txn:t }; } } return (bestS>=0.6)? best:null; }
// Gmail OAuth
app.get('/gmail/oauth/start', (_req,res)=>{ try{ res.json({ ok:true, url: gmailSvc.getAuthUrl() }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.get('/gmail/oauth/callback', async (req,res)=>{ try{ const code=req.query.code; if(!code) return res.status(400).send('Missing code'); await gmailSvc.handleOAuthCallback(String(code)); res.send('Gmail connected.'); }catch(e){ res.status(500).send(String(e)); } });
// Supplier parse
app.post('/suppliers/parse_preview', (req,res)=>{ try{ const vendor=String(req.body?.vendor||''); const filename=String(req.body?.filename||''); if(!vendor||!filename) return res.status(400).json({ ok:false, error:'vendor, filename required' }); const txtPath=path.join('./store/pdfs', filename.replace(/\.pdf$/i,'')+'.txt'); if(!fs.existsSync(txtPath)) return res.status(404).json({ ok:false, error:'sidecar .txt not found' }); const text=fs.readFileSync(txtPath,'utf8'); const extracted=learn.applyOverrides(vendor, parseSupplier(text, vendor)); res.json({ ok:true, extracted }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/suppliers/parse_deep_cascade', (req,res)=>{ try{ const vendor=String(req.body?.vendor||'').toUpperCase(); const filename=String(req.body?.filename||''); if(!vendor||!filename) return res.status(400).json({ ok:false, error:'vendor, filename required' }); const txtPath=path.join('./store/pdfs', filename.replace(/\.pdf$/i,'')+'.txt'); if(!fs.existsSync(txtPath)) return res.status(404).json({ ok:false, error:'sidecar .txt not found' }); const text=fs.readFileSync(txtPath,'utf8'); const extracted=learn.applyOverrides(vendor, parseSupplier(text, vendor)); const rec={ id:'rec_'+Date.now().toString(36), date: extracted.date, vendor, total: Number(extracted.total)||0, category:'', source:'email-pdf', invoice: extracted.invoice, tax: extracted.tax }; JLappend('./store/receipts.jsonl', rec); const best=bestTxnFor(rec); res.json({ ok:true, receipt_id: rec.id, extracted, cascade: best }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/suppliers/apply_correction', (req,res)=>{ try{ const { receipt_id, field, value } = req.body||{}; if(!receipt_id||!field) return res.status(400).json({ ok:false, error:'receipt_id, field, value required' }); const recs=JLread('./store/receipts.jsonl'); const r=recs.find(x=>x.id===receipt_id); if(!r) return res.status(404).json({ ok:false, error:'receipt not found' }); const over=learn.recordCorrection(r.vendor, receipt_id, field, value); r[field]=(field==='total')? Number(value):value; const replaced=recs.map(x=>x.id===receipt_id? r:x); fs.writeFileSync('./store/receipts.jsonl', replaced.map(x=>JSON.stringify(x)).join('\n')+'\n'); res.json({ ok:true, overrides: over, receipt: r }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/suppliers/line_items_classify', (req,res)=>{ try{ const { vendor, lines } = req.body||{}; if(!vendor||!Array.isArray(lines)) return res.status(400).json({ ok:false, error:'vendor, lines[] required' }); const mapPath='./store/sku_maps/'+String(vendor).toUpperCase()+'.json'; const mapping=fs.existsSync(mapPath)? JSON.parse(fs.readFileSync(mapPath,'utf8')):{}; const out = lines.map(L=> ({ line:L, category: mapping[L.sku] || mapping[L.name] || '' })); res.json({ ok:true, items: out }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
// Ops
app.post('/ops/run_report', async (_req, res)=>{ try{ const r=await generateReport(); res.json({ ok:true, ...r }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/ops/run_drift', async (_req, res)=>{ try{ const r=await scanDrift(); res.json({ ok:true, ...r }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/ops/run_dedupe', async (_req, res)=>{ try{ const r=await dedupeReceipts(); res.json({ ok:true, ...r }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.post('/ops/run_pricing', async (_req, res)=>{ try{ const r=await scanPricingAnomalies(); res.json({ ok:true, ...r }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
app.get('/reports/latest', (_req, res)=>{ try{ const dir='./store/reports'; const files=fs.readdirSync(dir).filter(f=> f.endsWith('.json')||f.endsWith('.csv')).sort(); res.json({ ok:true, files }); }catch(e){ res.status(500).json({ ok:false, error:String(e) }); } });
const PORT=process.env.PORT||3040; app.listen(PORT, ()=> console.log('KOSMOS AI SUPERPACK on :'+PORT));
