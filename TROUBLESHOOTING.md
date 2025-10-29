# SF1E HUD - Troubleshooting Guide

## Persistent HUD Not Showing

### Quick Fixes:

1. **Close the Settings Dialog** - If you have the module settings open, close it and the HUD should appear.

2. **Select a Token** - With "Auto-Set Actor" enabled, click on a character token on the canvas to set it as your persistent actor.

3. **Check Browser Console** - Press F12 to open developer tools and check the Console tab for "SF1E-HUD" messages. You should see:
   - "SF1E-HUD | Initializing Starfinder 1E HUD"
   - "SF1E-HUD | System ready"
   - "SF1E-HUD | Rendering persistent HUD"
   - "SF1E-HUD | Setting actor: [ActorName]"

4. **Manual Actor Assignment** - Open the console (F12) and run:
   ```javascript
   game.sf1eHUD.persistentHUD.setActor(game.user.character)
   ```

5. **Check Settings** - Make sure these are enabled:
   - ✓ Enable Persistent HUD
   - ✓ Auto-Set Actor (recommended)

6. **Reload** - After enabling the module, do a full page refresh (F5 or Ctrl+R).

### Common Issues:

**Issue**: HUD not appearing after enabling
- **Fix**: Reload the page completely (F5)

**Issue**: "No actor set" in console
- **Fix**: Select a character token, or set `game.user.character` in Foundry

**Issue**: HUD appears but is empty
- **Fix**: Make sure you own the actor/character

**Issue**: Position is wrong
- **Fix**: Change "HUD Position" in module settings to Top Left, Top Right, Bottom Left, or Bottom Right

### Debug Commands:

Open console (F12) and try these:

```javascript
// Check if module loaded
console.log(game.sf1eHUD);

// Check current actor
console.log(game.sf1eHUD.persistentHUD.actor);

// Force set your assigned character
game.sf1eHUD.persistentHUD.setActor(game.user.character);

// Force set first owned character
const char = game.actors.find(a => a.type === 'character' && a.isOwner);
if (char) game.sf1eHUD.persistentHUD.setActor(char);

// Clear actor
game.sf1eHUD.persistentHUD.clearActor();

// Check HUD element exists in DOM
console.log($('#sf1e-persistent-hud').length, $('#sf1e-persistent-hud').hasClass('active'));
```

## Token Tooltip Not Showing

1. Make sure "Enable Token Tooltip" is checked in settings
2. Hover slowly over tokens - don't move the mouse too quickly
3. Check that you have tokens on the scene

## Other Issues

- **Styling looks wrong**: The module uses custom fonts. They'll fall back to system fonts if not available.
- **Buttons don't work**: Check browser console for errors
- **Skills/Items not showing**: Make sure your actor has items of that type

## Still Having Issues?

1. Check the browser console (F12) for error messages
2. Try disabling other modules to check for conflicts
3. Make sure you're using Starfinder 1E system (sfrpg)
4. Verify Foundry VTT is version 11 or higher
