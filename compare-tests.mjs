import { Client as TubeClient } from './dist/index.js';
import { Client as YiClient } from 'youtubei';

const ytYi = new YiClient();
const tubeVanilla = new TubeClient();

const VIDEO_ID = 'dQw4w9WgXcQ';
const PLAYLIST_ID = 'PLlaN_N0C4kBUh6j3vHh2Y7vC3P2UIn_Xp'; // Random small playlist
const SEARCH_QUERY = 'never gonna give you up';

async function runComparisons() {
    console.log("=== TUBE VANILLA VS YOUTUBEI COMPARISON ===");
    
    // 1. Search Comparison
    console.log("\n--- 1. Search Comparison ---");
    const yiSearch = await ytYi.search(SEARCH_QUERY, { type: 'video' });
    const tvSearch = await tubeVanilla.search(SEARCH_QUERY, { type: 'video' });
    
    console.log(`YouTubei Search items count: ${yiSearch.items.length}`);
    console.log(`TubeVanilla Search items count: ${tvSearch.items.length}`);
    if (tvSearch.items.length > 0 && yiSearch.items.length > 0) {
        console.log(`TubeVanilla First Item:`, {
            title: tvSearch.items[0].title,
            id: tvSearch.items[0].id,
            channel: tvSearch.items[0].channel?.name
        });
        console.log(`YouTubei First Item:`, {
            title: yiSearch.items[0].title,
            id: yiSearch.items[0].id,
            channel: yiSearch.items[0].channel?.name
        });
    }

    // 2. Video Comparison
    console.log("\n--- 2. Video Comparison ---");
    const yiVideo = await ytYi.getVideo(VIDEO_ID);
    const tvVideo = await tubeVanilla.getVideo(VIDEO_ID);
    
    console.log(`YouTubei Video:`, {
        title: yiVideo?.title,
        viewCount: yiVideo?.viewCount,
        channel: yiVideo?.channel?.name
    });
    console.log(`TubeVanilla Video:`, {
        title: tvVideo?.title,
        viewCount: tvVideo?.viewCount,
        channel: tvVideo?.channel?.name
    });

    // 3. Playlist Comparison
    console.log("\n--- 3. Playlist Comparison ---");
    const yiPlaylistSearch = await ytYi.search(SEARCH_QUERY, { type: 'playlist' });
    const plId = yiPlaylistSearch.items[0]?.id;
    if (plId) {
        console.log(`Found playlist ID to test: ${plId}`);
        const yiPlaylist = await ytYi.getPlaylist(plId);
        const tvPlaylist = await tubeVanilla.getPlaylist(plId);

        console.log(`YouTubei Playlist:`, {
            title: yiPlaylist?.title,
            videoCount: yiPlaylist?.videoCount,
            channel: yiPlaylist?.channel?.name,
            itemsCount: yiPlaylist?.videos?.items?.length
        });
        console.log(`TubeVanilla Playlist:`, {
            title: tvPlaylist?.title,
            videoCount: tvPlaylist?.videoCount,
            channel: tvPlaylist?.channel?.name,
            itemsCount: tvPlaylist?.videos?.items?.length
        });
    } else {
        console.log("Could not find a playlist to test.");
    }

    console.log("\n=== END COMPARISON ===");
}

runComparisons().catch(console.error);
