export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.qWkbR_VB.js",app:"_app/immutable/entry/app.CGa8mIUx.js",imports:["_app/immutable/entry/start.qWkbR_VB.js","_app/immutable/chunks/2Zi7EVUS.js","_app/immutable/chunks/CXaXBrYW.js","_app/immutable/entry/app.CGa8mIUx.js","_app/immutable/chunks/CXaXBrYW.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/Iu4s2PPS.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/list",
				pattern: /^\/list\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
