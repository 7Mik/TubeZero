# Class: Channel

Represents a YouTube Channel returned from `client.getChannel(channelId)`.

## Hierarchy

*   `Base`
    *   `BaseChannel`
        *   **`Channel`**

## Properties

### `id: string`
The channel ID.

### `name: string`
The channel name.

### `handle: string | undefined`
The channel handle (e.g. `"@RickAstleyYT"`).

### `description: string | undefined`
The channel description text.

### `thumbnails?: Thumbnails`
The channel profile avatar thumbnails. Inherits from `Array<Thumbnail>`.

### `subscriberCount: string | undefined`
A literal string representing the subscriber count (e.g. `"4.51M subscribers"`).

### `videoCount: string | undefined`
A literal string representing the total video count (e.g. `"422 videos"`).

### `banner: Thumbnails`
Channel banner thumbnails. Inherits from `Array<Thumbnail>`.

### `mobileBanner: Thumbnails`
Mobile channel banner thumbnails.

### `tvBanner: Thumbnails`
TV channel banner thumbnails.

### `shelves: ChannelShelf[]`
Grouped content shelf elements on the channel home page.
*   `title`: Shelf title.
*   `subtitle`: Shelf subtitle (optional).
*   `items`: List of compact grid renderers.

### `videos: ChannelVideos`
Continuable tab list of channel videos. Inherits from `Continuable<VideoCompact>`.

### `shorts: ChannelShorts`
Continuable tab list of channel shorts. Inherits from `Continuable<VideoCompact>`.

### `live: ChannelLive`
Continuable tab list of channel livestreams. Inherits from `Continuable<VideoCompact>`.

### `playlists: ChannelPlaylists`
Continuable tab list of channel playlists. Inherits from `Continuable<PlaylistCompact>`.

### `posts: ChannelPosts`
Continuable tab list of community posts.

## Example

```javascript
const channel = await youtube.getChannel("UCuAXFkgsw1L7xaCfnd5JJOw");

console.log(channel.name); // "Rick Astley"
console.log(channel.subscriberCount); // "4.51M subscribers"

// Fetch first 10 channel videos
const firstVideos = await channel.videos.next(10);
console.log(firstVideos[0].title);
```
