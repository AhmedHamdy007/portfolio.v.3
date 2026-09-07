# Portfolio deployment

## Run on a server

Install Docker Engine and the Compose plugin. From this directory:

```sh
docker compose up -d --build
docker compose ps
curl -f http://127.0.0.1:8080/healthz
docker compose logs --tail=100 portfolio
```

Compose binds to **127.0.0.1:8080 by default**. Put your HTTPS reverse proxy (Caddy, Nginx, or your hosting provider) in front of it, proxying to that address. Configure your domain, certificate renewal, firewall and HTTP→HTTPS redirect there. If the proxy runs in another container, use a shared Docker network and `portfolio:8080`, not that container's localhost.

For a temporary direct HTTP preview only:

```sh
BIND_ADDRESS=0.0.0.0 PORT=8080 docker compose up -d --build
```

This does not configure TLS. Do not expose your Docker daemon or the Vite development server to the Internet. This app currently expects deployment at the domain root, not a subdirectory.

## Container contract

- Multi-stage build: Node 24 builds/tests; only static output and Nginx ship at runtime.
- Non-root runtime, read-only filesystem, writable `/tmp` only, dropped capabilities, bounded logs and health check.
- `npm ci` uses the checked-in lockfile. Vite variables are **public build-time values**; never place secrets in `VITE_*` variables.
- GLBs/JS/CSS are precompressed during build. `gzip_static` serves those bytes without recompressing large models per request. Images retain their original encodings.
- Vite's hashed `/assets/` files cache for one year. Unhashed models/photos/fonts cache for one hour, then revalidate. HTML revalidates. Missing assets return 404 rather than the SPA HTML document.
- Rebuild with `docker compose build --pull` for base-image security updates. For a reproducible release pipeline, pin the approved Node/Nginx image **digests** after scanning them. Tags intentionally remain updatable in this starter configuration.
- No service worker: no stale offline cache to invalidate. No asset CDN is required for models, photos or the Draco decoder; serve these same-origin through your HTTPS host/CDN.

## Verify the running Nginx container

```sh
docker compose exec portfolio nginx -t
curl -I -H 'Accept-Encoding: gzip' http://127.0.0.1:8080/models/tilt_brush_-_falling.glb
curl -I http://127.0.0.1:8080/models/not-a-real-model.glb
```

Expect `Content-Encoding: gzip` for the real model and **404** for the missing one. Check a filename from `dist/assets/` for the long cache lifetime, and `/index.html` for revalidation. Test HTTPS and compression again through the public reverse proxy/CDN; it can override these headers.

## Performance verification

```sh
npm run lint
node scripts/test-portal-exit.mjs
node scripts/test-album-journey.mjs
node scripts/test-signature-loader.mjs
node scripts/test-production-assets.mjs
npm run build
node scripts/precompress.mjs
node scripts/preview-network.mjs
```

Open `http://127.0.0.1:4175/?albumProfile=1`, enter the album, scroll through all chapters, then close it. The console emits `[album-profile]` with frame intervals, long tasks, resource transfers, and renderer object counts. It is an explicit local diagnostic, not remotely collected analytics. Keep the tab foregrounded; background throttling invalidates FPS measurements. Compare repeat visits and increasing memory counts, not only a single warm run.

The local network lab accepts `LAB_PORT`, `LAB_LATENCY_MS`, `LAB_KBPS` (KiB/s **per response**) and `LAB_FAIL_ASSET`. For example on Linux:

```sh
LAB_PORT=4176 LAB_LATENCY_MS=200 LAB_KBPS=512 LAB_FAIL_ASSET=tilt_brush_-_falling.glb node scripts/preview-network.mjs
```

This intentionally fails one model and delays other downloads. It is **not** an exact shared-bandwidth mobile-network emulator. Verify that the album error message appears, the remaining scene works, and closing restores the main page. Stop the lab with Ctrl+C. It is loopback-only and must not be used as a production web server.

## Release checks still required

- Run the container health/header checks on Docker Engine. The development machine's engine was unavailable during authoring; Compose syntax and the app build can be checked without it, but container startup cannot.
- Test cold caches, a real mid-range phone, constrained mobile networking and the public HTTPS host. Local frame times do not predict every GPU or network.
- The first-load R3F/Three/postprocessing JS bundle remains large; the Vite size warning is not suppressed. Further scene/code splitting and model/texture optimization may be needed for your audience.
- Keep attributions. Existing album credits label **Space boi** and **Space Ame Camping** as **CC BY-NC 4.0**. Confirm your intended deployment is permitted or obtain permission/replace them before a commercial launch.

## References used

- [React Three Fiber: scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Three.js: WebGLRenderer / compileAsync](https://threejs.org/docs/pages/WebGLRenderer.html)
- [web.dev: optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [Docker: multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Nginx: gzip compression](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)
