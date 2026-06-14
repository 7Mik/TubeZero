import { 
    fetchSubtitlesFromYouTube, 
    fetchCommentsFromYouTube, 
    getInnerTubeConfig, 
    scrapeTasteData 
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

    console.log("\n=== FINE TEST ===");
}

runTests();
