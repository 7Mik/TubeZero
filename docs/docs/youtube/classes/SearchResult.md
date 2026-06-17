# Class: SearchResult

Represents the continuable search results container returned from `client.search(...)`.

## Hierarchy

*   `Base`
    *   `Continuable<VideoCompact | PlaylistCompact | ChannelCompact>`
        *   **`SearchResult`**

## Properties

### `items: (VideoCompact | PlaylistCompact | ChannelCompact)[]`
A list of all loaded search items.

### `continuation: string | null`
The continuation token for fetching the next page of search results.

## Methods

### `next(count?: number): Promise<(VideoCompact | PlaylistCompact | ChannelCompact)[]>`

Fetches the next batch of search items.

*   **Parameters:**
    *   `count`: `number` (optional) - Number of items to retrieve. If not supplied, fetches the next single page of results. If set to `0`, loops until no further items are available.
*   **Returns:** `Promise<(VideoCompact | PlaylistCompact | ChannelCompact)[]>`

## Compact Result Item Models

### `VideoCompact`
Represents a video in search results.
*   `id`: string
*   `title`: string
*   `thumbnails`: Thumbnails
*   `duration`: number | null
*   `isLive`: boolean
*   `channel`: ChannelInfo (id, name, thumbnails)
*   `viewCount`: number | null
*   `publishedAt`: string | null

### `PlaylistCompact`
Represents a playlist in search results.
*   `id`: string
*   `title`: string
*   `thumbnails`: Thumbnails
*   `videoCount`: number
*   `channel`: ChannelInfo (id, name, thumbnails)

### `ChannelCompact`
Represents a channel in search results.
*   `id`: string
*   `name`: string
*   `thumbnails`: Thumbnails
*   `subscriberCount`: string | null
