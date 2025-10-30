# SF1E HUD - Complete Update Package
## All Files Updated and Ready to Use!

---

## What's Included

### ✅ All 10 Theme Files (COMPLETE - Ready to use!)
All theme files have been updated with the chat popout fix built-in:
- `themes/cyberpunk.css`
- `themes/cyberpunk-orange.css`
- `themes/cyberpunk-green.css`
- `themes/cyberpunk-red.css`
- `themes/cyberpunk-purple.css`
- `themes/dark-blue.css`
- `themes/dark-red.css`
- `themes/dark-green.css`
- `themes/dark-purple.css`
- `themes/high-contrast.css`

### ✅ HUD Styling (UPDATED)
- `styles/main.css` - HUD now uses theme colors directly

### ✅ HUD Logic (UPDATED)
- `scripts/persistent-hud.js` - New features: click portrait, EAC/KAC, saves

---

## Installation (SUPER SIMPLE!)

### Just Replace These Folders:

1. **Copy `themes/` folder** → Replace your entire `themes/` folder
2. **Copy `styles/` folder** → Replace your entire `styles/` folder
3. **Copy `scripts/persistent-hud.js`** → Replace just this one script file

That's it! No manual editing needed - all files are complete and ready!

---

## What's Fixed & Added

### ✅ Fixed Issues:
1. **HUD now uses theme colors** - Purple theme = purple HUD glow!
2. **Players list at top** - Moved to `top: 70px` (no more overlap)
3. **Chat popouts readable** - Proper backgrounds and text

### ✅ New Features:
4. **Click portrait** → Opens character sheet (left-click)
5. **Right-click portrait** → Clears actor (unchanged)
6. **EAC/KAC displayed** → Two armor boxes above HP/SP
7. **Saves displayed** → FORT/REF/WILL (clickable to roll!)

---

## New HUD Layout

```
┌─────────────────────────┐
│    [Character Portrait]  │  ← Click to open sheet
│                         │     Right-click to clear
│                         │
│   [EAC: 15] [KAC: 17]   │  ← NEW: Armor classes
│                         │
│ [FORT:+5][REF:+3][WILL:+4] ← NEW: Saves (click to roll!)
│                         │
│  [━━━━ SP: 25/30 ━━━━]  │  ← Stamina bar (click to edit)
│  [━━━━ HP: 40/45 ━━━━]  │  ← HP bar (click to edit)
│  [RP: ●●●○○]            │  ← Resolve points
│                         │
│  [⚔][✨][🎒][📋]        │  ← Quick action buttons
└─────────────────────────┘
```

---

## File Structure

```
complete-package/
├── README.md (this file)
├── themes/ (ALL 10 FILES - Just copy this whole folder!)
│   ├── cyberpunk.css ✓
│   ├── cyberpunk-orange.css ✓
│   ├── cyberpunk-green.css ✓
│   ├── cyberpunk-red.css ✓
│   ├── cyberpunk-purple.css ✓
│   ├── dark-blue.css ✓
│   ├── dark-red.css ✓
│   ├── dark-green.css ✓
│   ├── dark-purple.css ✓
│   └── high-contrast.css ✓
├── styles/
│   └── main.css ✓
└── scripts/
    └── persistent-hud.js ✓
```

---

## Quick Installation Steps

### Method 1: Drag and Drop (Easiest!)
1. Navigate to your module folder: `FoundryVTT/Data/modules/sf1e-hud/`
2. Drag the `themes/` folder from this package → Replace your existing `themes/` folder
3. Drag the `styles/` folder from this package → Replace your existing `styles/` folder
4. Drag `scripts/persistent-hud.js` → Replace in your `scripts/` folder

### Method 2: Command Line
```bash
# Navigate to your module directory
cd /path/to/FoundryVTT/Data/modules/sf1e-hud/

# Backup existing files (optional but recommended)
mv themes themes.backup
mv styles styles.backup
cp scripts/persistent-hud.js scripts/persistent-hud.js.backup

# Copy new files
cp -r /path/to/complete-package/themes .
cp -r /path/to/complete-package/styles .
cp /path/to/complete-package/scripts/persistent-hud.js scripts/
```

---

## Testing Checklist

After installation, refresh Foundry (F5) and test:

1. ✓ **Select a token** → HUD appears
2. ✓ **Change theme to "Cyberpunk (Purple/Pink)"** → HUD should glow purple!
3. ✓ **Click character portrait** → Character sheet opens
4. ✓ **Click FORT save** → Rolls fortitude save to chat
5. ✓ **Look at top-left corner** → Players list should be at top of screen
6. ✓ **Pop out chat window** → Messages should be readable with dark background
7. ✓ **Change to different theme** → HUD colors change to match!

---

## Theme Colors Reference

Each theme has its own color scheme, and the HUD will now match:

| Theme | Primary Color | Secondary Color |
|-------|--------------|-----------------|
| Cyberpunk (Cyan/Magenta) | Cyan (#00f5ff) | Magenta (#ff00ff) |
| Cyberpunk (Orange/Blue) | Orange (#ff9500) | Blue (#00bfff) |
| Cyberpunk (Green/Yellow) | Green (#39ff14) | Yellow (#ffff00) |
| Cyberpunk (Red/Blue) | Red (#ff0040) | Blue (#00d9ff) |
| Cyberpunk (Purple/Pink) | Purple (#b847ff) | Pink (#ff1493) |
| Dark Blue | Blue (#5ab4ff) | - |
| Dark Red | Red (#ff5555) | - |
| Dark Green | Green (#50fa7b) | - |
| Dark Purple | Purple (#bd93f9) | - |
| High Contrast | Yellow (#ffff00) | White (#ffffff) |

---

## Customization

### Adjusting Players List Position

If `top: 70px` doesn't work for your screen, you can adjust it:

1. Open **each theme CSS file** in `themes/`
2. Scroll to the very bottom
3. Find: `#players { top: 70px !important; }`
4. Change `70px` to your preferred value (try 50-100px)

---

## What Changed in Each File

### themes/*.css (All 10 files)
- ✅ Added chat popout styling at the end
- ✅ Added players list positioning
- ✅ No other changes - all original styling preserved

### styles/main.css
- ✅ HUD elements now use theme color variables
- ✅ Added EAC/KAC armor stat boxes
- ✅ Added save stat buttons (FORT/REF/WILL)
- ✅ Players list positioning

### scripts/persistent-hud.js
- ✅ Added left-click handler on portrait (opens sheet)
- ✅ Display EAC/KAC from actor data
- ✅ Display saves from actor data
- ✅ Saves are clickable and roll to chat
- ✅ Better resource bar organization

---

## Troubleshooting

### HUD still not matching theme colors?
- Make sure you copied the NEW `styles/main.css`
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Check browser console (F12) for errors

### Players list still overlapping?
- Make sure you copied ALL theme files with the fix
- Adjust the `top: 70px` value in theme files
- Try `top: 50px` or `top: 100px`

### Chat popouts still transparent?
- Make sure you replaced ALL theme files
- The active theme must have the fix
- Check which theme is active in module settings

### Portrait click not working?
- Make sure you copied the NEW `scripts/persistent-hud.js`
- Refresh the page completely (F5)
- Check browser console for JavaScript errors

---

## Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify all files were copied correctly
3. Try disabling other modules to check for conflicts
4. Make sure you're running Foundry v11+ with Starfinder 1E system

---

## Credits

SF1E HUD & Theme Switcher
- HUD System: Cyberpunk/sci-fi themed persistent HUD
- Theme System: 11 beautiful themes for character sheets
- Combined package with enhanced features

---

**Enjoy your fully-themed, feature-rich Starfinder HUD!** 🚀
