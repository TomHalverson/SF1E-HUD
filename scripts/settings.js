export function registerSettings() {
    
    game.settings.register('sf1e-hud', 'enableTooltip', {
        name: 'Enable Token Tooltip',
        hint: 'Show tooltips when hovering over tokens',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: () => window.location.reload()
    });
    
    game.settings.register('sf1e-hud', 'showDistance', {
        name: 'Show Distance',
        hint: 'Display distance to selected/targeted tokens',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });
    
    game.settings.register('sf1e-hud', 'enablePersistentHUD', {
        name: 'Enable Persistent HUD',
        hint: 'Show a persistent HUD for owned actors',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: () => window.location.reload()
    });
    
    game.settings.register('sf1e-hud', 'autoSetActor', {
        name: 'Auto-Set Actor',
        hint: 'Automatically set persistent actor when selecting tokens',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });
    
    game.settings.register('sf1e-hud', 'hudPosition', {
        name: 'HUD Position',
        hint: 'Position of the persistent HUD',
        scope: 'client',
        config: true,
        type: String,
        choices: {
            'top-left': 'Top Left',
            'top-right': 'Top Right',
            'bottom-left': 'Bottom Left',
            'bottom-right': 'Bottom Right'
        },
        default: 'bottom-left'
    });
    
    game.settings.register('sf1e-hud', 'tooltipSide', {
        name: 'Tooltip Preferred Side',
        hint: 'Preferred side for tooltip display',
        scope: 'client',
        config: true,
        type: String,
        choices: {
            'left': 'Left',
            'right': 'Right',
            'top': 'Top',
            'bottom': 'Bottom'
        },
        default: 'right'
    });
    
    game.settings.register('sf1e-hud', 'showStaminaBar', {
        name: 'Show Stamina Bar',
        hint: 'Display stamina points as a separate bar',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });
    
    game.settings.register('sf1e-hud', 'persistentActorId', {
        name: 'Persistent Actor',
        scope: 'client',
        config: false,
        type: String,
        default: ''
    });
}
