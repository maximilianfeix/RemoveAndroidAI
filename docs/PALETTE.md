# RemoveAndroidAI palette

A quiet teal identity built around a phone and a left-positioned off switch.
Rounded corners make it approachable; a heavy outline keeps the mark clear at
16 px. The geometry is hand-written and uses no third-party brand artwork.
The small wink lives in the copy: “Room to breathe.”

## Theme colors

Six colors per theme. Accent and success share teal; warning and danger share
an attention color. Always distinguish states with explicit labels and suitable
icons, never color alone. Reserve warning/danger for actual product messages.

| Token / role | Dark | Light | Use |
| --- | --- | --- | --- |
| Background | `#142B32` | `#F5FAF8` | Page and banner canvas |
| Surface | `#203D45` | `#E5EFEB` | Raised panels and grouped controls |
| Text | `#F5FAF8` | `#142B32` | Headings, wordmark, primary copy |
| Muted | `#B2C7CA` | `#47646B` | Supporting copy and captions |
| Accent / success | `#83D9C3` | `#176B58` | Primary actions, links, confirmed outcomes |
| Warning / danger | `#FFB49B` | `#9A3D25` | Attention, errors, destructive-action labels |

The standalone mark and favicon retain their dark tile and mint switch in both
themes. This fixed brand asset is independent of light-theme UI accent tokens.
Dark banners use the surface color behind the phone to separate the tile from
the canvas.

## WCAG AA contrast

Calculated from sRGB relative luminance; ratios are rounded to two decimals.
Each cell gives contrast against **background / surface**, in that order.

| Foreground role | Dark ratios | Light ratios |
| --- | --- | --- |
| Text | 14.01:1 / 10.97:1 | 14.01:1 / 12.58:1 |
| Muted | 8.38:1 / 6.57:1 | 6.03:1 / 5.41:1 |
| Accent / success | 8.92:1 / 6.99:1 | 6.07:1 / 5.45:1 |
| Warning / danger | 8.62:1 / 6.75:1 | 6.49:1 / 5.83:1 |

All listed foreground/background combinations exceed AA's 4.5:1 threshold for
normal text, 3:1 for large text, and 3:1 for essential graphical elements.
For filled accent or attention buttons, use the theme's **background** color
for the label; the same ratios apply in reverse. Do not use pale text on mint.
Surface/background separation is decorative and below 3:1; essential control
boundaries and focus rings need an accent or muted outline. Underline text links.
These contrast results describe the palette, not certification of a future UI.

## Typography and assets

```css
font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

Use weight 700 for the wordmark and storage figure, 400 for supporting text.
No web fonts. SVG text stays editable; exact metrics depend on installed fonts.
Keep the wordmark as `RemoveAndroidAI`, with no accent on individual words.

- `mark.svg`: 512 × 512, the primary app tile; usable down to 16 × 16.
- `favicon.svg`: 32 × 32 viewBox; the same essential geometry at favicon scale.
- `banner-dark.svg` and `banner-light.svg`: 1200 × 300 README headers.
- `social-preview.svg`: 1280 × 640, with “Up to” qualifying “7 GB back”.

Keep the “up to” qualifier whenever quoting storage savings. Pair the benefit
with the reassurance that every step can be undone. Use the mark at a square
aspect ratio without stretching, additional symbols, shadows, or gradients.
