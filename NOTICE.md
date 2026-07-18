# Notice — third-party images

The sample images in this repository are **not** original work and are **not** covered by this project's
licence. They are third-party stock photographs used as local demo data.

## Affected paths

- `refrance-images/` — the source files
- `public/fixtures/*.webp` — renditions derived from those same source files

## What this means

- Several of these files carry **visible iStock watermarks** baked into the pixels.
- They are included here as demo fixtures only. Redistribution rights have **not** been verified.
- If you fork, deploy, or otherwise reuse this project, **replace these images.** Do not treat their
  presence here as a grant of any licence.
- The screenshots on the project page (`docs/img/`) deliberately use **generated placeholder artwork**
  instead, so the public page carries no third-party imagery.

## To remove them

```bash
git rm -r --cached refrance-images public/fixtures
printf 'refrance-images/\npublic/fixtures/\n' >> .gitignore
```

The app runs without them; fixture routes will simply render missing images until new files are supplied.
