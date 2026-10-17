# Baroque

New shapes for the stock [Omarchy](https://omarchy.org) bar. The widgets stay
where they are; only the frame around them changes.

![Baroque](preview.png)

Baroque paints behind the existing bar rather than replacing it. The bar can
become one band from edge to edge, a single floating pill, an island for each
group, tabs hanging from the screen edge, or a capsule around every widget. Ends,
surface, edge, ornaments, colors, shadow and hover marks are all separate
choices, and the more decorative end of the range goes as far as gilded frames
and curled scrolls.

Replacement bars lose the connection each widget has to its own plugin. Because
Baroque leaves the stock bar in place, every widget keeps working, including
those from other plugins.

## Adding it to the bar

```bash
omarchy plugin add https://github.com/qempexe/omarchy-baroque.git --enable --yes
omarchy restart shell
```

Baroque only runs while its button is part of the bar layout. Place it with the
bar settings, or write `{ "id": "io.github.qempexe.baroque" }` into `bar` →
`layout` in `~/.config/omarchy/shell.json`. Any slot works: the whole bar is
restyled, on every screen that shows it.

## Presets

Thirty-two presets, each setting shape, ends, surface and details in one step.
Anything can be changed afterwards. Switching presets leaves colors, group
colors, motion, screen corners and the screen frame as they were. **Undo the
last look** goes back one step.

![Looks, part 1](screenshots/looks-1.png)
![Looks, part 2](screenshots/looks-2.png)

## The ornate presets

Four presets lean fully into the name: **Baroque** (cartouche ends in a gilded
frame), **Rococo** (fleur pills with filigree), **Versailles** (one long pill
with scrolls and damask) and **Opera** (velvet with an accent line). Their gilding
is computed from the bar's own color, so it follows the theme, the palette, the
window border, or custom colors.

![Old world](screenshots/baroque.png)

## Ends

Thirty-two: rounded, capsule, square, cut corners, slanted, arrows, ribbon,
scooped, leaf, stepped, tab, drop, sail, bullet, folded corner, zigzag,
scalloped, bulging, wave, braces, battlement, teeth, puzzle, needle, cloud,
cartouche, fleur, plaque, oval, stamp, onion dome and corbel.

Ten of them have a direction (slanted, arrow, leaf, stepped, tab, drop, sail,
bullet, folded and corbel), set under **Pointing**:

- **Right**, **Left** or **Both ways**.
- **Outward**: the left group points left, the right group right, the middle
  both ways.
- **Inward**: the reverse.

Slanted and stepped ends set to Both ways taper toward the windows, which reads
as a tab.

![Ends](screenshots/ends.png)
![New ends and surfaces](screenshots/new-forms.png)
![Plaque, oval and stamp ends, lines all the way round, deco, crowns and laurels](screenshots/more-forms.png)

## A pill per widget

With the **Widget pills** shape, every widget gets a capsule of its own.
**Room inside pills** sets the padding, **Gap between pills** the spacing. The
spacing shrinks on a crowded bar so the left, center and right groups never
overlap. Hovering highlights the whole pill.

![Widget pills](screenshots/pills.png)

## Window border colors

Many Omarchy themes give the active window a gradient border. Baroque reads that
gradient from the theme (`hyprland.lua`, or `hyprland.conf` in older themes) and
can reuse it in four places:

| Setting | Effect |
| --- | --- |
| Colors: **Window borders** | the border's colors spread along the bar, first color on the left, last on the right |
| Line color: **Window border** | every line drawn in the border gradient, at the border's angle |
| Gradient into: **Window border** | shapes filled from the first border color to the last |
| Gradient lines: fade into **Window border** | lines, rails and brackets run through the border colors; the screen frame can use them as well |

The **Aurora** preset combines all four. Changing theme updates the bar with it.

![Window border colors](screenshots/border.png)

## Three layers

Each shape is built from a surface, an edge and ornaments, chosen
independently:

- **Surface** (30): solid, faint, two-tone, split, frost, bevel, keycap, brushed
  metal, carbon fibre, an old screen with scanlines, candy stripes, halftone
  dots, hologram, comet, damask, velvet, marble, spiderweb, wood grain,
  terrazzo, cracked glaze, map contours, nebula, leather, stained glass, ledge,
  band, underglow, shadow only, and clear.
- **Lines** (22): none, solid, double, triple, glow ring, neon tube, dashed,
  dotted, dash and dot, stitched, inset, mat, rail (windows side, edge side or
  both), wavy, sawtooth, rope, chain, beads, ladder, sketched, gilded frame and
  glitch. Wavy, sawtooth, chain and beads follow the whole outline, ends
  included.
- **Ornaments** (18): none, studs, rivets, pearls, crosses, stars, brackets,
  rosettes, diamonds, fleurons, filigree, flourish, scrolls, chevrons, art deco
  fans, deco corners, crowns and laurels.

That is 30 × 22 × 18, close to twelve thousand combinations before ends or
colors come into it. Split, comet and halftone also follow **Pointing**.

![Mix and match](screenshots/mix.png)
![More surfaces](screenshots/surfaces-3.png)
![Lines](screenshots/lines.png)
![Ornaments](screenshots/ornaments.png)

**Gradient lines** is a separate switch and applies to any line, rail or
bracket. It fades into a lighter shade, the accent, the next theme color or the
window border colors, running along the bar, diagonally, across, or at the
window border's own angle.

![Surfaces and more ends](screenshots/surfaces.png)
![More surfaces](screenshots/surfaces-2.png)

**Your looks** holds twenty saved bars. **Save in a free place** stores the
current one; a click restores it later. Empty slots stay out of sight until
**Show all** is on.

<img src="screenshots/settings-yours.png" alt="Your looks" width="420">

## Every option, by tab

The settings open from the Baroque button. Every change shows on the bar as it
is made, and is written to `~/.local/state/omarchy-baroque/settings.json`. **Alt+←** and **Alt+→**
step through the ten tabs, the search box looks through all of them, and
**Changed only** narrows the list to what differs from the defaults.

<img align="right" src="screenshots/settings-search.png" alt="Search" width="380">

**Looks**
- *Ready made:* thirty-two presets · undo the last one.
- *Yours:* twenty slots for your own.

**Shape**
- *Form:* full width, one pill, islands or widget pills · thirty-two ends ·
  direction for pointing ends (right, left, both ways, outward, inward) ·
  square corners toward the edge or toward the windows · attached to the screen
  edge like tabs, with curved ears · shapes behind every group, only the sides,
  or only the center.
- *Spacing:* distance from the edge and from the sides · padding around the
  widgets · padding inside widget pills · gap between pills · merging islands
  that come close · extra height and end padding for a full width bar · slimmer
  shapes.
- *Size:* roundness · a pill that hugs the widgets · a minimum width for the
  center island · equal widths for the left and right islands.

**Surface**
- *Fill:* thirty surfaces · solid, gradient (into the accent, the next theme
  color, lighter or darker, along or across) or glass · stripes, dots or grid
  texture · raised or sunken · opacity · accent tint.
- *Shadow:* soft or strong · dark or an accent glow · all around or falling
  toward the windows.

**Lines**
- *Style:* twenty-two kinds, from solid, double and triple lines to a neon tube,
  stitching, rope, chain, beads, a mat, a one-sided rail, a gilded frame or a
  glitch.
- *Color and width:* subtle, text color, accent or window border · 1 to 4 px ·
  rail placement.
- *Fade:* gradient lines, what they fade into and in which direction.

**Ornaments**
- *Style:* eighteen kinds, from studs, rivets and pearls to rosettes, fleurons,
  a flourish, scrolls, art deco fans and corners, crowns and laurels.
- *Details:* bracket length · an accent cap at one or both ends.

**Colors**
- *Scheme:* theme, theme palette, window borders, custom or monochrome · where
  palette colors are applied.
- *Text:* the color of text and icons on the bar: always readable, the theme's,
  or a custom one.
- *Groups:* a highlighted center · a separate color for the left, center and
  right groups.

**Widgets**
- *Under the mouse:* fill, line, glow or none, in the text color or the accent.
- *Open panel:* line, fill, dot, glow or none.
- *Between widgets:* a line, dot or slash and its strength · dividers between
  groups · an accent line under a full width bar.

**Motion**
- *Movement:* animation speed · smooth, springy or linear.
- *Resting:* fade the shapes while the mouse is away from the bar, and the fade
  time.

**Screen**
- *Corners:* rounded on all four sides, the top two or the bottom two · size ·
  black or the bar color.
- *Frame:* a thin line around the whole screen, 1 to 8 px, in the accent, the
  bar color or black.

Corners and frame are click-through.

<br clear="right">

![More details](screenshots/details.png)

The bar can sit at the top, at the bottom, or on either side:

![A bottom bar](screenshots/bottom.png)

![A side bar](screenshots/side.png)

<table>
<tr>
<td><img src="screenshots/settings-looks.png" alt="Looks"></td>
<td><img src="screenshots/settings-shape.png" alt="Shape"></td>
<td><img src="screenshots/settings-surface.png" alt="Surface"></td>
<td><img src="screenshots/settings-lines.png" alt="Lines"></td>
<td><img src="screenshots/settings-ornaments.png" alt="Ornaments"></td>
</tr>
<tr>
<td><img src="screenshots/settings-colors.png" alt="Colors"></td>
<td><img src="screenshots/settings-widgets.png" alt="Widgets"></td>
<td><img src="screenshots/settings-motion.png" alt="Motion"></td>
<td><img src="screenshots/settings-screen.png" alt="Screen"></td>
<td><img src="screenshots/settings-panel.png" alt="Panel"></td>
</tr>
</table>

The panel takes on the chosen colors too. Its density, corner radius, border,
font scale, tint and transparency are adjusted separately under **Panel**. With **Window outline**
on, its edge can follow the theme's window border gradient at the same angle
(**Outline gradient**), or take a single color: the accent, or the border's
first, middle or last color. **Reset all** does not touch saved looks.

## Clicking the button

| Mouse | Result |
| --- | --- |
| Left | settings |
| Right | next shape, next preset, or nothing |
| Middle | Baroque on or off, next preset, or nothing |

Right and middle click are configurable under **Panel** › **Button**. The button
can also be made invisible (**Bar button: Hidden**) while staying in the layout;
the settings are then opened from the command line or a keybind.

## Scripting

```bash
omarchy-shell io.github.qempexe.baroque settings        # open the settings (again to close)
omarchy-shell io.github.qempexe.baroque preset tabs     # any look: classic floating islands capsules tabs outline rail
                                                        # brackets neon hex ribbon cut leaf tickets tags lantern aurora arrows
                                                        # slanted paper glass chrome arcade comets jigsaw
                                                        # baroque rococo versailles opera mono minimal rainbow
omarchy-shell io.github.qempexe.baroque shape islands   # full, pill, islands or widgets
omarchy-shell io.github.qempexe.baroque next            # next shape
omarchy-shell io.github.qempexe.baroque nextLook        # the next ready made look
omarchy-shell io.github.qempexe.baroque undo            # back to before the last look
omarchy-shell io.github.qempexe.baroque save 2          # keep the current look in place 2 (1 to 20)
omarchy-shell io.github.qempexe.baroque saveNew         # keep it in the first free place
omarchy-shell io.github.qempexe.baroque load 2          # and bring it back
omarchy-shell io.github.qempexe.baroque exportLook      # the current look as one line of json
omarchy-shell io.github.qempexe.baroque importLook '{"shape":"pill","ends":"arrow"}'
omarchy-shell io.github.qempexe.baroque corners         # screen corners on / off
omarchy-shell io.github.qempexe.baroque frame           # screen frame on / off
omarchy-shell io.github.qempexe.baroque toggle          # on / off (also: enable, disable)
omarchy-shell io.github.qempexe.baroque status          # as json
```

`exportLook` prints the current bar as one line; `importLook` applies such a
line on another machine. Imports carry look settings only (shape, surface,
colors, widgets, motion, screen), and every value is validated.

## Caveats

- **Mechanism.** The stock bar offers no shape settings, so Baroque works from
  outside it. It clears the bar window's background, thickens the window for
  floating shapes, moves the left and right groups inward to fit their shapes,
  spaces widgets apart for widget pills, and draws the shapes underneath.
  Switching Baroque off, or removing it from the bar, reverts all of it.
- **Bar updates.** Baroque finds the widgets by the stock bar's layout. If an
  Omarchy update changes that layout and the widgets can't be found, Baroque
  leaves the bar untouched and says so in the settings. The result is simply the
  stock bar.
- **Thickness.** Floating shapes add twice the edge distance to the bar's
  thickness, and windows shift accordingly. When the bar auto-hides, Baroque
  returns the extra space and hides its shapes too.
- **Transparent bar.** With the stock bar set to transparent, widgets choose
  their text color against the wallpaper rather than against Baroque's shapes.
  The settings show a warning and a button to turn transparency off.
- **Light colors.** With a white or light custom background, text and icons
  switch to a dark color to stay readable (**Widget text: Always readable**,
  the default). **My text color** uses the custom Text color; **Theme** leaves
  the theme's color in place. The panel follows the same rule, and switching
  Baroque off restores the theme color.
- **Theme palette** comes from the current theme's `colors.toml` (color1 to
  color6 and their bright variants). Themes without one fall back to the accent.
- The only command Baroque runs is `omarchy-shell shell toggleBarTransparency`,
  when that button is pressed. It makes no network requests.

## Inside the plugin

```
qml/
├── Service.qml        settings, looks, colors, ipc, giving the bar back
├── BarWidget.qml      the bar button
├── deco/Decorator.qml finds the bar's widgets and draws the shapes under them
├── screen/Corners.qml rounded screen corners and the screen frame
├── core/              SettingsStore, UiState (colors, sizes)
├── panel/             Panel, PopoutWindow, PanelView, SettingsView, SettingRow,
│                      PresetGrid, LookSlots, TileArt
├── controls/          Btn, Chip, Sw, Txt, TextBox
└── js/                Shapes.js (where the shapes go), Paint.js (drawing them),
    │                  Trace.js (walking the outline), Schema.js (settings and looks),
    │                  Theme.js, Util.js
    └── parts/         Ends.js, Surfaces.js, Lines.js, Ornaments.js: one entry
                       for each kind, with its drawing
tests/test_baroque.js  node tests/test_baroque.js
```

Each end, surface, line and ornament is one self-contained entry.
[CONTRIBUTING.md](CONTRIBUTING.md) describes how to add another.

## Keeping it current

```bash
omarchy plugin update io.github.qempexe.baroque
omarchy restart shell
```

To remove it, along with its settings and saved looks:

```bash
omarchy plugin remove io.github.qempexe.baroque
omarchy restart shell
rm -rf ~/.local/state/omarchy-baroque   # settings and saved looks
```

## License

[MIT](LICENSE)
