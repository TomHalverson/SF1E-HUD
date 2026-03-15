export function registerSettings() {
    
    // Detect which system we're running on
    const isSF1E = game.system.id === 'sfrpg';
    const isSF2E = game.system.id === 'sf2e';

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
    
    // SF1E-only: Stamina bar
    game.settings.register('sf1e-hud', 'showStaminaBar', {
        name: 'Show Stamina Bar',
        hint: 'Display stamina points as a separate bar (SF1E only)',
        scope: 'client',
        config: isSF1E,
        type: Boolean,
        default: true
    });

    // SF2E-only: Hero Points display
    game.settings.register('sf1e-hud', 'showHeroPoints', {
        name: 'Show Hero Points',
        hint: 'Display Hero Points pips in the HUD and tooltip (SF2E only)',
        scope: 'client',
        config: isSF2E,
        type: Boolean,
        default: true
    });

    // SF2E-only: Focus Points display
    game.settings.register('sf1e-hud', 'showFocusPoints', {
        name: 'Show Focus Points',
        hint: 'Display Focus Points pips in the HUD (SF2E only)',
        scope: 'client',
        config: isSF2E,
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

    game.settings.register('sf1e-hud', 'showBulkBar', {
        name: 'Show Bulk/Encumbrance Bar',
        hint: 'Display encumbrance bar in inventory sidebar',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('sf1e-hud', 'showEquippedIndicators', {
        name: 'Show Equipped Indicators',
        hint: 'Display visual indicators for equipped items in inventory',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('sf1e-hud', 'expandContainersByDefault', {
        name: 'Expand Containers by Default',
        hint: 'Show container contents by default when opening inventory',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('sf1e-hud', 'healthStateLabels', {
        name: 'Health State Labels',
        hint: 'Customize health status labels (JSON format)',
        scope: 'client',
        config: true,
        type: String,
        default: JSON.stringify({
            "dead": "Dead",
            "critical": "Critical",
            "wounded": "Wounded",
            "injured": "Injured",
            "healthy": "Healthy"
        }),
        onChange: () => window.location.reload()
    });

    // SF1E-only: Class-specific resources
    game.settings.register('sf1e-hud', 'showClassResource', {
        name: 'Show Class Resource',
        hint: 'Display class-specific resources like Vanguard Entropy Points or Solarian Stellar Mode (SF1E only)',
        scope: 'client',
        config: isSF1E,
        type: Boolean,
        default: true
    });

    game.settings.register('sf1e-hud', 'textSize', {
        name: 'Text Size',
        hint: 'Adjust the overall text size of the HUD for accessibility (100% is default)',
        scope: 'client',
        config: true,
        type: Number,
        range: {
            min: 75,
            max: 200,
            step: 25
        },
        default: 100,
        onChange: (value) => {
            document.documentElement.style.setProperty('--sf1e-hud-text-scale', value / 100);
        }
    });
}
