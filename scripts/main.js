import { TokenTooltip } from './token-tooltip.js';
import { PersistentHUD } from './persistent-hud.js';
import { registerSettings } from './settings.js';
import './theme-switcher.js';

Hooks.once('init', () => {
    console.log('SF1E-HUD | Initializing Starfinder 1E HUD');
    registerSettings();
    
    // Initialize theme switcher
    if (window.SF1EThemeSwitcher) {
        window.SF1EThemeSwitcher.init();
    }
});

Hooks.once('ready', async () => {
    if (game.system.id !== 'sfrpg') {
        ui.notifications.warn('SF1E-HUD | This module is designed for the Starfinder 1E system.');
        return;
    }
    
    console.log('SF1E-HUD | System ready');
    
    // Initialize HUD components
    game.sf1eHUD = {
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
