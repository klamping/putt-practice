import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** Precache the exact HTML and hashed assets emitted by this production build. */
export function offlineBuild(): Plugin {
  return {
    name: 'putt-practice-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const files = Object.keys(bundle).filter(file => !file.endsWith('.map')).sort();
        const hash = createHash('sha256');
        for (const file of files) {
          const output = bundle[file];
          hash.update(file).update(output.type === 'chunk' ? output.code : output.source);
        }
        const version = hash.digest('hex').slice(0, 16);
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'putt-practice:' + self.registration.scope + ':';
const CACHE = PREFIX + ${JSON.stringify(version)};
const FILES = ${JSON.stringify(files)}.map(file => new URL(file, self.registration.scope).href);
const INDEX = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map(url => new Request(url, { cache: 'reload' })));
  })());
  // Do not skipWaiting: a new build must not replace an open practice session.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await (await caches.open(CACHE)).match(INDEX);
      if (!cached) return fetch(request);
      // Navigation requests reject redirected cached responses. Static hosts
      // may redirect index.html to /; preserve the body without that flag.
      return cached.redirected ? new Response(cached.body, {
        status: cached.status, statusText: cached.statusText, headers: cached.headers,
      }) : cached;
    })());
  } else if (FILES.includes(request.url)) {
    event.respondWith((async () => {
      const cached = await (await caches.open(CACHE)).match(request);
      return cached || fetch(request);
    })());
  }
});
` });
      },
    },
  };
}
