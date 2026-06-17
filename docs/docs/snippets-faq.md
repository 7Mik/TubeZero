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

// Pass 0 to next() to load all continuation pages until none are left
await playlist.videos.next(0);

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

### How to get replies for a comment?

```javascript
const comments = await video.comments.next(5);
const comment = comments[0];

if (comment && comment.replyCount > 0) {
    const replies = await comment.replies.next();
    console.log(replies);
}
```

### Does it work in browser extensions (Manifest V3)?

Yes! TubeZero is built with zero external dependencies and doesn't use `eval` or dynamic script tags. It executes standard requests using the native browser `fetch` API, making it fully compliant with strict Content Security Policies (CSP) in browser extensions.
