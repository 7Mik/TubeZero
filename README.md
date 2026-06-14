# TubeZero

A modular collection of JavaScript functions designed to scrape and reverse-engineer data from YouTube using its private internal API (**InnerTube**). This library is built to be ultra-lightweight, free of heavy external dependencies, and optimized for client-side environments (such as browser extensions or desktop applications).

---

## ⚖️ Comparison with Other Libraries

To ensure complete transparency, here is a comparison between **TubeZero** and the other main InnerTube libraries available on GitHub:

| Feature/Property | **TubeZero** (This Project) | **LuanRT/YouTube.js** (youtubei.js) | **SuspiciousLookingOwl/youtubei** |
| :--- | :--- | :--- | :--- |
| **Architecture** | Lite, pure fetch client, zero external dependencies | Full-featured monolithic SDK mapping almost all renderers | Object-oriented TypeScript query client |
| **Optimization** | Client-side & Web-Extension optimized | Heavy backend/server-side oriented | Node.js oriented with class-based queries |
| **License** | PolyForm Small Business License 1.0.0 | MIT License | MIT License |
| **Pros & Use Cases** | Extremely lightweight, fast, no compilation required. Native extraction of `SAPISID` and `SAPISIDHASH` via Web Crypto API for authenticated requests. | Complete coverage of features (deciphering video download signatures, live chat, dedicated interfaces for Music/Studio/Kids). | Class-based abstractions, clean TypeScript interface for querying videos, channels, and playlists. |
| **Limitations** | Lacks video download deciphering, full catalog of renderer schemas, and dedicated YT Music/Studio/Kids interfaces. | Large bundle size, complex codebase, requires polyfills/build tools to run in client/extension frontends. | Requires compilation, coupled with Node.js dependencies, not designed for direct client-side integration. |

---

## ⚠️ Important Note on CORS and Cookies

When this library is executed in a standard browser environment (e.g., on a standard website like `myapp.com`), requests to `youtube.com/youtubei` will be blocked due to browser **CORS** policies.

### Recommended Execution Environments:
1. **Browser Extensions:** Optimal. By granting host permissions for `https://*.youtube.com/*` in `manifest.json`, the extension bypasses CORS and can read session cookies directly to compute the `SAPISIDHASH` for authenticated requests.
2. **Desktop & Mobile Applications (Electron, Tauri, React Native):** By controlling HTTP headers and disabling CORS, these applications can run the library natively.
3. **Server-side Environments (Node.js) with a CORS Proxy:** Requests can be routed through a reverse proxy that removes header restrictions.

---

## 📦 Installation (Package Structure)

To prepare the package for local usage or NPM publishing:

```bash
# Initialize the package if exported into a dedicated folder
npm init -y
```

Add `"type": "module"` in your `package.json` to enable loading of ES modules.

---

## 💻 Usage Examples

### 1. Initialization and Fetching Taste Data (History and Likes)
Retrieve the logged-in user's viewing history, liked videos, "Watch Later" list, or custom playlists.

```javascript
import { scrapeTasteData } from './index.js';

// When run in a browser extension, SAPISID cookies are read automatically
const userFeeds = await scrapeTasteData(null, [
    { url: "https://www.youtube.com/playlist?list=PLtbcYJeD7QZ34kS_L8H-lV7J8xT6rU0k_" } // Optional custom playlist
]);

console.log("History:", userFeeds.historyEntries);
console.log("Likes:", userFeeds.likesEntries);
console.log("Watch Later:", userFeeds.wlEntries);
console.log("Custom Playlists:", userFeeds.customPlaylistsData);
```

### 2. Fetching Video Comments
Retrieve comments for a specific video with automatic pagination.

```javascript
import { fetchCommentsFromYouTube } from './index.js';

const videoId = "dQw4w9WgXcQ";
const maxComments = 100;

const comments = await fetchCommentsFromYouTube(videoId, maxComments);
comments.forEach(c => {
    console.log(`[${c.author}] (${c.likeCount} likes): ${c.text}`);
});
```

### 3. Fetching Subtitles (Transcripts)
Download and parse video transcripts in the desired language with automatic fallbacks.

```javascript
import { fetchSubtitlesFromYouTube } from './index.js';

const videoId = "dQw4w9WgXcQ";
const transcript = await fetchSubtitlesFromYouTube(videoId, "en"); // Searches for English, falls back to automatic captions or first available track

transcript.forEach(segment => {
    console.log(`[${segment.start}s - ${segment.duration}s]: ${segment.text}`);
});
```

---

## ⚖️ License: PolyForm Small Business License 1.0.0

This software is released under the **PolyForm Small Business License 1.0.0**.

### What does this mean?
* **Free Use:** Individuals and **small businesses** (defined as companies with fewer than **250 employees** and less than **$10,000,000 USD** in annual revenue, including affiliates) can use, copy, modify, and distribute the software for free.
* **Commercial Restrictions for Large Enterprises:** Companies exceeding the above thresholds (more than 250 employees or over $10M USD in revenue) cannot use this package for commercial purposes without securing a separate commercial license from the copyright holder.
* *Note:* This license protects reverse-engineering efforts from being incorporated into enterprise products by large corporations for free, while remaining free for the community, indie developers, and startups.

---

## 🛡️ Legal Disclaimer

*This tool is intended solely for educational, research, and study purposes regarding third-party web architectures. It is not associated, affiliated, sponsored, or endorsed by Google LLC or YouTube. The user assumes full civil and administrative liability arising from the use of these functions and any potential violation of YouTube's Terms of Service. The authors are not responsible for IP blocks, account bans, or other actions taken by YouTube as a result of using this library.*
