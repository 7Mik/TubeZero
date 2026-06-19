import { Client } from './dist/index.js';

const client = new Client();

async function runTests() {
    console.log("=== RUNNING ALL TUBE VANILLA API CALL TESTS ===");

    // 1. search
    console.log("\n1. Testing client.search...");
    const searchRes = await client.search("Google", { type: 'all' });
    console.log(`- Found ${searchRes.items.length} items`);
    if (searchRes.items.length > 0) {
        console.log(`- First item: [${searchRes.items[0].constructor.name}] "${searchRes.items[0].title}" (ID: ${searchRes.items[0].id})`);
    }

    // 2. findOne
    console.log("\n2. Testing client.findOne...");
    const firstItem = await client.findOne("Rick Astley");
    if (firstItem) {
        console.log(`- Found: [${firstItem.constructor.name}] "${firstItem.title}"`);
    } else {
        console.log("- No item found");
    }

    // 3. getVideo (Normal video metadata, comments, related, captions)
    const videoId = 'dQw4w9WgXcQ';
    console.log(`\n3. Testing client.getVideo for ${videoId}...`);
    const video = await client.getVideo(videoId);
    console.log(`- Title: "${video.title}"`);
    console.log(`- Channel: "${video.channel?.name}"`);
    console.log(`- Duration: ${video.duration} seconds`);
    console.log(`- Upload Date: "${video.uploadDate}"`);
    console.log(`- Tags: ${JSON.stringify(video.tags)}`);
    console.log(`- Like Count: ${video.likeCount}`);
    console.log(`- Formats count: ${video.formats?.length}`);
    console.log(`- Adaptive Formats count: ${video.adaptiveFormats?.length}`);
    
    // Testing related videos
    console.log(`- Related videos items count: ${video.related.items.length}`);
    if (video.related.items.length > 0) {
        console.log(`  - First related: "${video.related.items[0].title}"`);
    }

    // Testing captions languages
    if (video.captions) {
        console.log(`- Captions Languages: ${video.captions.languages.map(l => l.code).join(', ')}`);
        const englishCaptions = await video.captions.get('en');
        console.log(`- English Captions count: ${englishCaptions?.length}`);
        if (englishCaptions && englishCaptions.length > 0) {
            console.log(`  - First caption segment: "${englishCaptions[0].text}" [${englishCaptions[0].start}ms - ${englishCaptions[0].end}ms]`);
        }
    } else {
        console.log("- No captions found");
    }

    // Testing comments continuation
    if (video.comments.continuation) {
        console.log(`- Comments continuation token found. Fetching next page...`);
        const comments = await video.comments.next(5);
        console.log(`- Loaded ${comments.length} comments:`);
        for (const c of comments) {
            console.log(`  - "${c.author.name}": "${c.content.slice(0, 50)}..." (Likes: ${c.likeCount}, Replies: ${c.replyCount})`);
            if (c.replyCount > 0 && c.replies.continuation) {
                console.log(`    - Pinned/continuation for replies found. Fetching replies...`);
                const replies = await c.replies.next(2);
                console.log(`    - Loaded ${replies.length} replies`);
            }
        }
    } else {
        console.log("- No comments continuation token found");
    }

    // 4. getPlaylist
    const playlistId = 'PLE0hg-LdSfycrpTtMImPSqFLle4yYNzWD';
    console.log(`\n4. Testing client.getPlaylist for ${playlistId}...`);
    const playlist = await client.getPlaylist(playlistId);
    console.log(`- Title: "${playlist.title}"`);
    console.log(`- Video Count: ${playlist.videoCount}`);
    console.log(`- Videos items count: ${playlist.videos.items.length}`);
    if (playlist.videos.items.length > 0) {
        console.log(`  - First video: "${playlist.videos.items[0].title}"`);
    }

    // 5. getChannel
    const channelId = 'UCuAXFkgsw1L7xaCfnd5JJOw'; // Rick Astley
    console.log(`\n5. Testing client.getChannel for ${channelId}...`);
    const channel = await client.getChannel(channelId);
    if (channel) {
        console.log(`- Title: "${channel.name}"`);
        console.log(`- Subscriber Count: "${channel.subscriberCount}"`);
        console.log(`- Banners count: ${channel.banner.length}`);
        console.log(`- Shelves count: ${channel.shelves.length}`);
        
        // Testing tab continuations
        console.log("- Fetching channel videos...");
        const channelVideos = await channel.videos.next(5);
        console.log(`  - Found ${channelVideos.length} videos`);
        if (channelVideos.length > 0) {
            console.log(`  - First video: "${channelVideos[0].title}"`);
        }
    } else {
        console.log("- Channel not found");
    }

    // 6. getVideoTranscript
    console.log(`\n6. Testing client.getVideoTranscript for ${videoId}...`);
    const transcript = await client.getVideoTranscript(videoId, 'en');
    console.log(`- Transcript length: ${transcript?.length}`);
    if (transcript && transcript.length > 0) {
        console.log(`- First line: "${transcript[0].text}"`);
    }

    console.log("\n=== ALL CALLS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(console.error);
