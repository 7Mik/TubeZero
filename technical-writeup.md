# Technical Writeup: Reverse Engineering YouTube's InnerTube

This document details the technical mechanisms used to interface with **InnerTube**, the private and unified API that YouTube uses to power its official clients (Web, Mobile, Smart TV). 

Under the hood, **TubeZero** is designed with a fully typed, **strict TypeScript architecture** (`"strict": true` configuration in `tsconfig.json`). This ensures runtime safety, robust JSON parsing, and compile-time type validation when dealing with YouTube's dynamically structured, nested payloads.

---

## 1. What is InnerTube?

InnerTube is the central endpoint (`https://www.youtube.com/youtubei/v1/`) introduced by Google to consolidate all public and private YouTube APIs. Almost all actions (searching, playing, fetching feeds, posting comments, managing playlists) route through this single portal. 

Compared to Google Cloud's public API (v3), InnerTube:
* **No Daily Quota Limits:** It does not enforce restrictive daily rate limits.
* **No Developer Account Required:** It operates without requiring API key registrations.
* **Raw Rendered Layouts:** It returns structured layout data exactly as rendered to the end user (including modern dynamic modules like Shorts).

---

## 2. Authentication and Security: The `SAPISIDHASH` Mechanism

When a user logs in to YouTube in their browser, several session cookies are set. To perform authenticated requests (such as accessing watch history or the "Liked Videos" playlist), InnerTube requires a cryptographic signature called **`SAPISIDHASH`**.

### How is `SAPISIDHASH` calculated?

1. **Cookie Retrieval:** The library reads one of the following encrypted cookies: `__Secure-3PAPISID`, `__Secure-1PAPISID`, or `SAPISID`.
2. **Timestamp Computation:** Get the current UNIX epoch in seconds:
   $$\text{timestamp} = \lfloor \text{Date.now()} / 1000 \rfloor$$
3. **Input String Composition:** Concatenate the timestamp, the `SAPISID` cookie value, and the request origin (typically `https://www.youtube.com`):
   $$\text{input} = \text{timestamp} + " " + \text{sapisid} + " " + \text{origin}$$
4. **SHA-1 Hashing:** Calculate the SHA-1 hash of the input string in hexadecimal format.
5. **Header Generation:** The final `Authorization` HTTP header is formatted as:
   $$\text{Authorization} = \text{SAPISIDHASH } + \text{timestamp} + \text{"_"} + \text{SHA1(input)}$$

Without this header, InnerTube will reject requests to `/browse` for the user's private feeds, returning a `401 Unauthorized` error.

---

## 3. Dynamic Pagination: Continuation Tokens

YouTube does not use traditional page numbers (like `?page=2`). Instead, it implements pagination based on **Continuation Tokens**.

Every InnerTube response includes a deeply nested JSON object called `continuationCommand` that contains a `token`:
```json
{
  "continuationCommand": {
    "token": "4gINGgtGRWhpc3Rvcnk..."
  }
}
```

### Pagination Flow:
1. Send the initial request (e.g., specifying `browseId: 'FEhistory'`).
2. The library scans the response body recursively (via the `findContinuationToken` function) to locate the continuation token.
3. The subsequent request is sent to `/browse` (or `/next`) by passing the token in the request body (`body.continuation = token`) instead of the `browseId`.
4. The loop continues until no more tokens are found or the desired item count is reached.

---

## 4. Information Extraction (Layout Parsing)

InnerTube is designed to send layout-rendering nodes (JSON layouts) rather than raw, clean data. Since these layouts change frequently, **TubeZero** uses a **strict TypeScript type system** to safely assert properties on unpredictably typed fields and catch potential runtime exceptions during layout traversal.

### Video Extraction (Feeds & Playlists)
The `extractVideoEntries` function performs a recursive scan on the response JSON tree to identify two main patterns:
1. **Legacy Schema (Shorts and older items):** Looks for objects containing `videoId` and `title` (formatted as `runs` or `simpleText`) and attempts to locate the author via `longBylineText`, `shortBylineText`, or `ownerText`.
2. **Modern Schema (Lockup View Model):** YouTube is migrating to `lockupViewModel` components. For these, we search for `lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO"`, extracting the title from `lockupMetadataViewModel.title.content` and the channel name from `metadataRows[0].metadataParts[0].text.content`.

### Comment Extraction
By sending a POST request to `youtubei/v1/next`, we retrieve the comments section.
Unlike standard flat list renderers, comments are managed through reactive entity updates (`frameworkUpdates.entityBatchUpdate.mutations`). Each mutation contains a `payload.commentEntityPayload` from which we extract:
* **Comment Text:** Obtained by joining the nodes in the `contentText.runs` array to preserve links and styling.
* **Author Name:** Read from `authorText.simpleText`.
* **Like Count:** Extracted from `voteCount.simpleText` and stripped of non-numeric characters.
* **Publication Time:** Extracted from `publishedTimeText.simpleText`.

### Subtitles / Captions Extraction
To extract subtitles without external APIs:
1. **Retrieve Video HTML:** We fetch `https://www.youtube.com/watch?v=${videoId}`, bypassing potential age restrictions using the `bpctr` parameter.
2. **Parse Caption Tracks:** We locate the global JavaScript variable `ytInitialPlayerResponse` or `window["ytInitialPlayerResponse"]` within the HTML.
3. **Track Selection:** We inspect the `captions.playerCaptionsTracklistRenderer.captionTracks` array. Each track contains a `baseUrl`. We select the track matching the requested language (prioritizing manual captions over automatically generated `asr` captions).
4. **Download and XML/JSON Parsing:** We perform a GET request on the `baseUrl` and use a regular-expression-based parser (`parseXmlTranscriptRegex`) to map `<text start="X" dur="Y">Text</text>` tags to a clean array of `{ start, duration, text }` objects.
