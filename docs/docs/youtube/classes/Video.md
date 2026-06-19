# Class: Video

Represents a YouTube Video returned from `client.getVideo(videoId)`.

## Hierarchy

*   `BaseVideo`
    *   **`Video`**

## Properties

### `id: string`
The video ID.

### `title: string`
The title of the video.

### `description: string`
The description of the video.

### `thumbnails: Thumbnails`
Thumbnails of the video. Inherits from `Array<Thumbnail>`.

### `viewCount: number | null`
Total views of the video (null if hidden).

### `uploadDate: string | null`
Literal string of the upload date (e.g. `"Oct 24, 2009"`).

### `duration: number`
Length of the video in seconds.

### `channel: BaseChannel | null`
The channel that uploaded the video.

### `likeCount: number | null`
Total likes (null if hidden).

### `tags: string[]`
List of video tags/hashtags.

### `isLiveContent: boolean`
Whether the video is a live stream or was recorded live.

### `streamingData: StreamingData | undefined`
Contains formats and adaptive format streams for playback.

### `related: VideoRelated`
A continuable list of related videos and playlists. Inherits from `Continuable<VideoCompact | PlaylistCompact>`.

### `comments: VideoComments`
A continuable list of comments. Inherits from `Continuable<Comment>`.

### `captions: VideoCaptions | null`
VideoCaptions helper class to extract subtitles/transcripts.

### `upNext: VideoCompact | PlaylistCompact | null`
The video to play next after this one. Alias to `related.items[0]`.

### `chapters: Chapter[]`
Video chapters list containing title, start (in milliseconds), and thumbnails.

### `music: MusicMetadata | null`
Structured music metadata block if the video contains recognized music tracks.

## Example

```javascript
const video = await youtube.getVideo("dQw4w9WgXcQ");

console.log(video.title); // "Rick Astley - Never Gonna Give You Up"
console.log(video.duration); // 213

// Load comments
const firstBatch = await video.comments.next(10);
console.log(firstBatch.length);
```
