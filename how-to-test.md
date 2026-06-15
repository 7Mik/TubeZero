# TubeVanilla Testing Guide

This guide explains how to test TubeVanilla locally, both for execution speed (benchmarking) and schema accuracy (parity comparison) against Vincent/SuspiciousLookingOwl's `youtubei` library.

---

## 1. Structural Parity Comparison (`compare-tests.mjs`)

Because TubeVanilla aims to map YouTube endpoints accurately while maintaining a strictly lightweight profile, we provide a test script to compare our parsed output directly with `youtubei`. 

This test simultaneously searches for items, fetches videos, and retrieves playlists using both libraries side-by-side to ensure the properties (like IDs, titles, view counts, etc.) map identically.

### How to Run
We have bound this test to the standard npm test command. Run the following:

```bash
npm run test
# OR manually run:
node compare-tests.mjs
```

### Expected Output
The script will output the top-level keys and values for `TubeVanilla` and `youtubei` directly underneath each other. If everything is functioning correctly, the keys and outputs should mirror each other perfectly.

---

## 2. Speed Benchmarking (`benchmark.mjs`)

Because TubeVanilla relies heavily on pure metadata extraction rather than heavy protobuf compilations or signature decryption, it is exceptionally fast. 

We provide a standalone benchmark script to measure the execution latency (`performance.now()`) of raw endpoints like `fetchCommentsFromYouTube` and `fetchSubtitlesFromYouTube`.

### How to Run
You can run the benchmark script directly. By default, it runs against the famous "Rick Roll" video (`dQw4w9WgXcQ`).

```bash
node benchmark.mjs
```

### Testing a Custom Video
If you want to benchmark a specific video ID, you can pass it directly to the script via the `--video` flag or as a raw argument:

```bash
node benchmark.mjs --video "jNQXAC9IVRw"
```

### Expected Output
The script will execute queries sequentially on both libraries and print the execution time in milliseconds (ms) directly to the console. It will also generate a detailed JSON dump inside the `benchmark_results/` folder for in-depth analysis of the raw payload sizes and scraped elements.

---

## 3. In-Browser End-to-End Testing (`browser-test.html`)

TubeVanilla is designed primarily for client-side environments (Manifest V3 extensions, SPAs). We provide an HTML test harness that imports the compiled module (`dist/index.js`) to ensure it executes securely without violating modern CSP constraints or causing CORS issues.

### How to Run
Since the file loads an ES Module, it must be run through a local HTTP server (simply opening the file via `file://` will cause CORS restrictions on the module import).

Run the following command to serve the current directory:

```bash
npx serve -p 3000
```

Once the server is running, open your browser and navigate to:
[http://localhost:3000/browser-test.html](http://localhost:3000/browser-test.html)

### Expected Output
Click the red **Run Client Tests** button. A log interface will appear sequentially verifying:
1. InnerTube Configuration Extraction
2. Search API (`rick roll`)
3. Video Fetch API (`dQw4w9WgXcQ`)
4. Playlist Fetch API (`PLE0hg-LdSfycrpTtMImPSqFLle4yYNzWD`)

All lines should show a green `✅` indicating successful client-side parsing without Node-specific dependencies.
