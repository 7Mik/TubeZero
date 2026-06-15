import { 
    fetchSubtitlesFromYouTube, 
    fetchCommentsFromYouTube, 
    getInnerTubeConfig, 
    scrapeTasteData,
    Thumbnails,
    Client
} from './dist/index.js';

const videoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

async function runTests() {
    console.log("=== INIZIO TEST FUNZIONI ESPORTATE ===");

    // 1. Test Config
    console.log("\n--- 1. Test Configurazione InnerTube ---");
    try {
        const config = await getInnerTubeConfig();
        console.log("Configurazione estratta:", config);
        if (config.apiKey) {
            console.log("✅ OK: API Key trovata.");
        } else {
            console.log("⚠️ Attenzione: API Key non trovata.");
        }
    } catch (e) {
        console.error("❌ Errore in getInnerTubeConfig:", e);
    }

    // 2. Test Sottotitoli
    console.log("\n--- 2. Test Sottotitoli ---");
    try {
        console.log(`Recupero sottotitoli per il video: ${videoId}`);
        const subtitles = await fetchSubtitlesFromYouTube(videoId, 'en');
        console.log(`Sottotitoli recuperati. Totale segmenti: ${subtitles.length}`);
        if (subtitles.length > 0) {
            console.log("Primi 3 segmenti:");
            console.log(subtitles.slice(0, 3));
            console.log("✅ OK: Sottotitoli funzionanti.");
        } else {
            console.log("❌ Errore: Nessun segmento di sottotitolo trovato.");
        }
    } catch (e) {
        console.error("❌ Errore in fetchSubtitlesFromYouTube:", e);
    }

    // 3. Test Commenti
    console.log("\n--- 3. Test Commenti ---");
    try {
        console.log(`Recupero commenti per il video: ${videoId}`);
        const comments = await fetchCommentsFromYouTube(videoId, 10);
        console.log(`Commenti recuperati. Totale: ${comments.length}`);
        if (comments.length > 0) {
            console.log("Primi 3 commenti:");
            console.log(comments.slice(0, 3));
            console.log("✅ OK: Commenti funzionanti.");
        } else {
            console.log("❌ Errore: Nessun commento trovato.");
        }
    } catch (e) {
        console.error("❌ Errore in fetchCommentsFromYouTube:", e);
    }

    // 4. Test Scraper / Taste Data fallback
    console.log("\n--- 4. Test Scraper (Taste Data / fallbacks) ---");
    try {
        console.log("Esecuzione scrapeTasteData con limiti ridotti...");
        const tasteData = await scrapeTasteData(null, [], 5);
        console.log("Chiavi ritornate da tasteData:", Object.keys(tasteData));
        console.log(`History count: ${tasteData.historyEntries.length}`);
        console.log(`Likes count: ${tasteData.likesEntries.length}`);
        console.log(`Watch Later count: ${tasteData.wlEntries.length}`);
        console.log("✅ OK: Struttura tasteData valida.");
    } catch (e) {
        console.error("❌ Errore in scrapeTasteData:", e);
    }

    // 5. Test Thumbnails Helper
    console.log("\n--- 5. Test Thumbnails Helper ---");
    try {
        const list = [
            { url: 'thumb1.jpg', width: 120, height: 90 },
            { url: 'thumb3.jpg', width: 1920, height: 1080 },
            { url: 'thumb2.jpg', width: 640, height: 480 }
        ];
        const thumbnails = new Thumbnails(list);
        const best = thumbnails.getBestResolution();
        console.log("Best thumbnail:", best);
        if (best && best.url === 'thumb3.jpg') {
            console.log("✅ OK: getBestResolution funziona correttamente.");
        } else {
            console.log("❌ Errore: getBestResolution ha ritornato una thumbnail errata o undefined.");
        }

        // Test list property is public and maintained
        console.log("List size:", thumbnails.list.length);
        if (thumbnails.list.length === 3) {
            console.log("✅ OK: Proprietà list mantenuta correttamente.");
        } else {
            console.log("❌ Errore: Proprietà list non valida.");
        }

        // Test getBestResolution on empty list
        const emptyThumbnails = new Thumbnails([]);
        const noBest = emptyThumbnails.getBestResolution();
        if (noBest === undefined) {
            console.log("✅ OK: getBestResolution ritorna undefined per lista vuota.");
        } else {
            console.log("❌ Errore: getBestResolution non ritorna undefined per lista vuota.");
        }
    } catch (e) {
        console.error("❌ Errore in Test Thumbnails:", e);
    }

    // 6. Test Client Class
    console.log("\n--- 6. Test Client Class ---");
    try {
        const client = new Client();
        console.log("Client default values:");
        console.log(`apiKey: ${client.apiKey}`);
        console.log(`clientVersion: ${client.clientVersion}`);
        console.log(`idToken: ${client.idToken ? '[REDACTED]' : 'null'}`);
        
        console.log("Calling ensureConfig()...");
        await client.ensureConfig();
        console.log("Client values after ensureConfig():");
        console.log(`apiKey: ${client.apiKey ? 'OK' : 'Failed'}`);
        console.log(`clientVersion: ${client.clientVersion}`);
        console.log(`idToken: ${client.idToken ? '[REDACTED]' : 'null'}`);

        if (client.apiKey) {
            console.log("✅ OK: Client initialization & ensureConfig works.");
            
            console.log("Testing request method (browse)...");
            const res = await client.request('browse', { browseId: 'FEhistory' });
            console.log(`Request completed successfully. Response keys: ${Object.keys(res).join(', ')}`);
            console.log("✅ OK: Client request works.");
        } else {
            console.log("❌ Errore: client.apiKey is null after ensureConfig.");
        }
    } catch (e) {
        console.error("❌ Errore in Test Client:", e);
    }

    console.log("\n=== FINE TEST ===");
}

runTests();

