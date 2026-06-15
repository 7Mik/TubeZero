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
  BaseVideo: () => BaseVideo,
  ChannelCompact: () => ChannelCompact,
  Client: () => Client,
  Continuable: () => Continuable,
  Playlist: () => Playlist,
  PlaylistCompact: () => PlaylistCompact,
  PlaylistVideos: () => PlaylistVideos,
  SearchResult: () => SearchResult,
  Thumbnails: () => Thumbnails,
  Video: () => Video,
  VideoCompact: () => VideoCompact,
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
  iteratorIndex = 0;
  async next(count) {
    const newItems = [];
    if (count === void 0) {
      if (this.iteratorIndex < this.items.length) {
        const unread = this.items.slice(this.iteratorIndex);
        this.iteratorIndex = this.items.length;
        return unread;
      }
      if (this.continuation === null) {
        return [];
      }
      const result = await this.fetch();
      this.items.push(...result.items);
      this.continuation = result.continuation ?? null;
      newItems.push(...result.items);
      this.iteratorIndex = this.items.length;
    } else {
      let emptyPageCount = 0;
      while (newItems.length < count) {
        if (this.iteratorIndex < this.items.length) {
          const take = Math.min(count - newItems.length, this.items.length - this.iteratorIndex);
          newItems.push(...this.items.slice(this.iteratorIndex, this.iteratorIndex + take));
          this.iteratorIndex += take;
        }
        if (newItems.length >= count || this.continuation === null) {
          break;
        }
        const result = await this.fetch();
        this.items.push(...result.items);
        this.continuation = result.continuation ?? null;
        if (result.items.length === 0) {
          emptyPageCount++;
          if (this.continuation === null || emptyPageCount >= 3) {
            break;
          }
        } else {
          emptyPageCount = 0;
        }
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
    let maxResolution = (best.width || 0) * (best.height || 0);
    for (let i = 1; i < this.list.length; i++) {
      const thumb = this.list[i];
      const resolution = (thumb.width || 0) * (thumb.height || 0);
      if (resolution > maxResolution) {
        maxResolution = resolution;
        best = thumb;
      }
    }
    return best;
  }
};

// src/video-compact.ts
var VideoCompact = class extends Base {
  id;
  title;
  thumbnails;
  duration;
  isLive;
  channel;
  viewCount;
  publishedAt;
  constructor(client, data) {
    super(client);
    let videoId = "";
    let titleText = "";
    let durationSec = null;
    let isLive = false;
    let viewCountNum = null;
    let pubAt = null;
    let thumbnails = [];
    let channelObj = void 0;
    if (data.videoId) {
      videoId = data.videoId;
      titleText = data.title?.simpleText || data.title?.runs?.[0]?.text || "";
      thumbnails = data.thumbnail?.thumbnails || [];
      if (data.lengthText) {
        const text = data.lengthText.simpleText || data.lengthText.runs?.[0]?.text || "";
        durationSec = this.parseDuration(text);
      }
      if (data.badges?.some((b) => b.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW")) {
        isLive = true;
      }
      if (data.viewCountText) {
        const text = data.viewCountText.simpleText || data.viewCountText.runs?.[0]?.text || "";
        viewCountNum = this.parseViewCount(text);
      }
      if (data.publishedTimeText) {
        pubAt = data.publishedTimeText.simpleText || data.publishedTimeText.runs?.[0]?.text || null;
      }
      const byline = data.shortBylineText || data.longBylineText || data.ownerText;
      if (byline && byline.runs && byline.runs[0]) {
        const run = byline.runs[0];
        channelObj = {
          id: run.navigationEndpoint?.browseEndpoint?.browseId || void 0,
          name: run.text,
          thumbnails: data.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails ? new Thumbnails(data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails) : void 0
        };
      }
    } else if (data.lockupViewModel && data.lockupViewModel.contentId && data.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const model = data.lockupViewModel;
      videoId = model.contentId;
      const meta = model.metadata?.lockupMetadataViewModel;
      titleText = meta?.title?.content || "";
      const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
      let cName = "";
      let vCount = null;
      let pAt = null;
      for (const row of rows) {
        for (const part of row.metadataParts || []) {
          const text = part.text?.content || "";
          if (text.includes("views") || text.includes("watching")) {
            if (text.includes("watching")) isLive = true;
            vCount = this.parseViewCount(text);
          } else if (text.includes("ago")) {
            pAt = text;
          } else {
            cName = text;
          }
        }
      }
      if (cName) {
        channelObj = { name: cName.replace(/•/g, "").trim() };
      }
      viewCountNum = vCount;
      pubAt = pAt;
    }
    this.id = videoId;
    this.title = titleText;
    this.thumbnails = new Thumbnails(thumbnails);
    this.duration = durationSec;
    this.isLive = isLive;
    this.channel = channelObj;
    this.viewCount = viewCountNum;
    this.publishedAt = pubAt;
  }
  parseDuration(text) {
    const parts = text.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }
  parseViewCount(text) {
    const cleaned = text.trim().replace(/,/g, "");
    const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
    if (!match) return null;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return null;
    const suffix = match[2]?.toUpperCase();
    if (suffix === "K") return Math.round(num * 1e3);
    if (suffix === "M") return Math.round(num * 1e6);
    if (suffix === "B") return Math.round(num * 1e9);
    return Math.round(num) || null;
  }
};

// src/playlist-compact.ts
var PlaylistCompact = class extends Base {
  id;
  title;
  thumbnails;
  videoCount;
  channel;
  constructor(client, data) {
    super(client);
    let playlistId = "";
    let titleText = "";
    let thumbnails = [];
    let videoCountNum = null;
    let channelObj = void 0;
    if (data.playlistId) {
      playlistId = data.playlistId;
      titleText = data.title?.simpleText || data.title?.runs?.[0]?.text || "";
      thumbnails = data.thumbnails?.[0]?.thumbnails || data.thumbnail?.thumbnails || [];
      if (data.videoCount) {
        const parsed = parseInt(data.videoCount, 10);
        videoCountNum = isNaN(parsed) ? null : parsed;
      } else if (data.videoCountText) {
        const text = data.videoCountText.runs?.[0]?.text || data.videoCountText.simpleText || "";
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) videoCountNum = parseInt(cleaned, 10);
      }
      const byline = data.shortBylineText || data.longBylineText || data.ownerText;
      if (byline && byline.runs && byline.runs[0]) {
        const run = byline.runs[0];
        channelObj = {
          id: run.navigationEndpoint?.browseEndpoint?.browseId || void 0,
          name: run.text
        };
      }
    }
    this.id = playlistId;
    this.title = titleText;
    this.thumbnails = new Thumbnails(thumbnails);
    this.videoCount = videoCountNum;
    this.channel = channelObj;
  }
};

// src/channel-compact.ts
var ChannelCompact = class extends Base {
  id;
  name;
  thumbnails;
  subscriberCount;
  constructor(client, data) {
    super(client);
    let channelId = "";
    let nameText = "";
    let thumbnails = [];
    let subCount = null;
    if (data.channelId) {
      channelId = data.channelId;
      nameText = data.title?.simpleText || data.title?.runs?.[0]?.text || "";
      thumbnails = data.thumbnail?.thumbnails || [];
      if (data.subscriberCountText) {
        subCount = data.subscriberCountText.simpleText || data.subscriberCountText.runs?.[0]?.text || null;
      } else if (data.videoSubscriberCountText) {
        subCount = data.videoSubscriberCountText.simpleText || data.videoSubscriberCountText.runs?.[0]?.text || null;
      }
    }
    this.id = channelId;
    this.name = nameText;
    this.thumbnails = new Thumbnails(thumbnails);
    this.subscriberCount = subCount;
  }
};

// src/search-result.ts
var SearchResult = class _SearchResult extends Continuable {
  constructor(client, initialData) {
    super(client);
    const { items, continuation } = _SearchResult.parseData(client, initialData);
    this.items = items;
    this.continuation = continuation;
  }
  async fetch() {
    if (!this.continuation) {
      return { items: [], continuation: null };
    }
    const data = await this.client.request("search", {
      continuation: this.continuation
    });
    return _SearchResult.parseData(this.client, data);
  }
  static parseData(client, data) {
    const items = [];
    let continuation = null;
    function traverse(obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (const item of obj) traverse(item);
        return;
      }
      if (obj.videoRenderer || obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
        items.push(new VideoCompact(client, obj.videoRenderer || obj));
        return;
      }
      if (obj.playlistRenderer) {
        items.push(new PlaylistCompact(client, obj.playlistRenderer));
        return;
      }
      if (obj.channelRenderer) {
        items.push(new ChannelCompact(client, obj.channelRenderer));
        return;
      }
      if (obj.continuationCommand && obj.continuationCommand.token) {
        continuation = obj.continuationCommand.token;
      } else if (obj.continuationItemRenderer?.continuationEndpoint) {
        continuation = obj.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || null;
      }
      for (const key of Object.keys(obj)) {
        traverse(obj[key]);
      }
    }
    traverse(data);
    return { items, continuation };
  }
};

// src/base-video.ts
var BaseVideo = class extends Base {
  id;
  title;
  description;
  thumbnails;
  viewCount;
  publishDate;
  channel;
  isLive;
  constructor(client, data) {
    super(client);
    this.id = "";
    this.title = "";
    this.description = "";
    this.thumbnails = new Thumbnails([]);
    this.viewCount = null;
    this.publishDate = null;
    this.isLive = false;
    this.parse(data);
  }
  parse(data) {
    const videoDetails = data.videoDetails || data.microformat?.playerMicroformatRenderer || {};
    this.id = videoDetails.videoId || "";
    this.title = typeof videoDetails.title === "string" ? videoDetails.title : videoDetails.title?.simpleText || videoDetails.title?.runs?.[0]?.text || "";
    this.description = videoDetails.shortDescription || videoDetails.description?.simpleText || videoDetails.description?.runs?.map((r) => r.text).join("") || "";
    this.thumbnails = new Thumbnails(videoDetails.thumbnail?.thumbnails || []);
    this.viewCount = videoDetails.viewCount ? parseInt(videoDetails.viewCount, 10) : null;
    this.isLive = videoDetails.isLiveContent || false;
    this.publishDate = videoDetails.publishDate || null;
    this.channel = {
      name: videoDetails.author || videoDetails.ownerChannelName || "",
      id: videoDetails.channelId || videoDetails.externalChannelId || ""
    };
  }
};

// src/video.ts
var Video = class extends BaseVideo {
  // We will expand this with related videos, comments pagination, and chapters in Sprints 3 & 4.
  constructor(client, data) {
    super(client, data);
  }
};

// src/playlist.ts
var PlaylistVideos = class _PlaylistVideos extends Continuable {
  constructor(client, initialData) {
    super(client);
    const { items, continuation } = _PlaylistVideos.parseData(client, initialData);
    this.items = items;
    this.continuation = continuation;
  }
  async fetch() {
    if (!this.continuation) {
      return { items: [], continuation: null };
    }
    const data = await this.client.request("browse", {
      continuation: this.continuation
    });
    return _PlaylistVideos.parseData(this.client, data);
  }
  static parseData(client, data) {
    const items = [];
    let continuation = null;
    function traverse(obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (const item of obj) traverse(item);
        return;
      }
      if (obj.playlistVideoRenderer) {
        items.push(new VideoCompact(client, obj.playlistVideoRenderer));
        return;
      }
      if (obj.continuationCommand && obj.continuationCommand.token) {
        continuation = obj.continuationCommand.token;
      } else if (obj.continuationItemRenderer && obj.continuationItemRenderer.continuationEndpoint) {
        continuation = obj.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
      }
      for (const key of Object.keys(obj)) {
        traverse(obj[key]);
      }
    }
    traverse(data);
    return { items, continuation };
  }
};
var Playlist = class extends Base {
  id;
  title;
  videoCount;
  viewCount;
  lastUpdated;
  channel;
  videos;
  constructor(client, data) {
    super(client);
    this.id = "";
    this.title = "";
    this.videoCount = 0;
    this.viewCount = 0;
    this.lastUpdated = "";
    this.parse(data);
    this.videos = new PlaylistVideos(client, data);
  }
  parse(data) {
    let header = data.header?.playlistHeaderRenderer;
    let pageHeader = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
    if (header) {
      this.id = header.playlistId || "";
      this.title = header.title?.simpleText || header.title?.runs?.[0]?.text || "";
      const numVideosRaw = header.numVideosText?.runs?.[0]?.text || header.numVideosText?.simpleText || "";
      this.videoCount = parseInt(numVideosRaw.replace(/[^0-9]/g, "") || "0", 10);
      const viewCountRaw = header.viewCountText?.simpleText || header.viewCountText?.runs?.[0]?.text || "";
      this.viewCount = parseInt(viewCountRaw.replace(/[^0-9]/g, "") || "0", 10);
      const owner = header.ownerText?.runs?.[0];
      if (owner) {
        this.channel = {
          id: owner.navigationEndpoint?.browseEndpoint?.browseId || void 0,
          name: owner.text
        };
      }
    } else if (pageHeader) {
      this.id = data.microformat?.microformatDataRenderer?.urlCanonical?.split("list=")?.[1]?.split("&")?.[0] || data.responseContext?.serviceTrackingParams?.find((p) => p.params?.find((pp) => pp.key === "browse_id"))?.params?.find((pp) => pp.key === "browse_id")?.value?.replace("VL", "") || "";
      this.title = pageHeader.title?.dynamicTextViewModel?.text?.content || "";
      const rows = pageHeader.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of rows) {
        for (const part of row.metadataParts || []) {
          if (part.avatarStack?.avatarStackViewModel?.text?.content) {
            const rawName = part.avatarStack.avatarStackViewModel.text.content;
            this.channel = { name: rawName.replace(/^by\s+/i, "").trim() };
            const runs = part.avatarStack.avatarStackViewModel.text.commandRuns || [];
            if (runs[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId) {
              this.channel.id = runs[0].onTap.innertubeCommand.browseEndpoint.browseId;
            }
          }
          if (part.text?.content) {
            const text = part.text.content;
            if (text.includes("video")) {
              this.videoCount = parseInt(text.replace(/[^0-9]/g, "") || "0", 10);
            } else if (text.includes("view")) {
              this.viewCount = parseInt(text.replace(/[^0-9]/g, "") || "0", 10);
            }
          }
        }
      }
    }
  }
};

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
    this.cookie = options.cookie !== void 0 ? options.cookie : "";
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
    if (!this.apiKey) {
      throw new Error("[Client] InnerTube API key is not configured.");
    }
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
    const bodyPayload = payload && typeof payload === "object" ? payload : {};
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
  /**
   * Searches YouTube for the given query.
   */
  async search(query, options) {
    const payload = { query };
    if (options?.type === "video") {
      payload.params = "EgIQAQ%3D%3D";
    } else if (options?.type === "playlist") {
      payload.params = "EgIQAw%3D%3D";
    } else if (options?.type === "channel") {
      payload.params = "EgIQAg%3D%3D";
    }
    const data = await this.request("search", payload);
    return new SearchResult(this, data);
  }
  /**
   * Gets metadata for a specific video.
   */
  async getVideo(videoId) {
    const [playerData, nextData] = await Promise.all([
      this.request("player", { videoId }),
      this.request("next", { videoId })
    ]);
    const merged = { ...playerData, ...nextData };
    return new Video(this, merged);
  }
  /**
   * Gets metadata and videos for a specific playlist.
   */
  async getPlaylist(playlistId) {
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = await this.request("browse", { browseId });
    return new Playlist(this, data);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Base,
  BaseVideo,
  ChannelCompact,
  Client,
  Continuable,
  Playlist,
  PlaylistCompact,
  PlaylistVideos,
  SearchResult,
  Thumbnails,
  Video,
  VideoCompact,
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
