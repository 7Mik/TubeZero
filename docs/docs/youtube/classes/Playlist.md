# Class: Playlist

Represents a YouTube Playlist returned from `client.getPlaylist(playlistId)`.

## Hierarchy

*   `Base`
    *   **`Playlist`**

## Properties

### `id: string`
The playlist ID.

### `title: string`
The title of the playlist.

### `videoCount: number`
Total videos inside this playlist.

### `viewCount: number`
Total views of this playlist.

### `channel: ChannelInfo | undefined`
The playlist creator channel.
*   `id`: Channel ID (optional).
*   `name`: Channel name string.

### `videos: PlaylistVideos`
A continuable list of videos inside this playlist. Inherits from `Continuable<VideoCompact>`.

## Example

```javascript
const playlist = await youtube.getPlaylist("PLE0hg-LdSfycrpTtMImPSqFLle4yYNzWD");

console.log(playlist.title); // "'Never Gonna Give You Up' Rick Astley Playlist"
console.log(playlist.videoCount); // 60

// Fetch all videos
await playlist.videos.next(0);
console.log(playlist.videos.items.length); // 60
```
