import { migrate, databasePath } from '../packages/core/src/db/client';
const db=migrate();
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(JSON.stringify({ok:true,database:databasePath(),tables:tables.length},null,2));
db.close();
