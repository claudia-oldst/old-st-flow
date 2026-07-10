## Problem

Uploading a `.csv` to a ticket comment fails with "Invalid url".

## Root cause

`src/features/comments/uploadCommentAttachment.ts` stores attachments with `url: ""` — signed URLs are generated on demand later via `getAttachmentSignedUrl(path)`. But `src/lib/schemas/comment.ts` requires `url: z.string().url()`, so the empty string fails Zod validation at submit time. This actually affects every attachment; CSV just happens to be what the user tried.

There is no MIME-type restriction — file kind isn't the issue.

## Fix

In `src/lib/schemas/comment.ts`, relax the `url` field on `commentAttachmentSchema` to allow empty strings (the real URL is signed on read):

```ts
url: z.string().url().or(z.literal("")),
```

Leave everything else — storage upload path, kind detection (`image`/`video`/`file`), 25 MB cap, 10-file cap — untouched.

## Verification

- Attach a `.csv`, submit — comment posts without a "Invalid url" toast.
- Existing image/video attachments still work.
- `src/lib/schemas/comment.test.ts` still passes (its fixture uses a valid URL).