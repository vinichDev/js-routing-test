import * as server from '../entries/pages/list/_page.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/list/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/list/+page.server.js";
export const imports = ["_app/immutable/nodes/3.DMzu5vBN.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/Bav4rwrj.js","_app/immutable/chunks/CXaXBrYW.js","_app/immutable/chunks/Iu4s2PPS.js","_app/immutable/chunks/BAWAbC6l.js","_app/immutable/chunks/D_48_cjX.js","_app/immutable/chunks/2Zi7EVUS.js","_app/immutable/chunks/QhUia7-n.js"];
export const stylesheets = [];
export const fonts = [];
