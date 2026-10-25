# Changelog

## Unreleased

- Catalog: Bixby Voice (`com.samsung.android.bixby.agent`) moved from safe to caution after a report of a CPU loop on a Galaxy S25.

## 0.2.1 (2026-10-25)

- Web app: fix the page on GitHub Pages. The build referenced `/assets/…` instead of a relative path, so the script never loaded under `/RemoveAndroidAI/` and Connect did nothing. CI now fails if the build uses absolute asset URLs.

## 0.2.0 (2026-10-25)

- Web app: demo mode at `?demo` runs the whole flow against a simulated Pixel 9, so you can see what it does without a phone.
- Web app: hidden buttons ("Undo last run", "Download undo file") no longer show before they apply.
- Web app: link to a device report after each run.
- Issue forms for device reports and package additions.
- README: screenshots, badges, demo link.

## 0.1.0 (2026-10-25)

- First release: web app (WebUSB) and CLI (adb) sharing one core.
- Catalog of 41 AI packages across Google, Samsung, Xiaomi, Motorola and OnePlus/Oppo, with sources and UAD-ng levels.
- Tiers safe, caution and never; undo record for every run; free space measured before and after.
