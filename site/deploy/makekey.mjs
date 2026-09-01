// Derives a stream key the same way the server does, for local testing.
// usage: node makekey.mjs <secret> <customerId> [version]
import { createHmac } from 'node:crypto';

const [secret, customerId, version = '1'] = process.argv.slice(2);
const payload = `${customerId}.${version}`;
const sig = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
const b64 = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log(`nlu_${b64}_${sig}`);
