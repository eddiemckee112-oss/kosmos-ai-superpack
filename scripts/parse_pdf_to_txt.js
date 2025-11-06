import fs from 'fs'; import path from 'path'; import pdf from 'pdf-parse';
async function run(file){ if(!file) throw new Error('PDF path required'); const buf=fs.readFileSync(file); const data=await pdf(buf); const txt=data.text||''; const out=path.join(path.dirname(file), path.basename(file).replace(/\.pdf$/i,'')+'.txt'); fs.writeFileSync(out, txt); console.log('Wrote', out); }
if (require.main === module) { run(process.argv[2]).catch(e=>{ console.error(e); process.exit(1); }); }
