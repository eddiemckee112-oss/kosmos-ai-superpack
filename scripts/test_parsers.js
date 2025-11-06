import fs from 'fs'; import { parse } from './supplier_parsers.js'; const [,, v,f]=process.argv; const t=fs.readFileSync(f,'utf8'); console.log(JSON.stringify(parse(t,v),null,2));
