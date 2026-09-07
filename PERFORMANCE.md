# Album verification — 7 September 2026

## Scroll hot-path follow-up — 8 September 2026

- Removed the hidden Work scene's whole-store scroll subscription. Its timeline now reads transient progress in the frame loop.
- Work line buffers and timeline text remain mounted; `instanceCount` reveals existing line segments instead of rebuilding `LineGeometry` every scroll update. Removed the 10 ms React-state interval for the dashed line.
- Album chapter opacity now uses scoped DOM subscriptions; React only reconciles when chapter/selection/control state changes. Invisible chapter controls are inert.
- The campsite mount is latched for a visit, so reverse scrolling across 0.58 does not dispose and reconstruct its resources.
- Invisible photos skip camera-space math; non-focused photos no longer calculate focus destinations or camera-facing quaternions. The hidden focus veil also skips that work.
- Outer scroll damping changed from 0.1 to 0.3 and max speed from 2 to 1, preserving the camera path but softening rapid input.
- Removed unchanged scroll-store writes and per-frame vector allocation in the door text animation.

Verification: lint, TypeScript/production build, camera/exit/asset checks passed. Browser checks covered the outer gateway, Work text and line reveal, Album forward/backward chapters, and returns to the main scene; no console errors appeared. These checks validate behavior, not a new FPS benchmark. The numeric measurements below are from the earlier build and should not be attributed to this follow-up.

## Scope

Kept the existing three portal shapes, layouts, artwork and camera path. Restored the original individually sliding `EXPERIENCE` letters. Album entrance and return now take 2 seconds (0.25 seconds with reduced motion); the full-screen composer only takes over once entry is complete. Touch/wheel input cannot race the entrance. Exit still retains the outgoing scene until the camera and portal blend finish.

Model programs are warmed with `compileAsync` using the actual portal lights before first visible draw. Late arrival fades in instead of popping. The 8.76 MB campsite is requested near its chapter, not in the initial story burst. Optional asset errors are contained in album boundaries so they cannot tear down the root canvas.

## Local production-build samples

Browser viewport: 1280 × 720, foreground in-app Chromium, same machine. Local HTTP serves production `dist`, no-store caching and gzip. Sample covers entry, freefall, archive and exit. No production analytics are collected.

| Measurement | Before model shader warm-up | Follow-up run |
| --- | ---: | ---: |
| Sample length | 31.3 s | 43.5 s |
| Median frame interval | 6.9 ms | 6.9 ms |
| p95 frame interval | 7.2 ms | 7.1 ms |
| Worst frame interval | 426.4 ms | 82.6 ms |
| Frames over 50 ms | 9 | 4 |
| Long tasks | 9 | 3 |
| Sum of long-task duration above 50 ms | 1,635 ms | 65 ms |
| Textures after exit | 56 | 56 |
| Geometries after exit | 119 | 119 |

These are frame-interval/Long Tasks API samples, **not a Lighthouse score or Core Web Vitals measurement**. Reloads requested the story assets again, but GPU/driver caches can survive navigation; this is not a fully cold-GPU controlled benchmark. The remaining 83 ms spike still warrants testing on lower-powered hardware. A background-throttled earlier run was discarded. Equal resource counts across these two fresh-page runs are not proof of leak freedom over repeated opens.

## Network payload

Original GLBs remain unchanged. Build-time gzip is byte-for-byte lossless after decoding:

| Story asset | Original | Gzip |
| --- | ---: | ---: |
| Space boi | 3.14 MB | 1.40 MB |
| Vortex | 1.30 MB | 1.03 MB |
| Campsite | 8.76 MB | 4.85 MB |
| Falling couple | 13.49 MB | 4.76 MB |
| Total | 26.70 MB | 12.04 MB |

That is a 55% transfer reduction. Compression does not reduce decoded GPU memory or triangle count. A slow connection still needs time for these large models; deferral, cache revalidation, readable failure state and an always-available close button mitigate that, not eliminate it.

## Automated verification

- ESLint and TypeScript/Vite production build pass.
- 10,001 continuous camera-path samples, rear-view direction, six GLBs and external texture references pass.
- All three portal exit state lifecycles and 1,001 interpolated return samples pass, including exact FOV/orientation restoration.
- Signature loader readiness, progress bounds and all eight local images pass.
- Production compression round-trip and asset-serving/configuration invariants pass.
- `docker compose config --quiet` passes. Docker Engine is not running locally, so image build, Nginx syntax/startup, health and actual Nginx response headers remain unverified here.

## Network-failure / responsive check

Tested at a 390 × 844 CSS viewport (desktop browser resized, **not physical phone hardware**) with the production lab configured for 200 ms request latency, 512 KiB/s per response and a deliberate HTTP 503 for the falling-couple model. The model error was contained; the archive button still reached the photo gallery. Closing completed in approximately two seconds, restored focus to the outer scroll owner and left zero inert elements. The restored title was nudged down on mobile to avoid the availability badge. The model error is expected in this fault-injection run, not a clean-network console regression.

## Remaining release work

The main JS chunk remains approximately 1.45 MB / 430 KB gzip and still triggers Vite's size warning. Test a deployed HTTPS site on physical mobile hardware and genuinely constrained bandwidth. Verify license permissions for the two models currently credited as non-commercial. See [deployment instructions](DEPLOYMENT.md) for commands, network fault simulation and primary-source references.
