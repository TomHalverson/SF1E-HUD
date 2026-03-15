import { TokenTooltip } from './token-tooltip.js';
import { PersistentHUD } from './persistent-hud.js';
import { registerSettings } from './settings.js';
import { HealthUtils } from './health-utils.js';
import { SystemAdapter } from './system-adapter.js';
import './theme-switcher.js';

// Supported system IDs
const SUPPORTED_SYSTEMS = ['sfrpg', 'sf2e'];

// Make utilities available globally
window.SF1EHealthUtils = HealthUtils;

Hooks.once('init', () => {
    console.log('SF1E-HUD | Initializing Starfinder HUD');
    registerSettings();
    
    // Initialize theme switcher
    if (window.SF1EThemeSwitcher) {
        window.SF1EThemeSwitcher.init();
    }
});

Hooks.once('ready', async () => {
    const currentSystem = game.system.id;
    if (!SUPPORTED_SYSTEMS.includes(currentSystem)) {
        ui.notifications.warn('SF1E-HUD | This module requires Starfinder 1E (sfrpg) or Starfinder 2E (sf2e).');
        return;
    }
    
    console.log(`SF1E-HUD | System ready: ${currentSystem}`);
    
    // Initialize text scale from settings
    const textSize = game.settings.get('sf1e-hud', 'textSize');
    document.documentElement.style.setProperty('--sf1e-hud-text-scale', textSize / 100);
    
    // Initialize HUD components with system detection
    game.sf1eHUD = {
        systemId: currentSystem,
        isSF1E: currentSystem === 'sfrpg',
        isSF2E: currentSystem === 'sf2e',
        adapter: SystemAdapter,
        tokenTooltip: new TokenTooltip(),
        persistentHUD: new PersistentHUD()
    };
    
    // Wait for canvas to be ready before rendering
    if (canvas.ready) {
        game.sf1eHUD.tokenTooltip.render();
        game.sf1eHUD.persistentHUD.render();
    }
});

Hooks.on('canvasReady', () => {
    console.log('SF1E-HUD | Canvas ready');
    if (game.sf1eHUD?.tokenTooltip) {
        game.sf1eHUD.tokenTooltip.render();
    }
    if (game.sf1eHUD?.persistentHUD) {
        game.sf1eHUD.persistentHUD.render();
        
        // Try to set actor from assigned character or first owned actor
        if (game.settings.get('sf1e-hud', 'enablePersistentHUD')) {
            const savedActorId = game.settings.get('sf1e-hud', 'persistentActorId');
            let actor = null;
            
            if (savedActorId) {
                actor = game.actors.get(savedActorId);
            }
            
            // If no saved actor, try assigned character
            if (!actor && game.user.character) {
                actor = game.user.character;
            }
            
            // If still no actor, try first owned actor
            if (!actor) {
                actor = game.actors.find(a => a.isOwner && a.type === 'character');
            }
            
            if (actor) {
                game.sf1eHUD.persistentHUD.setActor(actor);
            }
        }
    }
});

Hooks.on('controlToken', (token, controlled) => {
    if (game.sf1eHUD?.persistentHUD && game.settings.get('sf1e-hud', 'autoSetActor')) {
        if (controlled && token.actor) {
            console.log('SF1E-HUD | Setting actor from token:', token.actor.name);
            game.sf1eHUD.persistentHUD.setActor(token.actor);
        }
    }
});

// Update HUD when actor data changes (conditions, stats, etc.)
Hooks.on('updateActor', (actor, data, options) => {
    if (game.sf1eHUD?.persistentHUD && game.sf1eHUD.persistentHUD.actor?.id === actor.id) {
        console.log('SF1E-HUD | Actor updated, refreshing HUD');
        // Check if the active sidebar is conditions and refresh it
        if (game.sf1eHUD.persistentHUD.activeSidebar === 'conditions') {
            game.sf1eHUD.persistentHUD._buildSidebar('conditions');
        }
        // Also update the button badges (condition count, etc.)
        game.sf1eHUD.persistentHUD._updateButtons();
    }
});

// Update HUD when embedded items change (actorResource items for class resources, conditions, etc.)
Hooks.on('updateItem', (item, data, options) => {
    if (game.sf1eHUD?.persistentHUD && item.parent?.id === game.sf1eHUD.persistentHUD.actor?.id) {
        if (item.type === 'actorResource' || item.type === 'condition') {
            console.log('SF1E-HUD | Embedded item updated, refreshing HUD');
            game.sf1eHUD.persistentHUD._updateDisplay();
        }
    }
});

// Update HUD when embedded items are created or deleted (SF2E conditions, etc.)
Hooks.on('createItem', (item, options, userId) => {
    if (game.sf1eHUD?.persistentHUD && item.parent?.id === game.sf1eHUD.persistentHUD.actor?.id) {
        if (item.type === 'condition') {
            console.log('SF1E-HUD | Condition added, refreshing HUD');
            game.sf1eHUD.persistentHUD._updateButtons();
            if (game.sf1eHUD.persistentHUD.activeSidebar === 'conditions') {
                game.sf1eHUD.persistentHUD._buildSidebar('conditions');
            }
        }
    }
});

Hooks.on('deleteItem', (item, options, userId) => {
    if (game.sf1eHUD?.persistentHUD && item.parent?.id === game.sf1eHUD.persistentHUD.actor?.id) {
        if (item.type === 'condition') {
            console.log('SF1E-HUD | Condition removed, refreshing HUD');
            game.sf1eHUD.persistentHUD._updateButtons();
            if (game.sf1eHUD.persistentHUD.activeSidebar === 'conditions') {
                game.sf1eHUD.persistentHUD._buildSidebar('conditions');
            }
        }
    }
});
