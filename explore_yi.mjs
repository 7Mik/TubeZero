import { Client } from 'youtubei';

async function explore() {
    const youtube = new Client();
    const videoId = 'dQw4w9WgXcQ';
    
    console.log("Fetching video...");
    const video = await youtube.getVideo(videoId);
    
    console.log("--- Captions ---");
    console.log(video.captions ? Object.keys(video.captions) : "No captions property");
    
    console.log("--- Comments ---");
    if (video.comments) {
        console.log("Type of video.comments:", typeof video.comments);
        console.log("Keys of video.comments:", Object.keys(video.comments));
        
        if (typeof video.comments.next === 'function') {
            const firstBatch = await video.comments.next(1); // can we just fetch 1 batch?
            console.log("First batch length (arg 1):", firstBatch?.length);
        }
    }
}

explore().catch(console.error);
