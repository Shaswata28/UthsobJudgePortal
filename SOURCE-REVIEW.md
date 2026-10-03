# Competition photo review

All 192 entries have been imported into Supabase:

- Mobile: 117 entries and photographs.
- Device: 60 entries and photographs.
- Story: 15 entries with 113 photographs.

The private `photos` bucket contains 290 high-quality viewing JPEGs. All storage paths were verified, and sample images from every category loaded successfully. Full-resolution originals remain in the local source folders; they have not been uploaded.

## Story corrections

- S-004 now has all 10 photographs.
- S-014 and S-015 now contain different photographs; no images are shared across stories.
- The existing preview order for S-004 and S-013 was retained as instructed by the user and recorded in `data/story-order.json`.
- Every story has photographs, the database sequences match the prepared manifest, and no preparation warnings remain.

Names/titles come from filenames and folder names because no Excel workbooks were supplied. Some long titles are truncated at the source; original workbook metadata or admin editing can restore them.

Mobile M-050 and M-099 were HEIC files (M-099 had a `.jpg` extension). Browser-compatible previews and full-resolution JPEG copies were created without altering either source file.

The separate `Selected Photos/Faculty` folder was excluded because the brief defines only Mobile, Device, and Story categories.
