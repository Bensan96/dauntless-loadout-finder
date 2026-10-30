# Dauntless Loadout Finder

A static website that finds the weapon, armor and cell combination for the perk totals you want in
Dauntless (game version 1.14.x). Pick perks at +3 or +6, and the tool searches every weapon, armor
piece and the lantern slot and shows which cell goes where. Saved loadouts are stored in your browser
and selected from the Saved loadouts dropdown.

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
│   ├── build_data.py           builds data/game-data.json from the upstream data
│   └── build_materials.js      refreshes crafting data from the wiki
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

## Publish on GitHub Pages

1. Create a repository and push this folder to the `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow). The site appears at the URL shown in the workflow run.

## Import and export

Use **↗ Share** on a build to copy a link that opens that exact build, or **⇪ Export** to get a compact `DLF3.…` code.
Both preserve the weapon and bond, armor, cells, lantern, omnicell, weapon parts, perk targets, and relevant options.
Paste a code under **Import / export a build code** to restore it. Existing `DLF1.…` and `DLF2.…` codes remain supported.
Share links store the compressed code in the URL fragment, omitting the code and parameter prefixes to reduce link length.
The build is not sent to a server, and older `#build=DLF3.…` links continue to work. Links require the site to be hosted
at a URL other people can access. See `assets/js/buildcode.js`.
Imported builds can be named and saved from their build card; selecting the saved loadout restores that exact gear and cells.
Each saved loadout also remembers its own "Don't have" gear selections. Older saved loadouts without this data load with no exclusions.

## Advanced filters

A collapsed panel under the options, only needed for min-maxing:

- **Exotic pieces:** don't use exotics (default), allow them, or require at least one exotic piece in the build.
- **Escalation gear:** allow it (default), don't use it, or require at least one piece. Escalation gear is everything from the six
  keystone Behemoths (Malkarion, Torgadoro, Thrax, Agarus, Urska, Chronovore), including all legendary (bond) weapons.
- **Find and pin a piece:** search all armor and weapons (by name, set, slot or perk) and pin one. A pinned armor piece is fixed
  in its slot, a pinned weapon becomes the weapon of every build. Pinned exotics work even when exotics are off.
- **Resistances:** a minimum for each element (no weakness, or 30 to 120 %), summed over the four armor pieces. A piece adds
  its resistance to its strength element and subtracts it from its weakness element (power surged values when that switch is on).

Every build shows its resistance totals. The Materials tab is temporarily hidden because its recipe information is not kept
up to date. Its rendering code and an empty `data/materials.js` are retained as a scaffold for future use; no materials are
currently shown or need to be maintained. The filters are stored in saved loadouts and build codes.
Search results show the top three builds. The first is expanded and the other two are collapsed; use **Details** on a result to expand or collapse it.

## Lantern and omnicell

Pick a lantern and an omnicell in the options to plan the whole build. A lantern with an Insight slot gives the search one
more cell slot, and the Recruit's Lantern has none. The omnicell does not change perk totals, it is shown in the build with
its effect.

## Gear you don't have

Every weapon and armor piece in the build results has a **✕ Don't have** button. It searches again without that
item (for a legendary weapon you can exclude the legendary or its bond partner). Excluded gear is listed above the
results, where you can put single items back or **Reset all**. The list is stored in the browser (`localStorage`).

## Weapon mods

The weapon row of every build has pickers for the weapon parts of its type (mod and special, and chamber, grip and mod for
repeaters), with the effect text and picture of the chosen part. Parts only add effects, so they don't change perk totals.
The choice is remembered per weapon type, saved in loadouts and included in build codes.

## Icons

All pictures (items, lanterns, omnicells, weapon parts and the six cell family symbols) are stored as small webp data URIs in
one file, `assets/js/icons.js`, which `scripts/build_icons.py` writes from the 128 px images of Dauntless Builder Reforged
(needs `pip install pillow`). One file instead of about 450 images keeps the repository small and easy to upload. The cell
symbols are drawn as a mask so they take the colour of their family. The images are artwork of Phoenix Labs.

## How the rules are modelled

- Every armor piece has one perk and one cell slot of a fixed family (Alacrity, Brutality, Finesse, Fortitude or Insight).
- Weapons have two cell slots. Legendary weapons have two Prismatic slots and copy the perk of the weapon they are bonded with.
- The lantern has one Insight slot. A Prismatic slot accepts any cell.
- A perk is capped at +6. Power surged gear gives +3 per perk, cells give +1 to +3.

Omnicells and weapon parts do not change perk totals; they are shown in the build for planning.

## License and credits

See [NOTICE.md](NOTICE.md). This is a fan project and is not affiliated with Phoenix Labs.
