# Image slots and AI-image prompts

Drop the finished files into `web/public/img/`. For each slot, export a master at the listed size; the build will generate AVIF/WebP variants at 640/1080/1600/2400 px wide. Until a file exists, the UI shows a CSS gradient + SVG silhouette placeholder (never a broken image).

**House style (append to every prompt):** editorial high-fashion product photography, shallow depth of field, clean negative space, no text, no logos, no people's faces, no brand marks, photorealistic, 50–85mm lens look, subtle film grain.

**Palettes:** *Aqua*: cyan/teal haze (#12B3D6 → #2EC9C4), soft smoke or liquid textures. *Studio black*: pure black backdrop (#0B0B0C), dramatic rim light, one orange-red accent light (#FF4A0A) at most. *Bright neutral*: off-white seamless (#F3F4F5), soft daylight.

| # | Filename | Slot | Aspect / master | Prompt |
|---|---|---|---|---|
| 1 | `hero-fallback.jpg` | Hero static fallback (behind the WebGL fluid) | 9:16 1440×2560 and 16:9 2560×1440 | Abstract flowing aqua liquid and soft smoke, cyan to teal gradient, slow silky folds, luminous highlights, no objects, aqua palette |
| 2 | `collage-solar.jpg` | Collage card, solar home kit | 4:5 1600×2000 | Compact solar home kit (small panel, battery box, two cables) on a floating plinth in aqua mist, soft top light, aqua palette |
| 3 | `collage-freezer.jpg` | Collage card, chest freezer | 1:1 1600×1600 | White chest freezer with lid slightly open, cold vapor spilling out into cyan haze, low angle, aqua palette |
| 4 | `collage-battery.jpg` | Collage card, e-bike battery | 3:4 1500×2000 | Matte black e-bike battery pack standing upright, rim-lit edges, single orange-red accent light on one side, studio black palette |
| 5 | `collage-laundry.jpg` | Collage card, laundry machine | 4:5 1600×2000 | Front-loading washing machine, door glass catching aqua reflections, water swirl visible inside, aqua palette |
| 6 | `collage-bulb.jpg` | Collage card, glowing bulb | 1:1 1600×1600 | Single filament bulb glowing warm orange in darkness, faint smoke around it, studio black palette |
| 7 | `collage-esp32.jpg` | Collage card, ESP32 + relay | 3:2 2000×1333 | Macro shot of a bare microcontroller dev board wired to a small blue relay module, generic board with no readable markings, shallow focus, studio black palette with a cyan rim light |
| 8 | `panel-solar.jpg` | Use-case panel "Solar Home Kits" | 9:16 1440×2560 + 16:9 2560×1440 | Solar panel on a corrugated rooftop at dusk, teal sky, warm light from a window below, moody and editorial, no people |
| 9 | `panel-freezer.jpg` | Use-case panel "Shared Freezers" | 9:16 + 16:9 | Row of chest freezers in a dim shared storage room, one lit from inside with cyan glow, dark surroundings |
| 10 | `panel-ebike.jpg` | Use-case panel "E-bike Batteries" | 9:16 + 16:9 | Battery swap cabinet with glowing slots at night, one battery half pulled out, wet pavement reflections, aqua palette |
| 11 | `device-studio.jpg` | Virtual device card background | 4:5 1600×2000 | Empty black studio sweep with a single soft spotlight pool and thin haze, studio black palette (the device UI sits on top) |
| 12 | `phone-pay.jpg` | Phone showing pay screen | 4:5 1600×2000 | Hand holding a modern phone at an angle, screen area kept blank and evenly lit (we composite the real UI), aqua background, bright neutral light on hand |
| 13 | `operator-card.jpg` | "Operator Plan" card in hand | 4:5 1600×2000 | Two hands holding a matte off-white card with the words "Operator Plan" in a bold grotesk typeface, centered, bright neutral palette, soft shadow. If the text renders badly, generate it blank and we add the text in CSS |
| 14 | `closing.jpg` | Optional texture behind the closing CTA | 16:9 2560×1440 | Very dark abstract smoke with a faint orange-red edge glow, mostly black, studio black palette |
| 15 | `og-image.jpg` | Social share card | 1200×630 | Aqua fluid background like #1 with empty space on the left for the wordmark |

Licensing: generate them with a tool whose terms let you use the output commercially, and keep the prompts in this file as the record.
