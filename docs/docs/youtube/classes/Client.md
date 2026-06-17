# Class: Client

The main entry point to make requests to the YouTube InnerTube API.

## Constructor

### `new Client(options?: ClientOptions)`

#### Parameters

*   `options`: `ClientOptions` (optional)
    *   `apiKey`: Custom YouTube API key (optional).
    *   `clientVersion`: Custom InnerTube client version string (optional).
    *   `cookie`: Pre-configured raw cookie string for authorized requests (optional).
    *   `fetch`: Custom fetch function (e.g. for proxy routing or Node environment polyfills) (optional).

## Methods

### `search(query: string, options?: SearchOptions)`

Searches for videos, playlists, or channels.

*   **Parameters:**
    *   `query`: `string` - The search query term.
    *   `options`: `{ type?: 'video' | 'playlist' | 'channel' | 'all' }` (optional) - Type filter.
*   **Returns:** `Promise<SearchResult>`

---

### `findOne(query: string, options?: SearchOptions)`

Searches and returns the very first item match.

*   **Parameters:**
    *   `query`: `string` - The search query term.
    *   `options`: `{ type?: 'video' | 'playlist' | 'channel' | 'all' }` (optional) - Type filter.
*   **Returns:** `Promise<VideoCompact | PlaylistCompact | ChannelCompact | undefined>`

---

### `getVideo(videoId: string)`

Fetches metadata, formats, streaming playback data, and comment continuation token for a video.

*   **Parameters:**
    *   `videoId`: `string` - The video ID or full video watch URL.
*   **Returns:** `Promise<Video | LiveVideo>` (returns a `LiveVideo` object if the video is currently live, otherwise `Video`).

---

### `getPlaylist(playlistId: string)`

Fetches playlist metadata and its first batch of videos.

*   **Parameters:**
    *   `playlistId`: `string` - The playlist ID or URL.
*   **Returns:** `Promise<Playlist | MixPlaylist>` (returns a `MixPlaylist` if it is a mix playlist starting with `RD`, otherwise `Playlist`).

---

### `getChannel(channelId: string)`

Fetches channel page metadata, banner images, shelves, and lists of tabs.

*   **Parameters:**
    *   `channelId`: `string` - The channel ID starting with `UC`.
*   **Returns:** `Promise<Channel | undefined>`

---

### `getVideoTranscript(videoId: string, languageCode?: string)`

Fetches transcript subtitle segments for a video in a specific language.

*   **Parameters:**
    *   `videoId`: `string` - The video ID.
    *   `languageCode`: `string` (optional) - The language code (e.g. `"en"`). Defaults to `"en"`.
*   **Returns:** `Promise<Caption[] | undefined>`
