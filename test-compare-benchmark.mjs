import { Client as TubeClient } from './dist/index.js';
import { Client as YiClient } from 'youtubei';

const tubeClient = new TubeClient();
const yiClient = new YiClient();

const VIDEO_ID = 'dQw4w9WgXcQ';
const PLAYLIST_ID = 'PLE0hg-LdSfycrpTtMImPSqFLle4yYNzWD';
const CHANNEL_ID = 'UCuAXFkgsw1L7xaCfnd5JJOw';
const SEARCH_QUERY = 'Never Gonna Give You Up';

async function runBenchmarkAndParity() {
    console.log("==================================================================");
    console.log("===      TUBEZERO VS YOUTUBEI MASTER COMPARISON & BENCHMARK    ===");
    console.log("==================================================================");

    const report = [];

    async function benchmarkCall(name, tubeCall, yiCall, parityCheck) {
        console.log(`\n--- Running [${name}] ---`);
        let tzTime = 0;
        let yiTime = 0;
        let tzResult = null;
        let yiResult = null;
        let tzErr = null;
        let yiErr = null;

        // Run TubeZero
        try {
            const start = performance.now();
            tzResult = await tubeCall();
            tzTime = performance.now() - start;
            console.log(`[TubeZero] Completed in ${tzTime.toFixed(2)}ms`);
        } catch (e) {
            tzErr = e.message;
            console.error(`[TubeZero] Error:`, e);
        }

        // Run YouTubei
        try {
            const start = performance.now();
            yiResult = await yiCall();
            yiTime = performance.now() - start;
            console.log(`[YouTubei] Completed in ${yiTime.toFixed(2)}ms`);
        } catch (e) {
            yiErr = e.message;
            console.error(`[YouTubei] Error:`, e);
        }

        // Check parity
        let parityStatus = 'UNKNOWN';
        let parityDetails = '';
        if (tzErr || yiErr) {
            parityStatus = 'ERROR';
            parityDetails = `TubeZero Err: ${tzErr || 'None'}, YouTubei Err: ${yiErr || 'None'}`;
        } else {
            try {
                parityDetails = parityCheck(tzResult, yiResult);
                if (parityDetails) {
                    parityStatus = parityDetails.includes('empty/undefined') ? 'PARTIAL_DATA' : 'MISMATCH';
                } else {
                    parityStatus = 'PASS';
                }
            } catch (e) {
                parityStatus = 'EXCEPTION';
                parityDetails = e.message;
            }
        }

        console.log(`Parity Status: ${parityStatus}`);
        if (parityDetails) {
            console.log(`Parity Details: ${parityDetails}`);
        }

        report.push({
            name,
            tubeZeroTime: tzTime,
            youtubeiTime: yiTime,
            status: parityStatus,
            details: parityDetails
        });
    }

    // 1. Search
    await benchmarkCall(
        "Search Videos",
        () => tubeClient.search(SEARCH_QUERY, { type: 'video' }),
        () => yiClient.search(SEARCH_QUERY, { type: 'video' }),
        (tz, yi) => {
            const tzCount = tz.items.length;
            const yiCount = yi.items.length;
            if (tzCount === 0 || yiCount === 0) return `Zero items fetched: tz=${tzCount}, yi=${yiCount}`;
            const firstTz = tz.items[0];
            const firstYi = yi.items[0];
            if (firstTz.id !== firstYi.id) {
                return `First item ID mismatch: tz="${firstTz.id}" ("${firstTz.title}"), yi="${firstYi.id}" ("${firstYi.title}")`;
            }
            return ''; // Match
        }
    );

    // 2. findOne
    await benchmarkCall(
        "findOne",
        () => tubeClient.findOne(SEARCH_QUERY, { type: 'video' }),
        () => yiClient.findOne(SEARCH_QUERY, { type: 'video' }),
        (tz, yi) => {
            if (tz.id !== yi.id) {
                return `ID mismatch: tz="${tz.id}" ("${tz.title}"), yi="${yi.id}" ("${yi.title}")`;
            }
            return '';
        }
    );

    // 3. getVideo
    await benchmarkCall(
        "getVideo Details",
        () => tubeClient.getVideo(VIDEO_ID),
        () => yiClient.getVideo(VIDEO_ID),
        (tz, yi) => {
            const issues = [];
            if (tz.title !== yi.title) issues.push(`Title mismatch: tz="${tz.title}", yi="${yi.title}"`);
            if (tz.duration !== yi.duration) issues.push(`Duration mismatch: tz=${tz.duration}s, yi=${yi.duration}s`);
            if (tz.channel?.id !== yi.channel?.id) issues.push(`Channel ID mismatch: tz="${tz.channel?.id}", yi="${yi.channel?.id}"`);
            if (tz.related.items.length !== yi.related.items.length) {
                issues.push(`Related count mismatch: tz=${tz.related.items.length}, yi=${yi.related.items.length}`);
            }
            return issues.join(' | ');
        }
    );

    // 4. getPlaylist
    await benchmarkCall(
        "getPlaylist Details",
        () => tubeClient.getPlaylist(PLAYLIST_ID),
        () => yiClient.getPlaylist(PLAYLIST_ID),
        (tz, yi) => {
            const issues = [];
            if (tz.title !== yi.title) issues.push(`Title mismatch: tz="${tz.title}", yi="${yi.title}"`);
            if (tz.videoCount !== yi.videoCount) issues.push(`videoCount mismatch: tz=${tz.videoCount}, yi=${yi.videoCount}`);
            return issues.join(' | ');
        }
    );

    // 5. getChannel
    await benchmarkCall(
        "getChannel Details",
        () => tubeClient.getChannel(CHANNEL_ID),
        () => yiClient.getChannel(CHANNEL_ID),
        (tz, yi) => {
            const issues = [];
            if (tz.name !== yi.name) issues.push(`Channel Name mismatch: tz="${tz.name}", yi="${yi.name}"`);
            if (tz.subscriberCount !== yi.subscriberCount) issues.push(`Sub count mismatch: tz="${tz.subscriberCount}", yi="${yi.subscriberCount}"`);
            return issues.join(' | ');
        }
    );

    // 6. getVideoTranscript
    await benchmarkCall(
        "getVideoTranscript",
        () => tubeClient.getVideoTranscript(VIDEO_ID, 'en'),
        () => yiClient.getVideoTranscript(VIDEO_ID, 'en'),
        (tz, yi) => {
            if (!tz && !yi) return 'Both transcripts empty';
            if (!tz) return 'TubeZero returned empty/undefined transcript';
            if (!yi) return `YouTubei returned empty/undefined transcript (TubeZero successfully parsed ${tz.length} segments)`;
            if (tz.length !== yi.length) {
                return `Transcript segment length mismatch: tz=${tz.length}, yi=${yi.length}`;
            }
            if (tz[0]?.text !== yi[0]?.text) {
                return `First transcript text mismatch: tz="${tz[0]?.text}", yi="${yi[0]?.text}"`;
            }
            return '';
        }
    );

    // print summary table
    console.log("\n==================================================================");
    console.log("===                       SUMMARY REPORT                       ===");
    console.log("==================================================================");
    console.log(
        String("Call Name").padEnd(25) + " | " + 
        String("TubeZero").padStart(10) + " | " + 
        String("YouTubei").padStart(10) + " | " + 
        String("Parity Status").padEnd(15)
    );
    console.log("-".repeat(68));
    for (const r of report) {
        console.log(
            r.name.padEnd(25) + " | " + 
            `${r.tubeZeroTime.toFixed(1)}ms`.padStart(10) + " | " + 
            `${r.youtubeiTime.toFixed(1)}ms`.padStart(10) + " | " + 
            r.status.padEnd(15)
        );
    }
    console.log("==================================================================");
}

runBenchmarkAndParity().catch(console.error);
