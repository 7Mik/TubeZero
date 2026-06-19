---
id: quickstart
title: Quick Start
sidebar_label: Quick Start
slug: /
---

## Installation

```bash
npm install tubezero
```

## Example

```javascript
import { Client } from "tubezero";

const youtube = new Client();

(async () => {
    // Search for a video
    const result = await youtube.search("Never gonna give you up", { type: "video" });
    console.log(`Found ${result.items.length} items.`);

    // Get a specific video
    const video = await youtube.getVideo("dQw4w9WgXcQ");
    console.log(`Video Title: "${video.title}"`);
    console.log(`Views: ${video.viewCount}`);
})();
```
