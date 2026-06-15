"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Base: () => Base,
  Client: () => Client,
  Continuable: () => Continuable,
  Thumbnails: () => Thumbnails,
  createCommentsApiRequestOptions: () => createCommentsApiRequestOptions,
  extractPlayerResponse: () => extractPlayerResponse,
  extractVideoEntries: () => extractVideoEntries,
  fetchCommentsFromYouTube: () => fetchCommentsFromYouTube,
  fetchInnerTubeFeed: () => fetchInnerTubeFeed,
  fetchSubtitlesFromYouTube: () => fetchSubtitlesFromYouTube,
  fetchYtInitialData: () => fetchYtInitialData,
  findContinuationToken: () => findContinuationToken,
  getInnerTubeConfig: () => getInnerTubeConfig,
  getSApiSidHash: () => getSApiSidHash,
  getSapisidFromCookie: () => getSapisidFromCookie,
  parseXmlTranscriptRegex: () => parseXmlTranscriptRegex,
  scrapeTasteData: () => scrapeTasteData
});
module.exports = __toCommonJS(index_exports);

// src/scraper.ts
async function fetchYtInitialData(url) {
  try {
    console.log(`[Scraper] Fetching HTML from ${url}`);
    const response = await fetch(url, { credentials: "include" });
    const text = await response.text();
    const patterns = [
      /var ytInitialData\s*=\s*(\{.*?\});<\/script>/,
      /window\["ytInitialData"\]\s*=\s*(\{.*?\});/
    ];
    for (const regex of patterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    }
    console.warn(`[Scraper] Could not find ytInitialData in ${url}`);
  } catch (e) {
    console.error(`[Scraper] Failed to fetch data from ${url}`, e);
  }
  return null;
}
function getSapisidFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/__Secure-3PAPISID=([^;]+)/) || document.cookie.match(/__Secure-1PAPISID=([^;]+)/) || document.cookie.match(/SAPISID=([^;]+)/);
  return match ? match[1] : null;
}
async function getSApiSidHash(sapisid, origin = "https://www.youtube.com") {
  if (!sapisid) return null;
  try {
    const timestamp = Math.floor(Date.now() / 1e3);
    const input = `${timestamp} ${sapisid} ${origin}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const buffer = await crypto.subtle.digest("SHA-1", data);
    const hash = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${timestamp}_${hash}`;
  } catch (e) {
    console.error("[Scraper] Failed to generate SAPISIDHASH", e);
    return null;
  }
}
function extractVideoEntries(data) {
  const entries = [];
  const seenTitles = /* @__PURE__ */ new Set();
  function recurse(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        recurse(obj[i]);
      }
      return;
    }
    if (obj.videoId && obj.title) {
      let title = "";
      if (typeof obj.title === "string") {
        title = obj.title;
      } else if (obj.title.runs && obj.title.runs[0] && obj.title.runs[0].text) {
        title = obj.title.runs[0].text;
      } else if (obj.title.simpleText) {
        title = obj.title.simpleText;
      }
      title = title.trim();
      if (title && title.length > 2 && title !== "Skip navigation") {
        if (!seenTitles.has(title)) {
          seenTitles.add(title);
          let channel = "";
          const byline = obj.longBylineText || obj.shortBylineText || obj.ownerText;
          if (byline) {
            if (typeof byline === "string") {
              channel = byline;
            } else if (byline.runs && byline.runs[0] && byline.runs[0].text) {
              channel = byline.runs[0].text;
            } else if (byline.simpleText) {
              channel = byline.simpleText;
            }
          }
          entries.push({
            title,
            channel: channel.split("\n")[0].replace(/•/g, "").trim()
          });
        }
      }
      return;
    }
    if (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const model = obj.lockupViewModel;
      const meta = model.metadata?.lockupMetadataViewModel;
      if (meta && meta.title && meta.title.content) {
        const title = meta.title.content.trim();
        if (title && !seenTitles.has(title)) {
          seenTitles.add(title);
          let channel = "";
          const rows = meta.metadata?.contentMetadataViewModel?.metadataRows;
          if (rows && rows[0] && rows[0].metadataParts && rows[0].metadataParts[0] && rows[0].metadataParts[0].text) {
            channel = rows[0].metadataParts[0].text.content || "";
          }
          entries.push({
            title,
            channel: channel.split("\n")[0].replace(/•/g, "").trim()
          });
        }
      }
      return;
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        recurse(obj[key]);
      }
    }
  }
  try {
    recurse(data);
  } catch (e) {
    console.warn("[Scraper] Error extracting video entries recursively", e);
  }
  return entries;
}
function getFallbackClientVersion() {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - 2);
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  return `2.${yyyymmdd}.00.00`;
}
var cachedApiKey = null;
var cachedClientVersion = null;
var cachedIdToken = null;
async function getInnerTubeConfig(injectedConfig) {
  if (injectedConfig && injectedConfig.apiKey) {
    cachedApiKey = injectedConfig.apiKey;
    cachedClientVersion = injectedConfig.clientVersion || getFallbackClientVersion();
    cachedIdToken = injectedConfig.idToken ?? null;
    return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
  }
  if (cachedApiKey && cachedClientVersion) {
    return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
  }
  try {
    console.log("[Scraper] Fetching YouTube homepage for config...");
    const response = await fetch("https://www.youtube.com", { credentials: "include" });
    const html = await response.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
    const idTokenMatch = html.match(/"ID_TOKEN":"([^"]+)"/);
    if (apiKeyMatch && apiKeyMatch[1]) cachedApiKey = apiKeyMatch[1];
    if (clientVersionMatch && clientVersionMatch[1]) cachedClientVersion = clientVersionMatch[1];
    if (idTokenMatch && idTokenMatch[1]) cachedIdToken = idTokenMatch[1];
    console.log(`[Scraper] Extracted Config \u2014 Key: ${cachedApiKey ? "OK" : "Failed"}, Version: ${cachedClientVersion}`);
  } catch (e) {
    console.warn("[Scraper] Failed to extract InnerTube config from HTML", e);
  }
  if (!cachedClientVersion) {
    cachedClientVersion = getFallbackClientVersion();
  }
  return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
}
function findContinuationToken(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.continuationCommand && obj.continuationCommand.token) {
    return obj.continuationCommand.token;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const token = findContinuationToken(obj[key]);
      if (token) return token;
    }
  }
  return null;
}
async function fetchInnerTubeContinuation(apiKey, clientVersion, idToken, initialToken, limit) {
  const entries = [];
  let continuationToken = initialToken;
  try {
    while (continuationToken && entries.length < limit) {
      const headers = {
        "Content-Type": "application/json",
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": clientVersion
      };
      if (idToken) {
        headers["X-Youtube-Identity-Token"] = idToken;
      }
      const sapisid = getSapisidFromCookie();
      if (sapisid) {
        const authHash = await getSApiSidHash(sapisid, "https://www.youtube.com");
        if (authHash) {
          headers["Authorization"] = `SAPISIDHASH ${authHash}`;
        }
      }
      const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion,
              hl: "en",
              gl: "US"
            }
          },
          continuation: continuationToken
        })
      });
      if (!response.ok) break;
      const data = await response.json();
      const pageEntries = extractVideoEntries(data);
      entries.push(...pageEntries);
      continuationToken = findContinuationToken(data);
    }
  } catch (e) {
    console.error("[Scraper] Error in InnerTube pagination", e);
  }
  return entries;
}
async function fetchInnerTubeFeed(apiKey, clientVersion, idToken, browseId, limit = 500) {
  const entries = [];
  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": clientVersion
    };
    if (idToken) {
      headers["X-Youtube-Identity-Token"] = idToken;
    }
    const sapisid = getSapisidFromCookie();
    if (sapisid) {
      const authHash = await getSApiSidHash(sapisid, "https://www.youtube.com");
      if (authHash) {
        headers["Authorization"] = `SAPISIDHASH ${authHash}`;
      }
    }
    const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion,
            hl: "en",
            gl: "US"
          }
        },
        browseId
      })
    });
    if (!response.ok) return [];
    const data = await response.json();
    const pageEntries = extractVideoEntries(data);
    entries.push(...pageEntries);
    if (entries.length < limit) {
      const continuationToken = findContinuationToken(data);
      if (continuationToken) {
        const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, continuationToken, limit - entries.length);
        entries.push(...more);
      }
    }
  } catch (e) {
    console.error(`[Scraper] InnerTube fetch error for ${browseId}`, e);
  }
  return entries;
}
async function scrapeTasteData(injectedConfig, customPlaylists = [], limit = 500) {
  let historyEntries = [];
  let likesEntries = [];
  let wlEntries = [];
  const dislikesEntries = [];
  const config = await getInnerTubeConfig(injectedConfig);
  const apiKey = config.apiKey;
  const clientVersion = config.clientVersion;
  const idToken = config.idToken;
  if (apiKey) {
    historyEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, "FEhistory", limit);
    likesEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, "VLLL", limit);
    wlEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, "VLWL", limit);
  }
  if (historyEntries.length === 0) {
    const historyData = await fetchYtInitialData("https://www.youtube.com/feed/history");
    if (historyData) {
      historyEntries = extractVideoEntries(historyData);
      if (historyEntries.length < limit) {
        const token = findContinuationToken(historyData);
        if (token && apiKey) {
          const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - historyEntries.length);
          historyEntries.push(...more);
        }
      }
    }
  }
  if (likesEntries.length === 0) {
    const likesData = await fetchYtInitialData("https://www.youtube.com/playlist?list=LL");
    if (likesData) {
      likesEntries = extractVideoEntries(likesData);
      if (likesEntries.length < limit) {
        const token = findContinuationToken(likesData);
        if (token && apiKey) {
          const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - likesEntries.length);
          likesEntries.push(...more);
        }
      }
    }
  }
  if (wlEntries.length === 0) {
    const wlData = await fetchYtInitialData("https://www.youtube.com/playlist?list=WL");
    if (wlData) {
      wlEntries = extractVideoEntries(wlData);
      if (wlEntries.length < limit) {
        const token = findContinuationToken(wlData);
        if (token && apiKey) {
          const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - wlEntries.length);
          wlEntries.push(...more);
        }
      }
    }
  }
  const customPlaylistsData = [];
  for (const pl of customPlaylists) {
    if (!pl.url) continue;
    const match = pl.url.match(/[&?]list=([a-zA-Z0-9_-]+)/);
    const playlistId = match ? match[1] : pl.url.trim();
    if (!playlistId || !/^[a-zA-Z0-9_-]+$/.test(playlistId)) continue;
    const browseId = playlistId.startsWith("VL") ? playlistId : "VL" + playlistId;
    let entries = [];
    if (apiKey) {
      entries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, browseId, limit);
    }
    if (entries.length === 0) {
      const data = await fetchYtInitialData(`https://www.youtube.com/playlist?list=${playlistId}`);
      if (data) {
        entries = extractVideoEntries(data);
        if (entries.length < limit) {
          const token = findContinuationToken(data);
          if (token && apiKey) {
            const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - entries.length);
            entries.push(...more);
          }
        }
      }
    }
    customPlaylistsData.push({
      id: playlistId,
      entries: entries.slice(0, limit)
    });
  }
  return {
    historyEntries: historyEntries.slice(0, limit),
    likesEntries: likesEntries.slice(0, limit),
    wlEntries: wlEntries.slice(0, limit),
    dislikesEntries: dislikesEntries.slice(0, limit),
    customPlaylistsData
  };
}

// src/client.ts
function getFallbackClientVersion2() {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - 2);
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  return `2.${yyyymmdd}.00.00`;
}
function getSapisidFromCookieString(cookieString) {
  const match = cookieString.match(/__Secure-3PAPISID=([^;]+)/) || cookieString.match(/__Secure-1PAPISID=([^;]+)/) || cookieString.match(/SAPISID=([^;]+)/);
  return match ? match[1] : null;
}
async function getSApiSidHash2(sapisid, origin = "https://www.youtube.com") {
  if (!sapisid) return null;
  try {
    const timestamp = Math.floor(Date.now() / 1e3);
    const input = `${timestamp} ${sapisid} ${origin}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const buffer = await crypto.subtle.digest("SHA-1", data);
    const hash = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${timestamp}_${hash}`;
  } catch (e) {
    console.error("[Client] Failed to generate SAPISIDHASH", e);
    return null;
  }
}
var Client = class {
  apiKey = null;
  clientVersion = "";
  idToken = null;
  cookie = "";
  constructor(options = {}) {
    this.cookie = options.cookie !== void 0 ? options.cookie : typeof document !== "undefined" ? document.cookie : "";
    let resolvedApiKey = options.apiKey !== void 0 ? options.apiKey : null;
    let resolvedClientVersion = options.clientVersion !== void 0 ? options.clientVersion : null;
    let resolvedIdToken = options.idToken !== void 0 ? options.idToken : null;
    if (typeof window !== "undefined" && window.ytcfg) {
      const ytcfg = window.ytcfg;
      if (typeof ytcfg.get === "function") {
        if (resolvedApiKey === null) resolvedApiKey = ytcfg.get("INNERTUBE_API_KEY") || null;
        if (resolvedClientVersion === null) resolvedClientVersion = ytcfg.get("INNERTUBE_CLIENT_VERSION") || null;
        if (resolvedIdToken === null) resolvedIdToken = ytcfg.get("ID_TOKEN") || null;
      } else {
        if (resolvedApiKey === null) resolvedApiKey = ytcfg.INNERTUBE_API_KEY || null;
        if (resolvedClientVersion === null) resolvedClientVersion = ytcfg.INNERTUBE_CLIENT_VERSION || null;
        if (resolvedIdToken === null) resolvedIdToken = ytcfg.ID_TOKEN || null;
      }
    }
    this.apiKey = resolvedApiKey;
    this.clientVersion = resolvedClientVersion || getFallbackClientVersion2();
    this.idToken = resolvedIdToken;
  }
  /**
   * Asynchronously resolves config parameters if apiKey is not set yet.
   * Fetches and parses YouTube's home page HTML using the scraper logic.
   */
  async ensureConfig() {
    if (this.apiKey) {
      return;
    }
    const config = await getInnerTubeConfig();
    this.apiKey = config.apiKey;
    if (config.clientVersion) {
      this.clientVersion = config.clientVersion;
    }
    this.idToken = config.idToken;
  }
  /**
   * Dispatches an authenticated or unauthenticated POST request to the specified InnerTube endpoint.
   */
  async request(endpoint, payload) {
    await this.ensureConfig();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = `https://www.youtube.com/youtubei/v1/${cleanEndpoint}?key=${this.apiKey}&prettyPrint=false`;
    const headers = {
      "Content-Type": "application/json",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": this.clientVersion
    };
    if (this.idToken) {
      headers["X-Youtube-Identity-Token"] = this.idToken;
    }
    const activeCookie = this.cookie || (typeof document !== "undefined" ? document.cookie : "");
    if (activeCookie) {
      headers["Cookie"] = activeCookie;
      const sapisid = getSapisidFromCookieString(activeCookie);
      if (sapisid) {
        const authHash = await getSApiSidHash2(sapisid, "https://www.youtube.com");
        if (authHash) {
          headers["Authorization"] = `SAPISIDHASH ${authHash}`;
        }
      }
    }
    const bodyPayload = payload || {};
    const requestBody = {
      ...bodyPayload,
      context: {
        ...bodyPayload.context,
        client: {
          clientName: "WEB",
          clientVersion: this.clientVersion,
          hl: "en",
          gl: "US",
          ...bodyPayload.context?.client
        }
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`InnerTube request failed with status: ${response.status}`);
    }
    return response.json();
  }
};

// src/comments.ts
function findValue(obj, path, defaultValue = void 0) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object" || !(part in current)) {
      return defaultValue;
    }
    current = current[part];
  }
  return current;
}
function createCommentsApiRequestOptions(continuationToken, clientVersion = "2.20240703.00.00") {
  return {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion
        }
      },
      continuation: continuationToken
    })
  };
}
async function fetchCommentsFromYouTube(videoId, count = 50, injectedConfig = null) {
  let comments = [];
  let continuationToken = null;
  let fetchedCount = 0;
  const config = await getInnerTubeConfig(injectedConfig);
  const apiKey = config.apiKey;
  const clientVersion = config.clientVersion || "2.20240703.00.00";
  try {
    console.log(`[Comments] Fetching video page for ID: ${videoId}`);
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const pageHtml = await pageResponse.text();
    const patterns = [
      /var ytInitialData\s*=\s*(\{.*?\});<\/script>/,
      /window\["ytInitialData"\]\s*=\s*(\{.*?\});/,
      /ytInitialData\s*=\s*(\{.*?\});/
    ];
    let ytInitialData = null;
    for (const regex of patterns) {
      const match = pageHtml.match(regex);
      if (match && match[1]) {
        ytInitialData = JSON.parse(match[1]);
        break;
      }
    }
    if (ytInitialData) {
      const contents = findValue(ytInitialData, "contents.twoColumnWatchNextResults.results.results.contents");
      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.itemSectionRenderer) {
            const sectionItems = item.itemSectionRenderer.contents || [];
            for (const sItem of sectionItems) {
              let token = findValue(sItem, "continuationItemRenderer.continuationEndpoint.continuationCommand.token");
              if (token) {
                continuationToken = token;
                break;
              }
              token = findValue(sItem, "commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token");
              if (token) {
                continuationToken = token;
                break;
              }
              token = findValue(sItem, "commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.content.runs.0.navigationEndpoint.continuationCommand.token");
              if (token) {
                continuationToken = token;
                break;
              }
            }
          }
          if (continuationToken) break;
        }
      }
      if (!continuationToken) {
        const panels = findValue(ytInitialData, "engagementPanels");
        if (Array.isArray(panels)) {
          for (const panel of panels) {
            const token = findValue(panel, "engagementPanelSectionListRenderer.content.sectionListRenderer.contents.0.itemSectionRenderer.contents.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token");
            if (token) {
              continuationToken = token;
              break;
            }
          }
        }
      }
      if (!continuationToken) {
        continuationToken = findValue(
          ytInitialData,
          "contents.twoColumnWatchNextResults.results.results.contents.2.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token"
        );
      }
      if (!continuationToken) {
        continuationToken = findValue(
          ytInitialData,
          "contents.twoColumnWatchNextResults.results.results.contents.2.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.content.runs.0.navigationEndpoint.continuationCommand.token"
        );
      }
      if (!continuationToken) {
        continuationToken = findValue(ytInitialData, "contents.twoColumnWatchNextResults.results.results.contents.3.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token");
      }
    }
    if (!continuationToken) {
      console.error(`[Comments] Failed to extract comments continuation token for video ${videoId}`);
      return [];
    }
    while (continuationToken && fetchedCount < count) {
      console.log(`[Comments] Fetching comment batch, total comments so far: ${fetchedCount}`);
      const options = createCommentsApiRequestOptions(continuationToken, clientVersion);
      const headers = { ...options.headers };
      const sapisid = getSapisidFromCookie();
      if (sapisid) {
        const authHash = await getSApiSidHash(sapisid);
        if (authHash) {
          headers["Authorization"] = `SAPISIDHASH ${authHash}`;
        }
      }
      const url = apiKey ? `https://www.youtube.com/youtubei/v1/next?key=${apiKey}&prettyPrint=false` : "https://www.youtube.com/youtubei/v1/next?prettyPrint=false";
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: options.body,
        credentials: "include"
      });
      if (!response.ok) {
        console.error(`[Comments] InnerTube request failed with status: ${response.status}`);
        break;
      }
      const apiResponse = await response.json();
      const newComments = [];
      const mutations = findValue(apiResponse, "frameworkUpdates.entityBatchUpdate.mutations", []);
      for (const mutation of mutations) {
        const payload = findValue(mutation, "payload.commentEntityPayload");
        if (payload) {
          let author = findValue(payload, "author.displayName");
          let text = findValue(payload, "properties.content.content");
          let publishedTime = findValue(payload, "properties.publishedTime");
          let commentId = findValue(payload, "properties.commentId");
          let likesRaw = findValue(payload, "toolbar.likeCountNotliked") || findValue(payload, "toolbar.likeCountLiked");
          if (!author) author = findValue(payload, "authorText.simpleText") || "Anonymous";
          if (!text) {
            const runs = findValue(payload, "contentText.runs", []);
            if (runs.length > 0) {
              text = runs.map((r) => r.text).join("");
            } else {
              text = findValue(payload, "contentText.simpleText", "");
            }
          }
          if (!publishedTime) publishedTime = findValue(payload, "publishedTimeText.simpleText", "");
          if (!commentId) commentId = findValue(payload, "commentId", "");
          if (!likesRaw) likesRaw = findValue(payload, "voteCount.simpleText", "0");
          let likeCount = 0;
          if (likesRaw) {
            const likesString = String(likesRaw).trim();
            if (likesString.endsWith("K")) {
              likeCount = Math.round(parseFloat(likesString.slice(0, -1)) * 1e3);
            } else if (likesString.endsWith("M")) {
              likeCount = Math.round(parseFloat(likesString.slice(0, -1)) * 1e6);
            } else {
              likeCount = parseInt(likesString.replace(/\D/g, ""), 10) || 0;
            }
          }
          if (text) {
            newComments.push({ author, text, publishedTime, likeCount, commentId });
          }
        }
      }
      comments = comments.concat(newComments);
      fetchedCount = comments.length;
      continuationToken = findValue(
        apiResponse,
        "onResponseReceivedEndpoints.0.appendContinuationItemsAction.continuationItems.0.nextContinuationData.continuation"
      );
      if (!continuationToken) {
        continuationToken = findValue(
          apiResponse,
          "onResponseReceivedEndpoints.0.reloadContinuationItemsCommand.continuationItems.0.nextContinuationData.continuation"
        );
      }
      if (!continuationToken && fetchedCount < count) {
        console.log(`[Comments] No more continuation tokens. Finished fetching.`);
        break;
      }
    }
    console.log(`[Comments] Successfully fetched ${comments.length} comments.`);
    return comments.slice(0, count);
  } catch (error) {
    console.error(`[Comments] Error fetching comments for ${videoId}:`, error);
    return [];
  }
}

// src/subtitles.ts
function extractYtInitialData(html) {
  try {
    const match = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (!match || !match[1]) {
      const fallbackMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
      if (!fallbackMatch || !fallbackMatch[1]) {
        return null;
      }
      return JSON.parse(fallbackMatch[1]);
    }
    return JSON.parse(match[1]);
  } catch (e) {
    return null;
  }
}
function findPlayerResponseInObject(obj) {
  if (typeof obj !== "object" || obj === null) return null;
  if (obj.captions?.playerCaptionsTracklistRenderer) return obj;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "object" && value !== null) {
        const result = findPlayerResponseInObject(value);
        if (result) return result;
      }
    }
  }
  return null;
}
function extractPlayerResponse(html) {
  let playerResponse = null;
  try {
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch && playerResponseMatch[1]) {
      playerResponse = JSON.parse(playerResponseMatch[1]);
      if (playerResponse && playerResponse.captions?.playerCaptionsTracklistRenderer) {
        return playerResponse;
      }
    }
    const windowResponseMatch = html.match(/window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/);
    if (windowResponseMatch && windowResponseMatch[1]) {
      playerResponse = JSON.parse(windowResponseMatch[1]);
      if (playerResponse && playerResponse.captions?.playerCaptionsTracklistRenderer) {
        return playerResponse;
      }
    }
    const ytInitialData = extractYtInitialData(html);
    if (ytInitialData) {
      const foundPlayerResponse = findPlayerResponseInObject(ytInitialData);
      if (foundPlayerResponse) return foundPlayerResponse;
    }
  } catch (e) {
    console.error("[Subtitles] Error extracting player response:", e);
  }
  return null;
}
function parseXmlTranscriptRegex(xmlText) {
  const segments = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>(.*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = match[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
    if (text && !isNaN(start)) {
      segments.push({ start, duration, text });
    }
  }
  return segments;
}
async function fetchSubtitlesFromYouTube(videoId, language = "en") {
  try {
    console.log(`[Subtitles] Fetching video watch page for video: ${videoId}`);
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999`;
    const response = await fetch(videoPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US"
      }
    });
    const pageHtml = await response.text();
    console.log("[Subtitles] Extracting caption tracks...");
    const playerResponse = extractPlayerResponse(pageHtml);
    if (!playerResponse || !playerResponse.captions || !playerResponse.captions.playerCaptionsTracklistRenderer) {
      console.warn(`[Subtitles] No captions tracklist found for video: ${videoId}`);
      return [];
    }
    const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks || [];
    if (captionTracks.length === 0) {
      console.warn(`[Subtitles] Empty captionTracks array for video: ${videoId}`);
      return [];
    }
    const tracks = captionTracks.map((t) => ({
      baseUrl: t.baseUrl,
      languageCode: t.languageCode,
      name: t.name?.simpleText || t.name,
      isTranslatable: t.kind === "asr"
    }));
    let selectedTrack;
    if (language && language !== "auto") {
      const lowerLang = language.toLowerCase();
      selectedTrack = tracks.find((t) => t.languageCode.toLowerCase() === lowerLang && !t.isTranslatable);
      if (!selectedTrack) selectedTrack = tracks.find((t) => t.languageCode.toLowerCase() === lowerLang);
      if (!selectedTrack) selectedTrack = tracks.find((t) => t.languageCode.toLowerCase().includes(lowerLang));
    }
    if (!selectedTrack) {
      selectedTrack = tracks.find((t) => t.languageCode.toLowerCase().startsWith("en") && !t.isTranslatable);
      if (!selectedTrack) selectedTrack = tracks.find((t) => t.languageCode.toLowerCase().startsWith("en"));
    }
    if (!selectedTrack) {
      selectedTrack = tracks[0];
    }
    if (!selectedTrack) {
      console.warn("[Subtitles] No suitable caption track found");
      return [];
    }
    console.log(`[Subtitles] Selected track: ${selectedTrack.languageCode} (${selectedTrack.isTranslatable ? "ASR/Auto" : "Manual"})`);
    const urlWithFormat = selectedTrack.baseUrl.includes("&fmt=") ? selectedTrack.baseUrl : `${selectedTrack.baseUrl}&fmt=srv3`;
    console.log(`[Subtitles] Fetching transcript from: ${urlWithFormat.substring(0, 100)}...`);
    const transcriptResponse = await fetch(urlWithFormat, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com"
      }
    });
    const transcriptData = await transcriptResponse.text();
    let transcripts = [];
    if (transcriptData.trim().startsWith("<?xml") || transcriptData.includes("<transcript>") || transcriptData.includes("<text start=")) {
      transcripts = parseXmlTranscriptRegex(transcriptData);
    } else {
      try {
        const json = JSON.parse(transcriptData);
        if (json.events) {
          transcripts = json.events.map((e) => ({
            start: e.tStartMs / 1e3,
            duration: e.dDurationMs / 1e3,
            text: (e.segs ? e.segs.map((s) => s.utf8).join("") : "").replace(/\n/g, " ").trim()
          })).filter((s) => s.text);
        }
      } catch (e) {
        console.warn("[Subtitles] Failed to parse transcript string as JSON/XML.");
      }
    }
    console.log(`[Subtitles] Retrieved ${transcripts.length} segments.`);
    return transcripts;
  } catch (error) {
    console.error(`[Subtitles] Error fetching subtitles for video ${videoId}:`, error);
    return [];
  }
}

// src/base.ts
var Base = class {
  constructor(client) {
    this.client = client;
  }
  client;
};

// src/continuable.ts
var Continuable = class extends Base {
  items = [];
  continuation = void 0;
  async next(count) {
    const newItems = [];
    if (count === void 0) {
      const result = await this.fetch();
      this.items.push(...result.items);
      this.continuation = result.continuation ?? null;
      newItems.push(...result.items);
    } else {
      while (newItems.length < count) {
        if (this.items.length > 0 && (this.continuation === null || this.continuation === void 0)) {
          break;
        }
        const result = await this.fetch();
        if (result.items.length === 0) {
          this.continuation = result.continuation ?? null;
          break;
        }
        this.items.push(...result.items);
        this.continuation = result.continuation ?? null;
        newItems.push(...result.items);
      }
    }
    return newItems;
  }
};

// src/thumbnails.ts
var Thumbnails = class {
  list;
  constructor(list) {
    this.list = list;
  }
  getBestResolution() {
    if (!this.list || this.list.length === 0) {
      return void 0;
    }
    let best = this.list[0];
    let maxResolution = best.width * best.height;
    for (let i = 1; i < this.list.length; i++) {
      const thumb = this.list[i];
      const resolution = thumb.width * thumb.height;
      if (resolution > maxResolution) {
        maxResolution = resolution;
        best = thumb;
      }
    }
    return best;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Base,
  Client,
  Continuable,
  Thumbnails,
  createCommentsApiRequestOptions,
  extractPlayerResponse,
  extractVideoEntries,
  fetchCommentsFromYouTube,
  fetchInnerTubeFeed,
  fetchSubtitlesFromYouTube,
  fetchYtInitialData,
  findContinuationToken,
  getInnerTubeConfig,
  getSApiSidHash,
  getSapisidFromCookie,
  parseXmlTranscriptRegex,
  scrapeTasteData
});
