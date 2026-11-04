# Changelog

All notable changes to Baroque. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.1.1] - 2026-11-04

### Fixed

- On Omarchy 4.5, a bar with widgets in the center only could still be treated as an
  older bar, and its full-screen window painted over the desktop. Baroque now finds the
  bar strip from any widget, and never sizes or colors a bar window that spans the screen:
  if it can't find the strip there, it leaves the bar as it is and says so in the settings.
  ([#1](https://github.com/qempexe/omarchy-baroque/issues/1))

## [1.1.0] - 2026-11-04

### Added

- **Float off the edge** (Shape › Spacing): a gap between the screen edge and the whole
  bar, on every shape. A full width bar also keeps that far from the screen's ends, with
  rounded corners, and windows keep clear of the gap.
- An About tab with the logo, the version and a link to more plugins.
- A logo, light and dark.

### Fixed

- On Omarchy 4.5 and its release candidates the shapes were drawn in the middle of the
  screen. The bar window there spans the whole screen with the bar as a strip along its
  edge; Baroque now draws along that edge, keeps the widgets centred in their shapes and
  widens the space windows keep free. Switching it off gives the strip back as it was.
- The settings panel opens by the bar's shapes on Omarchy 4.5 too.

### Changed

- The code uses `const`, `let` and arrow functions.

## [1.0.1] - 2026-10-22

### Fixed

- Shapes leave out the room the system tray keeps for its closed drawer.

## [1.0.0] - 2026-10-17

### Added

- Restyles the stock Omarchy bar without replacing it, so every widget keeps working.
- Four shapes: full width, one pill, islands, or a pill per widget, as tabs from the
  screen edge or floating.
- Thirty-two ends, thirty surfaces, twenty-two lines and eighteen ornaments, chosen
  apart; lines that follow the whole shape.
- Thirty-two ready made looks, twenty places of your own, undo for the last look, and
  looks to export and import as one line.
- Colors from the theme, its palette, the window border's gradient, your own, or none;
  group colors and readable text.
- Shadows, hover and open-panel marks, dividers between widgets, motion, rounded screen
  corners and a screen frame.
- A settings panel by the bar or in its own window, with search, and settings for what
  the button's clicks do.
- ipc for looks, shapes, places, corners, the frame and status.

[1.1.1]: https://github.com/qempexe/omarchy-baroque/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/qempexe/omarchy-baroque/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/qempexe/omarchy-baroque/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/qempexe/omarchy-baroque/releases/tag/v1.0.0
