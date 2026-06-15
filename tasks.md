# Roadmap & Philosophical Alignment: TubeVanilla vs `youtubei`

This document maps out the classes, properties, and interfaces of Vincent/SuspiciousLookingOwl's `youtubei` library, assessing their feasibility in the client-side/extension context of **TubeVanilla**, and outlines an implementation roadmap.

---

## 👁️ The TubeVanilla Philosophy & Core Constraints

Before mapping the API, we must evaluate all features against **TubeVanilla's three core philosophical pillars**:

1. **Zero External Dependencies:** 
   - *Constraint:* No npm packages like `protobufjs`, `node-fetch`, or Node-specific `crypto`.
   - *Impact:* We cannot dynamically compile Protobuf payloads for complex search filters or tokens. We must use **static pre-computed byte buffers / base64 templates** for search option encoding. All crypto operations must run via the native browser **Web Crypto API** (`crypto.subtle`).
2. **Client-Side & Browser-Extension First (CSP Compliant):**
   - *Constraint:* Modern browser environments and Chrome Extension Manifest V3 strictly prohibit dynamic code execution (`eval` or `new Function`).
   - *Impact:* Deciphering streaming signatures (`signatureCipher` / `n-parameter` throttling) requires fetching and dynamically executing YouTube's active player JS bundle (e.g., `base.js`). Because of CSP rules, **deciphering signatures is strictly UNREACHABLE** in a pure MV3 extension without delegating to a remote server. TubeVanilla remains a **metadata-only / read-only scraper**.
3. **Implicit Cookie-Based Auth:**
   - *Constraint:* Access user data seamlessly inside browser extensions or on-domain SPAs.
   - *Impact:* We reject heavy OAuth redirect/token flows in favor of automatically reading the active `SAPISID` cookie and generating the `SAPISIDHASH` header on-the-fly. **Full OAuth state management is flagged as Out-of-Scope / Unnecessary**.

---

## 🚫 Reachability Analysis

### 🟢 Reachable (Fits Philosophy)
* **Metadata Queries & Feeds:** `search()`, `getVideo()`, `getPlaylist()`, `getChannel()`. Highly reachable by sending POST requests to `/youtubei/v1/` endpoints with static JSON payloads and extracting data recursively.
* **Pagination (`Continuable`):** The recursive locator for `continuationToken` allows fetching subsequent pages of videos, comments, and replies without external engines.
* **Captions & Comments:** Standard text extraction from the web-page or `/youtubei/v1/next` endpoints.
* **YouTube Music Client:** Changing request payloads to route through the `WEB_REMIX` client name and `/youtubei/v1/music` endpoints is fully feasible using pure fetch.

### 🔴 Unreachable / Prohibited by Philosophy
* **Video Deciphering & Downloads (`signatureCipher` / Throttling):** Requires dynamic JS execution. **UNREACHABLE** under MV3 CSP rules. TubeVanilla will not support direct stream URL deciphering.
* **OAuth Login / Refresh Flows:** Exposing client secrets and handling redirect endpoints is hostile to client-side SPAs. **UNREACHABLE / AVOIDED**; replaced by implicit cookie extraction.
* **Protobuf Token Builders:** Dynamically building search options using Protobuf compilers is bloated. **PROHIBITED**; replaced by a static dictionary of pre-computed search filter strings.

---

## 📊 Feature & Class Mapping Matrix

### 1. General & Infrastructure
| Class / Interface | Feasibility | TubeVanilla Strategy | Timeline / Sprint |
| :--- | :---: | :--- | :---: |
| **Base** | **High** | Simple class holding the shared client context. | Sprint 1 |
| **Continuable<T>** | **High** | Core abstract class to hold paginated item lists and continuation logic. | Sprint 1 |
| **Client** | **High** | Main client entry point coordinating standard requests. | Sprint 1 |
| **Thumbnails** | **High** | Helper helper to parse and sort thumbnail lists. | Sprint 1 |
| **VideoCompact** | **High** | Data model representing video list items. | Sprint 2 |
| **PlaylistCompact** | **High** | Data model representing playlist list items. | Sprint 2 |
| **BaseChannel** | **High** | Model representing a channel's main details and tabs. | Sprint 2 |
| **BaseVideo** | **High** | Model representing common video metadata. | Sprint 2 |
| **Playlist** | **High** | Model representing playlists and their continuable items. | Sprint 2 |
| **Video** | **High** | Extends `BaseVideo` with local comments and chapters. | Sprint 2 |
| **SearchResult** | **High** | Continuable container for parsed search layouts. | Sprint 2 |
| **Channel** | **High** | Full channel model (adds banners, links, and descriptions). | Sprint 3 |
| **PlaylistVideos** | **High** | Paginated continuation of playlist items. | Sprint 2 |
| **VideoRelated** | **High** | Watch-next related videos pagination. | Sprint 3 |
| **Comment** | **High** | Parsed comments from next pages. | Sprint 3 |
| **Reply** | **High** | Comments replies parsing. | Sprint 3 |
| **VideoComments** | **High** | Paginated continuation of video comments. | Sprint 3 |
| **CommentReplies** | **High** | Paginated continuation of replies. | Sprint 3 |
| **VideoCaptions** | **High** | Caption/Subtitle track selector. | Sprint 3 |
| **Caption** | **High** | Individual caption metadata. | Sprint 3 |
| **CaptionLanguage** | **High** | Language code helper. | Sprint 3 |
| **ChannelVideos** | **High** | Paginated continuation of channel videos. | Sprint 4 |
| **ChannelShorts** | **High** | Paginated continuation of channel shorts. | Sprint 4 |
| **ChannelLive** | **High** | Paginated continuation of channel live streams. | Sprint 4 |
| **ChannelPlaylists** | **High** | Paginated continuation of channel playlists. | Sprint 4 |
| **ChannelPosts** | **Low** | *Low Priority:* Community tab posts. | Sprint 4 |
| **LiveVideo** | **High** | Stream status & live chat container. | Sprint 4 |
| **Chat** | **High** | Fetch-based polling client for chat messages. | Sprint 4 |
| **MixPlaylist** | **Medium** | Mix playlist metadata mapping. | Sprint 4 |
| **OAuth** | 🔴 **Prohibited** | **Out-of-Scope.** Auth is managed exclusively via the cookie-based `SAPISIDHASH` pipeline. | Out-of-Scope |

### 2. YouTube Music Namespace
| Class / Interface | Feasibility | TubeVanilla Strategy | Timeline / Sprint |
| :--- | :---: | :--- | :---: |
| **MusicBase** | **High** | Base class for music entities. | Sprint 5 |
| **MusicClient** | **High** | Child client that targets the `WEB_REMIX` InnerTube endpoints. | Sprint 5 |
| **MusicSearchResult**| **High** | Continuable search results for music. | Sprint 5 |
| **MusicSongCompact** | **High** | Song details layout parser. | Sprint 5 |
| **MusicVideoCompact**| **High** | Video details layout parser. | Sprint 5 |
| **MusicAlbumCompact** | **High** | Album details layout parser. | Sprint 5 |
| **MusicArtistCompact**| **High** | Artist details layout parser. | Sprint 5 |
| **MusicPlaylistCompact**|**High**| Playlist details layout parser. | Sprint 5 |
| **MusicBaseArtist**  | **High** | Artist details layout parser. | Sprint 5 |
| **MusicBaseAlbum**   | **High** | Album details layout parser. | Sprint 5 |
| **MusicBaseChannel** | **High** | Music channel layout parser. | Sprint 5 |
| **MusicLyrics**      | **High** | Fetches lyrics from player browse payloads. | Sprint 5 |

### 3. Interfaces
| Interface Name | Feasibility | Description | Timeline / Sprint |
| :--- | :---: | :--- | :---: |
| **Thumbnail** | **High** | Image object `{ url, width, height }`. | Sprint 1 |
| **MusicMetadata** | **High** | Music video track metadata. | Sprint 2 |
| **Shelf** | **High** | Renders grouped layouts. | Sprint 2 |
| **AuthenticateResponse**| 🔴 **Prohibited** | **Out-of-Scope** (Relates to OAuth). | Out-of-Scope |
| **AuthorizeResponse**| 🔴 **Prohibited** | **Out-of-Scope** (Relates to OAuth). | Out-of-Scope |
| **RefreshResponse** | 🔴 **Prohibited** | **Out-of-Scope** (Relates to OAuth). | Out-of-Scope |

---

## 📅 Proposed Implementation Timeline

### 🏃 Sprint 1: Infrastructure & Core Client (Target: Week 1)
* [x] Create **`Base`** class to inject the Client context.
* [x] Implement **`Continuable<T>`** abstraction.
* [x] Implement core **`Client`** class using Web Crypto API.
* [x] Implement **`Thumbnail`** / **`Thumbnails`** handlers.

### 🏃 Sprint 2: Video, Channel, & Playlist Foundations (Target: Week 2)
* [x] Implement search parsing into **`SearchResult`** using **static base64 filter strings** instead of dynamic Protobuf builders.
* [x] Implement **`Client.getVideo()`** returning **`Video`** (without deciphering signatures).
* [x] Implement **`Client.getPlaylist()`** returning **`Playlist`** with **`PlaylistVideos`**.

### 🏃 Sprint 3: Comments, Captions, and Watch-Next (Target: Week 3)
* [ ] Implement watch page connections: **`VideoRelated`** and **`VideoCaptions`**.
* [ ] Implement **`VideoComments`** and **`CommentReplies`** using our light heuristic JSON scanner.

### 🏃 Sprint 4: Channel Tabs, Live streams & Live Chat (Target: Week 4)
* [ ] Extend channel queries into **`Channel`** (banners, about section).
* [ ] Implement tab continuation lists (**`ChannelVideos`**, **`ChannelShorts`**, **`ChannelLive`**, **`ChannelPlaylists`**).
* [ ] Implement live stream support (**`LiveVideo`** and a fetch-based poll loop for **`Chat`**).

### 🏃 Sprint 5: YouTube Music Client (Target: Week 5)
* [ ] Implement **`MusicClient`** (using the `WEB_REMIX` payload headers).
* [ ] Implement YouTube Music objects: **`MusicSearchResult`**, **`MusicSongCompact`**, **`MusicAlbumCompact`**, **`MusicLyrics`**.
