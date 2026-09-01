// Same seller manifest as /.well-known/x402, served from code so it always
// reflects the configured wallet and facilitator. The well-known copy is a
// static file because dot-folder routes are not built on every platform.
export { GET } from '../.well-known/x402/route';
