# Class: Comment

Represents a Comment or Reply thread.

## Hierarchy

*   `Base`
    *   **`Comment`**

## Properties

### `id: string`
The comment ID.

### `video: Video`
The video instance this comment belongs to.

### `author: BaseChannel`
The author channel metadata of this comment.

### `content: string`
The content text of the comment.

### `publishDate: string`
Literal string of when the comment was published (e.g. `"2 days ago"`).

### `likeCount: number`
Total likes received on this comment.

### `isAuthorChannelOwner: boolean`
Whether the comment author is the owner/uploader of the video.

### `isPinned: boolean`
Whether the comment is pinned to the top of the comment section.

### `replyCount: number`
Number of replies under this comment.

### `replies: CommentReplies`
A continuable list of replies to this comment. Inherits from `Continuable<Comment>`.

### `url: string`
Returns a link directly to the highlighted comment on YouTube.

## Example

```javascript
const comments = await video.comments.next(10);
const first = comments[0];

console.log(first.author.name); // "@YouTube"
console.log(first.content); // "can confirm: he never gave us up..."
console.log(first.replyCount); // 960

// Fetch replies
if (first.replyCount > 0) {
    const replies = await first.replies.next(5);
    console.log(replies.length); // 5 replies loaded
}
```
