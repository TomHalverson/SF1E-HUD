# Changelog

## Version 2.0.0 (2025-10-29)

### Major Features
- **Merged with Starfinder Theme Switcher** - Combined two modules into one comprehensive package
- **11 Character Sheet Themes** - Choose from cyberpunk, dark, and high-contrast themes
- **Themed Chat Log** - Dice rolls and chat messages now match your selected theme

### HUD Improvements
- **Fixed Overlap Issue** - HUD now positioned at left: 250px to completely avoid player list
- **Resolve Points Recolored** - Changed from pink/magenta to cyan for better visibility
- **Improved Layout** - Buttons positioned above resource bars
- **Upward Sidebars** - Sidebars open upward to prevent off-screen issues

### Theme System
- High Contrast (Accessibility)
- Dark Blue
- Dark Red  
- Dark Green
- Dark Purple
- Cyberpunk (Cyan/Magenta) - Default
- Cyberpunk (Orange/Blue)
- Cyberpunk (Green/Yellow)
- Cyberpunk (Red/Blue)
- Cyberpunk (Purple/Pink)

### Breaking Changes
- Module ID remains "sf1e-hud"
- Old "starfinder-dark-mode" module can be disabled if installed
- Settings migrated to new combined module

## Version 1.1.0 (2025-10-29)

### Features
- Improved Foundry v13 compatibility
- Better auto-actor detection
- Enhanced initialization and render timing
- Adjusted z-index for proper layering

### Bug Fixes
- Fixed persistent HUD not appearing on load
- Fixed token selection not updating HUD
- Improved positioning to avoid UI elements

## Version 1.0.0 (2025-10-29)

### Initial Release
- Token tooltips with health, stats, and distance
- Persistent HUD with portrait and resource bars
- Action sidebars (weapons, spells, items, skills)
- Cyberpunk/sci-fi aesthetic with neon colors
- Configurable positioning and settings
