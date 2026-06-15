import fs from 'fs';
import { 
    fetchCommentsFromYouTube, 
    fetchSubtitlesFromYouTube, 
    Client as TubeZeroClient, 
    fetchYtInitialData 
} from './dist/index.js';
import { Client as YoutubeiClient } from 'youtubei';

const args = process.argv.slice(2);
let videoId = 'dQw4w9WgXcQ';

if (args[0] === '--video' && args[1]) {
    videoId = args[1];
} else if (args[0] && !args[0].startsWith('--')) {
    videoId = args[0];
}

console.log(`Starting benchmark and quality comparison for video: ${videoId}`);

async function runBenchmark() {
    const results = {
        videoId,
        timestamp: new Date().toISOString(),
        videoInfo: { speeds: {}, samples: {} },
        comments: { speeds: {}, samples: {} },
        subtitles: { speeds: {}, samples: {} }
    };

    const tzClient = new TubeZeroClient();
    const yiClient = new YoutubeiClient();

    // --- 1. Video Info ---
    console.log('\n--- Fetching Video Info ---');
    try {
        const startTz = performance.now();
        const tzPlayer = await tzClient.request('player', { videoId });
        const endTz = performance.now();
        
        const startYi = performance.now();
        const yiInfo = await yiClient.getVideo(videoId);
        const endYi = performance.now();
        
        results.videoInfo.speeds.tubezero = endTz - startTz;
        results.videoInfo.speeds.youtubei = endYi - startYi;

        const tzVideoDetails = tzPlayer?.videoDetails;
        
        results.videoInfo.samples.tubezero = {
            rawPayloadSize: JSON.stringify(tzPlayer || {}).length,
            title: tzVideoDetails?.title || 'N/A',
            viewCount: tzVideoDetails?.viewCount || 'N/A',
            duration: tzVideoDetails?.lengthSeconds || 'N/A'
        };
        
        results.videoInfo.samples.youtubei = {
            rawPayloadSize: -1, // too large / circular
            title: yiInfo?.title,
            viewCount: yiInfo?.viewCount,
            duration: yiInfo?.duration
        };
        
        console.log(`[tubezero] video info: ${results.videoInfo.speeds.tubezero.toFixed(2)}ms`);
        console.log(`[youtubei] video info: ${results.videoInfo.speeds.youtubei.toFixed(2)}ms`);
    } catch (e) {
        console.error('Error fetching video info:', e);
    }

    // --- 2. Comments ---
    console.log('\n--- Fetching Comments ---');
    try {
        // We want exactly 20 comments to compare apples-to-apples
        const startTz = performance.now();
        const tzComments = await fetchCommentsFromYouTube(videoId, 20);
        const endTz = performance.now();
        
        const startYi = performance.now();
        const yiVideo = await yiClient.getVideo(videoId);
        let yiComments = [];
        if (yiVideo && yiVideo.comments && typeof yiVideo.comments.next === 'function') {
             // youtubei next(1) means 1 continuation (which is typically ~20 items)
             const firstPage = await yiVideo.comments.next(1);
             yiComments = firstPage || [];
        }
        const endYi = performance.now();

        results.comments.speeds.tubezero = endTz - startTz;
        results.comments.speeds.youtubei = endYi - startYi;

        results.comments.samples.tubezero = {
            fetchedCount: tzComments.length,
            firstCommentSample: tzComments[0] ? {
                author: tzComments[0].author,
                text: tzComments[0].text,
                likes: tzComments[0].likes
            } : null
        };

        results.comments.samples.youtubei = {
            fetchedCount: yiComments.length,
            firstCommentSample: yiComments[0] ? {
                author: yiComments[0].author?.name,
                text: yiComments[0].content,
                likes: yiComments[0].likeCount
            } : null
        };

        console.log(`[tubezero] comments: ${results.comments.speeds.tubezero.toFixed(2)}ms (Count: ${tzComments.length})`);
        console.log(`[youtubei] comments: ${results.comments.speeds.youtubei.toFixed(2)}ms (Count: ${yiComments.length})`);
    } catch (e) {
        console.error('Error fetching comments:', e);
    }

    // --- 3. Subtitles ---
    console.log('\n--- Fetching Subtitles ---');
    try {
        const startTz = performance.now();
        const tzSubs = await fetchSubtitlesFromYouTube(videoId, 'en');
        const endTz = performance.now();
        
        results.subtitles.speeds.tubezero = endTz - startTz;
        results.subtitles.samples.tubezero = {
            fetchedCount: tzSubs.length,
            firstSubtitleSample: tzSubs[0] || null
        };
        console.log(`[tubezero] subtitles: ${results.subtitles.speeds.tubezero.toFixed(2)}ms (Count: ${tzSubs.length})`);
        
        results.subtitles.speeds.youtubei = 0;
        results.subtitles.samples.youtubei = "Feature not supported natively by suspiciouslookingowl/youtubei on video object.";
        console.log(`[youtubei] subtitles: Unsupported natively`);
    } catch (e) {
        console.error('Error fetching subtitles:', e);
    }

    // --- Output JSON ---
    console.log('\n--- Saving Detailed Quality Results ---');
    if (!fs.existsSync('benchmark_results')) {
        fs.mkdirSync('benchmark_results');
    }
    const outFile = `benchmark_results/benchmark_results_${videoId}.json`;
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Detailed comparison saved to ${outFile}`);
    
    // Summary table
    console.table({
        'Video Info Time (ms)': {
            tubezero: results.videoInfo.speeds.tubezero?.toFixed(2),
            youtubei: results.videoInfo.speeds.youtubei?.toFixed(2),
        },
        'Comments Time (ms)': {
            tubezero: results.comments.speeds.tubezero?.toFixed(2),
            youtubei: results.comments.speeds.youtubei?.toFixed(2),
        },
        'Subtitles Time (ms)': {
            tubezero: results.subtitles.speeds.tubezero?.toFixed(2),
            youtubei: 'N/A',
        }
    });
}

runBenchmark().catch(console.error);
