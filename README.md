# Starfinder 1E HUD & Theme Switcher

A comprehensive module for Starfinder 1E combining a cyberpunk/sci-fi themed HUD system with customizable character sheet themes.

## Features

### HUD System
- **Token Tooltip**: Hover over tokens to see health, armor (EAC/KAC), saves, speeds, immunities/resistances/vulnerabilities, and distance
- **Persistent HUD**: Always-visible HUD showing your character's portrait, HP/SP/RP, and quick access buttons
- **Action Sidebars**: Quick access to weapons, spells, items, skills, and actions - opens upward to avoid screen clutter
- **Sci-Fi Aesthetic**: Neon cyan/magenta/green colors with glowing effects
- **Compact Layout**: Buttons above resource bars for better screen real estate

### Theme System
- **11 Beautiful Themes**: Choose from multiple color schemes including 5 cyberpunk variants and a high-contrast accessibility mode
- **Accessibility First**: High Contrast theme designed for visually impaired users with WCAG AAA compliance
- **Character Sheet Styling**: All sheet sections styled including Equipment, Feats, Actions, Weapons, Armor, and more
- **Chat Log Styling**: Themed dice rolls, messages, and chat interface
- **Easy Theme Switching**: Change themes instantly via module settings

## Available Themes

1. **Default** - Use the Starfinder system's default appearance
2. **High Contrast (Accessibility)** - Maximum contrast (Black/White/Yellow) for visually impaired users
3. **Dark Blue** - Professional blue highlights
4. **Dark Red** - Aggressive crimson/red highlights
5. **Dark Green** - Natural emerald/green highlights
6. **Dark Purple** - Mystical violet/purple highlights
7. **Cyberpunk (Cyan/Magenta)** - Classic cyberpunk with dual neon glow
8. **Cyberpunk (Orange/Blue)** - Warm dystopian sunset aesthetic
9. **Cyberpunk (Green/Yellow)** - Toxic/radioactive Matrix-style
10. **Cyberpunk (Red/Blue)** - High-contrast aggressive energy
11. **Cyberpunk (Purple/Pink)** - Synthwave retro-futuristic glamour

## Installation

1. In FoundryVTT, go to Add-on Modules
2. Click "Install Module"
3. Paste manifest URL or search for "sf1e-hud"
4. Enable the module in your world

## Usage

### HUD Controls
- Hover over tokens to see tooltips
- Select a token to set it as your persistent HUD actor
- Click sidebar buttons (above the HP/SP bars) to access weapons, spells, items, and skills
- Sidebars open upward to prevent going off-screen
- Right-click the portrait to clear the persistent actor
- Click HP/SP bars to adjust values

### Theme Selection
1. Click **Settings** (gear icon) → **Module Settings**
2. Find **"SF1E HUD & Theme Switcher"**
3. Select your preferred theme from **"Sheet Theme"** dropdown
4. The theme applies immediately to character sheets and chat

## Settings

Configure in Game Settings > Module Settings:

### HUD Settings
- Enable/disable tooltips and persistent HUD
- Set HUD position (bottom-left default, avoids player list)
- Toggle auto-actor selection
- Show/hide stamina bar
- Tooltip preferred side

### Theme Settings
- **Sheet Theme** - Choose your character sheet color scheme (Default: Cyberpunk Cyan/Magenta)

## File Structure

```
sf1e-hud/
├── module.json
├── README.md
├── TROUBLESHOOTING.md
├── scripts/
│   ├── main.js
│   ├── settings.js
│   ├── token-tooltip.js
│   ├── persistent-hud.js
│   └── theme-switcher.js
├── styles/
│   └── main.css (HUD styling)
├── themes/
│   ├── high-contrast.css
│   ├── dark-blue.css
│   ├── dark-red.css
│   ├── dark-green.css
│   ├── dark-purple.css
│   ├── cyberpunk.css
│   ├── cyberpunk-orange.css
│   ├── cyberpunk-green.css
│   ├── cyberpunk-red.css
│   └── cyberpunk-purple.css
└── lang/
    └── en.json
```

## Compatibility

Requires Starfinder 1E (sfrpg) system for FoundryVTT v11+
Tested on Foundry v13

**Replaces**: If you previously had "Starfinder Theme Switcher" installed, you can disable it as this module includes all its functionality.
