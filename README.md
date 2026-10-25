# Dauntless Loadout Finder

A tool that finds the weapon, armor and cell combination for the perk totals you want in
Dauntless (game version 1.14.x). Pick perks at +3 or +6, and the tool searches every weapon, armor
piece and the lantern slot and shows which cell goes where. Saved loadouts are stored in your browser.

## Project structure

```
.
├── index.html                  page markup
├── assets/
│   ├── css/styles.css          all styling (light and dark mode)
│   └── js/
│       ├── app.js              search and UI logic
│       └── buildcode.js        reads and writes the build codes of this tool (DLF1.…)
├── data/
│   ├── game-data.js            generated game data as a script (what the page loads)
│   └── game-data.json          the same data as plain JSON, for other tools
├── scripts/
│   └── build_data.py           builds data/game-data.json from the upstream data
├── .github/workflows/
│   ├── deploy.yml              publishes the site to GitHub Pages on every push to main
│   └── update-data.yml         manual workflow: refreshes game-data.json from upstream
├── NOTICE.md                   credits and licenses of data and icons
└── LICENSE
```

All paths are relative, so the site works at `https://<user>.github.io/<repo>/` as well as on a custom domain.

## Run locally

Unzip the whole folder and open `index.html` in your browser. No server is needed, because the data is loaded
from `data/game-data.js` with a normal script tag.

## Update the game data

The data comes from [Dauntless Builder Reforged](https://github.com/atomicptr/dauntless-builder-reforged).

```bash
git clone --depth 1 https://github.com/atomicptr/dauntless-builder-reforged.git vendor/dauntless-builder-reforged
pip install pyyaml
python3 scripts/build_data.py
```

This rewrites `data/game-data.js` and `data/game-data.json`. You can also run the **Update game data** workflow from the Actions tab.
The format of the generated file is described at the top of `scripts/build_data.py` and in the comments of its output section.

## Import and export

Press **⇪ Export** on a build to get a `DLF1.…` code. Paste a code into **Import** to see the build again and to use its
perks, weapon, lantern and omnicell as the new targets. The codes only work in this tool. They store item keys (the data
file paths) and the cells by perk name, see `assets/js/buildcode.js`.

## Lantern and omnicell

Pick a lantern and an omnicell in the options to plan the whole build. A lantern with an Insight slot gives the search one
more cell slot, and the Recruit's Lantern has none. The omnicell does not change perk totals, it is shown in the build with
its effect.

## Gear you don't have

Every weapon and armor piece in the build results has a **✕ Don't have** button. It searches again without that
item (for a legendary weapon you can exclude the legendary or its bond partner). Excluded gear is listed above the
results, where you can put single items back or **Reset all**. The list is stored in the browser (`localStorage`).

## Icons

Item pictures are small webp files in `assets/icons/<item key>.webp`, made from the 128 px images of Dauntless
Builder Reforged by `scripts/build_icons.py` (needs `pip install pillow`). The six cell family symbols are in
`assets/icons/cells/` and are drawn as a mask, so they take the colour of their family. Browsers do not load mask images
from `file://` paths, so the same six images are also stored as data URIs in `assets/js/cell-icons.js` (written by the same script). The images are artwork of Phoenix Labs.

## How the rules are modelled

- Every armor piece has one perk and one cell slot of a fixed family (Alacrity, Brutality, Finesse, Fortitude or Insight).
- Weapons have two cell slots. Legendary weapons have two Prismatic slots and copy the perk of the weapon they are bonded with.
- The lantern has one Insight slot. A Prismatic slot accepts any cell.
- A perk is capped at +6. Power surged gear gives +3 per perk, cells give +1 to +3.

Omnicells and weapon parts do not change perk totals and are not included.

## License and credits

See [NOTICE.md](NOTICE.md). This is a fan project and is not affiliated with Phoenix Labs.
