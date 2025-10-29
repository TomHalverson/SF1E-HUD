# SF1E HUD & Theme Switcher - Installation Guide

## What's New in v2.0.0

This module now combines **two modules into one**:
1. **SF1E HUD** - Cyberpunk-themed HUD with tooltips and persistent character display
2. **Starfinder Theme Switcher** - 11 customizable themes for character sheets and chat

## If You Had Previous Versions

### Had "SF1E HUD" only:
- Simply update the module
- New theme switcher features will be available automatically
- Default theme is Cyberpunk (Cyan/Magenta)

### Had "Starfinder Theme Switcher" only:
- Install this module
- Disable the old "starfinder-dark-mode" module
- Your theme preferences will need to be re-selected

### Had Both Modules:
- Keep "sf1e-hud" enabled
- Disable "starfinder-dark-mode" 
- All features are now in one module!

## Fresh Installation

1. Extract the `sf1e-hud` folder to your Foundry modules directory:
   - **Windows**: `%localappdata%/FoundryVTT/Data/modules/`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/modules/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/modules/`

2. Launch Foundry VTT

3. In your world, go to **Game Settings** → **Manage Modules**

4. Enable **"Starfinder 1E HUD & Theme Switcher"**

5. Refresh the page (F5)

## Configuration

After installation, configure the module:

### HUD Settings
**Game Settings → Module Settings → SF1E HUD & Theme Switcher**

- ✓ Enable Token Tooltip
- ✓ Enable Persistent HUD
- ✓ Auto-Set Actor
- Position: Bottom Left (recommended)
- ✓ Show Distance
- ✓ Show Stamina Bar

### Theme Settings
**Game Settings → Module Settings → SF1E HUD & Theme Switcher**

- **Sheet Theme**: Choose from 11 themes
  - Default: Cyberpunk (Cyan/Magenta)
  - Accessibility: High Contrast
  - Professional: Dark Blue
  - Combat: Dark Red
  - Tech: Dark Green
  - Mystical: Dark Purple
  - And 5 more cyberpunk variants!

## Using the HUD

1. **Open a scene** with tokens
2. **Select a character token** - The HUD will appear in the bottom-left
3. **Click the icon buttons** above the resource bars to open sidebars
4. **Hover over any token** to see tooltips with stats

## Troubleshooting

**HUD not showing?**
- Make sure "Enable Persistent HUD" is checked
- Select a token on the canvas
- Check browser console (F12) for errors

**Theme not applying?**
- Check you've selected a theme (not "Default")
- Try switching to a different theme and back
- Refresh the page (F5)

**Overlap with player list?**
- The HUD is now positioned at 250px from left
- If still overlapping, change position to "Top Left" or "Top Right"

## Features Quick Reference

### HUD Features
- 🎯 Token tooltips on hover
- 🖼️ Persistent character portrait
- ❤️ HP/SP/RP resource bars with click-to-edit
- ⚡ Quick access to weapons, spells, items, skills
- 📏 Distance display between selected tokens
- 🎨 Cyberpunk neon aesthetic

### Theme Features
- 🎨 11 color schemes for sheets and chat
- ♿ High contrast accessibility mode
- 💬 Themed dice rolls and chat messages
- 🎲 Themed tooltips and UI elements
- ⚙️ Instant theme switching
- 🌈 Multiple cyberpunk variants

## Support

For issues, see `TROUBLESHOOTING.md` or check the browser console (F12) for error messages.

Enjoy your new unified Starfinder 1E experience! 🚀
