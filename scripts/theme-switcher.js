/**
 * SF1E HUD Theme Switcher
 * Handles theme selection and application for character sheets
 */

class SF1EThemeSwitcher {
    static MODULE_ID = 'sf1e-hud';
    static SETTING_KEY = 'selectedTheme';

    static THEMES = {
        default: {
            name: 'Default (System Default)',
            description: 'Use the Starfinder system default theme'
        },
        highContrast: {
            name: 'High Contrast (Accessibility)',
            description: 'Maximum contrast for visual accessibility',
            file: 'high-contrast.css'
        },
        darkBlue: {
            name: 'Dark Blue',
            description: 'Dark theme with blue highlights',
            file: 'dark-blue.css'
        },
        darkRed: {
            name: 'Dark Red',
            description: 'Dark theme with red/crimson highlights',
            file: 'dark-red.css'
        },
        darkGreen: {
            name: 'Dark Green',
            description: 'Dark theme with green/emerald highlights',
            file: 'dark-green.css'
        },
        darkPurple: {
            name: 'Dark Purple',
            description: 'Dark theme with purple/violet highlights',
            file: 'dark-purple.css'
        },
        cyberpunk: {
            name: 'Cyberpunk (Cyan/Magenta)',
            description: 'Neon cyan and magenta theme',
            file: 'cyberpunk.css'
        },
        cyberpunkOrange: {
            name: 'Cyberpunk (Orange/Blue)',
            description: 'Neon orange and blue theme',
            file: 'cyberpunk-orange.css'
        },
        cyberpunkGreen: {
            name: 'Cyberpunk (Green/Yellow)',
            description: 'Neon green and yellow theme',
            file: 'cyberpunk-green.css'
        },
        cyberpunkRed: {
            name: 'Cyberpunk (Red/Blue)',
            description: 'Neon red and electric blue theme',
            file: 'cyberpunk-red.css'
        },
        cyberpunkPurple: {
            name: 'Cyberpunk (Purple/Pink)',
            description: 'Neon purple and pink theme',
            file: 'cyberpunk-purple.css'
        }
    };

    static init() {
        console.log(`${this.MODULE_ID} | Initializing theme switcher`);
        this.registerSettings();
        this.applyTheme();
    }

    static registerSettings() {
        game.settings.register(this.MODULE_ID, this.SETTING_KEY, {
            name: 'Sheet Theme',
            hint: 'Choose your preferred theme for Starfinder character and NPC sheets',
            scope: 'client',
            config: true,
            type: String,
            choices: Object.keys(this.THEMES).reduce((acc, key) => {
                acc[key] = this.THEMES[key].name;
                return acc;
            }, {}),
            default: 'cyberpunk',
            onChange: () => this.applyTheme()
        });
    }

    static applyTheme() {
        const selectedTheme = game.settings.get(this.MODULE_ID, this.SETTING_KEY);
        console.log(`${this.MODULE_ID} | Applying theme: ${selectedTheme}`);

        // Remove all existing theme stylesheets
        document.querySelectorAll('link[data-theme-style]').forEach(link => link.remove());

        // If default theme is selected, don't add any stylesheet
        if (selectedTheme === 'default') {
            console.log(`${this.MODULE_ID} | Using default theme`);
            return;
        }

        // Add the selected theme stylesheet
        const theme = this.THEMES[selectedTheme];
        if (theme && theme.file) {
            const link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', `modules/${this.MODULE_ID}/themes/${theme.file}`);
            link.setAttribute('data-theme-style', selectedTheme);
            document.head.appendChild(link);
            console.log(`${this.MODULE_ID} | Theme stylesheet loaded: ${theme.file}`);
        }
    }

    static getCurrentTheme() {
        return game.settings.get(this.MODULE_ID, this.SETTING_KEY);
    }
}

// Export for use in main module
window.SF1EThemeSwitcher = SF1EThemeSwitcher;
