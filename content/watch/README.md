# Watch pages

One `.mdx` file per long-form video. The file name is the slug: `content/watch/<slug>.mdx` is served at `/watch/<slug>`, and its plain-markdown transcript at `/md/watch/<slug>`.

This README is ignored (the collection only includes `**/*.mdx`). While this folder holds no `.mdx` files, and no YouTube channel is set in `lib/site.ts` (`channels.youtube.id`), every `/watch` route returns 404 and stays out of the sitemap and nav. Never add a page for a video that isn't published.

## Front matter

```yaml
---
title: "<Video title>"
description: "<One or two sentences, at most 160 characters>"
date: "YYYY-MM-DD"            # publish date
youtubeId: "<11-char id>"     # from the YouTube URL
series: route-teardown        # route-teardown | trail-build | summit-talks
topic: pricing                # positioning | pricing | pipeline | workflows | team | physical-ai | ai-infra
duration: "PT14M32S"          # ISO 8601 (this one reads 14:32)
chapters:                     # optional; becomes VideoObject Clip parts
  - { t: "0:00", label: "Camp 01 · Position" }
  - { t: "3:10", label: "Camp 02 · Price" }
relatedNote: pilot-purgatory-is-a-gtm-problem   # optional: slug of the paired Field Note
takeaways:                    # 3 to 5
  - "…"
  - "…"
  - "…"
draft: false                  # true keeps it off the site
---
```

## Body

The body is the transcript, cleaned up for reading. Plain markdown; `##` headings may mirror the chapters.
