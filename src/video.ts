import { BaseVideo } from './base-video.js';
import { VideoComments } from './comment.js';
import { Thumbnails } from './thumbnails.js';
import type { Client } from './client.js';

export interface Chapter {
    title: string;
    start: number; // in milliseconds
    thumbnails: Thumbnails;
}

export interface MusicMetadata {
    imageUrl: string;
    title: string;
    artist: string;
    album?: string | null;
}

export class Video extends BaseVideo {
    public duration: number;
    public chapters: Chapter[];
    public comments: VideoComments;
    public music: MusicMetadata | null;

    constructor(client: Client, data: any) {
        super(client);
        this.duration = 0;
        this.chapters = [];
        this.music = null;
        this.comments = new VideoComments(client, this);

        this.load(data);
    }

    public load(data: any): Video {
        super.parse(data);

        const videoDetails = data.videoDetails || data.playerResponse?.videoDetails || {};
        this.duration = parseInt(videoDetails.lengthSeconds || '0', 10);

        // Parse chapters if exists
        this.chapters = [];
        const markersMap = data.response?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap;
        const chaptersList = markersMap?.[0]?.value?.chapters || [];
        for (const chap of chaptersList) {
            const renderer = chap.chapterRenderer;
            if (renderer) {
                this.chapters.push({
                    title: renderer.title?.simpleText || renderer.title?.runs?.[0]?.text || '',
                    start: renderer.timeRangeStartMillis || 0,
                    thumbnails: new Thumbnails(renderer.thumbnail?.thumbnails || [])
                });
            }
        }

        // Parse music metadata
        this.music = null;
        const panels = data.response?.engagementPanels || [];
        const structuredPanel = panels.find((p: any) => p.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer);
        const descriptionItems = structuredPanel?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items || [];
        
        const musicItem = descriptionItems.find((i: any) => i.horizontalCardListRenderer?.footerButton?.buttonViewModel?.iconName === 'MUSIC' || i.horizontalCardListRenderer?.cards?.some((c: any) => c.videoAttributeViewModel));
        if (musicItem) {
            const card = musicItem.horizontalCardListRenderer?.cards?.find((c: any) => c.videoAttributeViewModel)?.videoAttributeViewModel;
            if (card) {
                this.music = {
                    imageUrl: card.image?.sources?.[0]?.url || '',
                    title: card.title || '',
                    artist: card.subtitle || '',
                    album: card.secondarySubtitle?.content || null
                };
            }
        }

        // Parse comments continuation token
        const watchNextResults = data.response?.contents?.twoColumnWatchNextResults || data.contents?.twoColumnWatchNextResults;
        const contents = watchNextResults?.results?.results?.contents || [];
        
        let commentToken: string | null = null;
        for (const content of contents) {
            const itemSection = content.itemSectionRenderer;
            if (itemSection?.contents) {
                for (const item of itemSection.contents) {
                    if (item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
                        commentToken = item.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
                        break;
                    }
                    if (item.commentsEntryPointHeaderRenderer?.content?.commentsEntryPointHeaderRenderer?.headerText?.runs?.[0]?.navigationEndpoint?.continuationCommand?.token) {
                        commentToken = item.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.headerText.runs[0].navigationEndpoint.continuationCommand.token;
                        break;
                    }
                }
            }
            if (commentToken) break;
        }

        // Search in engagement panels if not found in twoColumnWatchNextResults
        if (!commentToken) {
            for (const panel of panels) {
                const token = panel.engagementPanelSectionListRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
                if (token) {
                    commentToken = token;
                    break;
                }
            }
        }

        this.comments.continuation = commentToken;

        return this;
    }
}
