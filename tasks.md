# Feature Mapping: YouTubei vs TubeZero

This document provides an overview of the capabilities of YouTube's internal API (InnerTube), comparing the features covered by **TubeZero** against a full-scale SDK implementation (such as LuanRT's `youtubei.js`).

---

## 📊 Summary Statistics

* **Implemented Features:** **6** (History, Likes, Watch Later, Playlists, Comments, Subtitles)
* **Missing Features (Replicable):** **6** (Search, Home/Trending Feeds, Subscriptions Feed, Video Details, Search Suggestions, Live Chat)
* **Critical / Non-Replicable Features (Requires Extension or Proxy/Backend):** **4** (Write Actions like Like/Subscribe, Advanced Session Management, Video Downloads/Direct Streaming, Creator Studio)

---

## 🔍 Feature Breakdown

### 1. User Library & Feeds
| Feature | Status | Details / Notes |
| :--- | :---: | :--- |
| **Watch History** | **Implemented** | Uses the `FEhistory` endpoint with HTML scraping fallback. Supports pagination. |
| **Liked Videos (Likes)** | **Implemented** | Uses the `VLLL` endpoint with HTML scraping fallback (`list=LL`). |
| **Watch Later** | **Implemented** | Uses the `VLWL` endpoint with HTML scraping fallback (`list=WL`). |
| **Custom Playlists** | **Implemented** | Uses the `VL<id>` endpoint with HTML scraping fallback (`list=<id>`). |
| **Subscriptions Feed** | Missing | Replicable using the `FEsubscriptions` endpoint (requires valid session cookies). |
| **Home / Recommendations Feed** | Missing | Replicable using the `FEwhat_to_watch` endpoint. |
| **Trending Feed** | Missing | Replicable using the `FEtrending` endpoint. |

### 2. Video Details & Subtitles (Video & Media)
| Feature | Status | Details / Notes |
| :--- | :---: | :--- |
| **Subtitles Extraction** | **Implemented** | Track extraction from `playerCaptionsTracklistRenderer`, XML/JSON download, and regex-based parsing. |
| **Video Details (Metadata, Views, Desc.)** | Partial | Partially extracted from `ytInitialPlayerResponse` during subtitle retrieval. |
| **Related / Suggested Videos** | Missing | Replicable by parsing the `watchNextResults` nodes in `ytInitialData`. |
| **Video Download / Stream Decryption** | **Not Feasible (Frontend)** | Requires deciphering video stream signatures (`signatureCipher`) and loading binary streams, which is blocked by browser CORS and security policies. |

### 3. Comments & Community
| Feature | Status | Details / Notes |
| :--- | :---: | :--- |
| **Comments Retrieval** | **Implemented** | Initial token extraction and pagination via `youtubei/v1/next` (parsing `commentEntityPayload` nodes). |
| **Comment Replies** | Missing | Replicable by paginating with reply-specific tokens (`commentThreadRenderer`). |
| **Interaction (Posting comments, liking)** | **Critical / Non-Replicable** | Requires authorization tokens and active cookies. Feasible in browser extensions, but blocked by CORS in standard web applications. |

### 4. Search
| Feature | Status | Details / Notes |
| :--- | :---: | :--- |
| **Search (Videos, Playlists, Channels)** | Missing | Replicable by sending POST requests to `youtubei/v1/search` with a `query` parameter. |
| **Search Autocomplete** | Missing | Replicable via the public JSON autocomplete endpoint. |

### 5. Write Actions & Authentication
| Feature | Status | Details / Notes |
| :--- | :---: | :--- |
| **Subscribe to Channel** | **Non-Replicable** | Requires POST to `subscription/subscribe` with `HttpOnly` cookies and security headers (CORS blocks external domains). |
| **Like / Dislike Video** | **Non-Replicable** | Requires POST to `like/like` with valid cookies. Subject to same security restrictions. |
| **Playlist Management (Create, Add, Remove)** | **Non-Replicable** | Requires InnerTube endpoints `playlist/create` or `browse/edit`. |

---

## 🛡️ Analysis of Pure Frontend Limitations (No Backend, No Extension)

If **TubeZero** is used in a standard **Single Page Application (SPA)** without backend helper servers:
1. **CORS:** YouTube rejects requests from unauthorized origins. All requests to `youtube.com/youtubei/...` will fail.
2. **Session Cookies (`HttpOnly`):** To access private feeds (history, likes), the library relies on browser cookies. However, if the application runs on a different domain (e.g., `myapp.com`), it cannot access `youtube.com` cookies due to `SameSite` and `HttpOnly` security constraints.

### Bypassing These Limits:
* **Browser Extension:** Running the library inside a browser extension eliminates CORS issues, and the extension can access YouTube's authentication cookies via the Chrome APIs or by reading page headers directly.
* **CORS Proxy:** Routing calls through a reverse proxy to strip Origin headers.

---

## 🛑 Missing Features to Achieve Full Parity with YouTube.js and youtubei

To reach feature parity with comprehensive SDKs like LuanRT/YouTube.js or SuspiciousLookingOwl/youtubei, **TubeZero** would need to implement the following features:

1. **Video Download & Signature Deciphering:**
   - **What's Missing:** Extracting the player JavaScript bundle (e.g., `base.js`), parsing and deciphering signature encryption algorithms (`signatureCipher` / `n-parameter` throttling), and combining audio/video streams.
   - **Status in TubeZero:** Currently unsupported. Implementing this requires JS execution sandbox capabilities (difficult in pure extension content scripts/pure fetch environments without overhead).

2. **Full Catalog of Renderer Mappings:**
   - **What's Missing:** A unified and complete parser schema for all InnerTube renderer layout models (e.g., `compactVideoRenderer`, `gridVideoRenderer`, `shelfRenderer`, `messageRenderer`, etc.).
   - **Status in TubeZero:** Uses heuristic recursive scans (`extractVideoEntries`) which capture main feeds but miss complex nested layouts and edge-case cards.

3. **Dedicated Client Interfaces (YT Music, YT Kids, YT Studio):**
   - **What's Missing:** Specific headers, clients, and payload schemas designed to communicate with YouTube Music (`/youtubei/v1/music`), YouTube Kids, and YouTube Creator Studio endpoints.
   - **Status in TubeZero:** Standard main-client YouTube Web/Mobile requests only.

4. **Interaction & Subscription Mutations (Write Actions):**
   - **What's Missing:** Dedicated functions for write mutations, including:
     - Subscribing/unsubscribing to channels (`subscription/subscribe` and `subscription/unsubscribe`).
     - Liking, disliking, or removing reactions from videos (`like/like`, `like/dislike`, `like/removelike`).
     - Liking or replying to comments (`comment/perform_comment_action`).
   - **Status in TubeZero:** Read-only operations only.

5. **Playlist Mutations:**
   - **What's Missing:** Adding/removing items from playlists, reordering tracks, and creating new playlists via the `playlist/create` and `browse/edit` endpoints.
   - **Status in TubeZero:** Read-only playlist data extraction.

6. **Live Chat Support:**
   - **What's Missing:** An active polling client or Server-Sent Events (SSE) consumer for `live_chat/get_live_chat` endpoints to stream chat messages in real-time.
   - **Status in TubeZero:** Unsupported.
