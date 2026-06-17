import { BaseChannel } from './base-channel.js';
import { Thumbnails } from './thumbnails.js';
import type { Client } from './client.js';

export interface ChannelShelf {
    title: string;
    subtitle?: string;
    items: any[];
}

export class Channel extends BaseChannel {
    public videoCount?: string;
    public banner: Thumbnails;
    public mobileBanner: Thumbnails;
    public tvBanner: Thumbnails;
    public shelves: ChannelShelf[];

    constructor(client: Client, data?: any) {
        super(client, data);
        this.banner = new Thumbnails([]);
        this.mobileBanner = new Thumbnails([]);
        this.tvBanner = new Thumbnails([]);
        this.shelves = [];

        if (data) {
            this.load(data);
        }
    }

    public load(data: any): Channel {
        super.load(data);

        const headerObj = data.header?.c4TabbedHeaderRenderer || 
                          data.header?.pageHeaderRenderer || 
                          data.c4TabbedHeaderRenderer || 
                          data;

        // Try pageHeaderRenderer structure
        const viewModel = headerObj.content?.pageHeaderViewModel;
        if (viewModel) {
            this.banner = new Thumbnails(viewModel.banner?.imageBannerViewModel?.image?.sources || []);
            this.handle = viewModel.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || this.handle;
            this.description = viewModel.description?.descriptionPreviewViewModel?.description?.content || this.description;

            const rows = viewModel.metadata?.contentMetadataViewModel?.metadataRows || [];
            for (const row of rows) {
                for (const part of row.metadataParts || []) {
                    const txt = part.text?.content || '';
                    if (txt.includes('video')) {
                        this.videoCount = txt;
                    }
                }
            }
        }

        // Try c4TabbedHeaderRenderer structure
        if (headerObj.channelId) {
            this.videoCount = headerObj.videosCountText?.runs?.[0]?.text || headerObj.videosCountText?.simpleText || this.videoCount;
            this.banner = new Thumbnails(headerObj.banner?.thumbnails || []);
            this.tvBanner = new Thumbnails(headerObj.tvBanner?.thumbnails || []);
            this.mobileBanner = new Thumbnails(headerObj.mobileBanner?.thumbnails || []);
        }

        // Parse shelves
        this.shelves = [];
        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const homeTab = tabs.find((t: any) => t.tabRenderer?.selected || t.tabRenderer?.title?.toLowerCase() === 'home');
        const sectionList = homeTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const section of sectionList) {
            const shelf = section.itemSectionRenderer?.contents?.[0]?.shelfRenderer;
            if (shelf) {
                const title = shelf.title?.simpleText || shelf.title?.runs?.[0]?.text || '';
                const subtitle = shelf.subtitle?.simpleText || shelf.subtitle?.runs?.[0]?.text || undefined;
                const items: any[] = [];

                const gridItems = shelf.content?.horizontalListRenderer?.items || shelf.content?.gridRenderer?.items || [];
                for (const item of gridItems) {
                    if (item.gridVideoRenderer) {
                        items.push(item.gridVideoRenderer);
                    } else if (item.gridPlaylistRenderer) {
                        items.push(item.gridPlaylistRenderer);
                    } else if (item.gridChannelRenderer) {
                        items.push(item.gridChannelRenderer);
                    }
                }

                this.shelves.push({ title, subtitle, items });
            }
        }

        return this;
    }
}
