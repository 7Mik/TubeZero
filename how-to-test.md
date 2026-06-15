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
