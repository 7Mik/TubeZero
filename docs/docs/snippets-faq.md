---
id: snippets-faq
title: Snippets & FAQ
sidebar_label: Snippets & FAQ
slug: /snippets-faq
---

This page contains code snippets and frequently asked questions for `TubeZero`.

---

### How to search for a video?

```javascript
const videos = await youtube.search("Keyword", {
    type: "video",
});

console.log(videos.items);
```

### How to get search results from next page (pagination)?

```javascript
const videos = await youtube.search("Keyword", {
    type: "video",
});

console.log(videos.items); // First page items

// Fetch next page
const nextVideos = await videos.next();
console.log(nextVideos); // Second page items
console.log(videos.items); // Combined first and second page items
```

### How to get all videos in a playlist?

```javascript
const playlist = await youtube.getPlaylist(PLAYLIST_ID);

// Load pages until none are left
while (playlist.videos.hasMore) {
    await playlist.videos.next();
}

console.log(playlist.videos.items); // All videos in the playlist
```

### How to get a video's comments?

```javascript
const video = await youtube.getVideo(VIDEO_ID);

// Load the first page of comments
const comments = await video.comments.next();
console.log(comments);

// Load comments recursively (e.g. 50 comments)
const extraComments = await video.comments.next(50);
console.log(extraComments);
```

> **Note:** Fetching comment replies is currently unsupported by the YouTube InnerTube API parsing in TubeZero. The `.replies` property is present but will not fetch actual replies due to missing continuation payload logic.

### Does it work in browser extensions (Manifest V3)?

Yes! TubeZero is built with zero external dependencies and doesn't use `eval` or dynamic script tags. It executes standard requests using the native browser `fetch` API, making it fully compliant with strict Content Security Policies (CSP) in browser extensions.
