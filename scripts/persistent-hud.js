import { SystemAdapter } from './system-adapter.js';

export class PersistentHUD {
    constructor() {
        this.hud = null;
        this.actor = null;
        this.activeSidebar = null;
        this.expandedContainers = new Set(); // Track expanded containers
        this.expandedWeapons = new Set(); // Track expanded weapons with attachments
        this.inventoryFilter = 'all'; // Track current inventory filter
        this.inventorySort = 'default'; // Track current sorting method
        this.minimized = false; // Track minimized state
    }
    
    render() {
        if (!game.settings.get('sf1e-hud', 'enablePersistentHUD')) {
            console.log('SF1E-HUD | Persistent HUD disabled in settings');
            return;
        }
        
        console.log('SF1E-HUD | Rendering persistent HUD');
        
        // Remove existing HUD if present
        $('#sf1e-persistent-hud').remove();
        
        const position = game.settings.get('sf1e-hud', 'hudPosition');
        this.hud = $(`
            <div id="sf1e-persistent-hud" class="sf1e-persistent-hud ${position}">
                <button class="sf1e-hud-minimize" title="Minimize HUD">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="sf1e-hud-main">
                    <div class="sf1e-hud-portrait"></div>
                    <div class="sf1e-hud-content">
                        <div class="sf1e-hud-buttons"></div>
                        <div class="sf1e-hud-resources"></div>
                    </div>
                    <div class="sf1e-hud-stats-panel"></div>
                </div>
                <div class="sf1e-hud-sidebar"></div>
            </div>
        `).appendTo('body');
        
        console.log('SF1E-HUD | HUD element created:', this.hud.length);
        
        this._addEventListeners();
        
        // Try to restore last actor
        const savedActorId = game.settings.get('sf1e-hud', 'persistentActorId');
        if (savedActorId) {
            const actor = game.actors.get(savedActorId);
            if (actor && actor.isOwner) {
                console.log('SF1E-HUD | Restoring actor:', actor.name);
                this.setActor(actor);
            }
        }
    }
    
    setActor(actor) {
        if (!actor || !actor.isOwner) {
            console.log('SF1E-HUD | Cannot set actor - invalid or not owned');
            return;
        }
        
        console.log('SF1E-HUD | Setting actor:', actor.name);
        this.actor = actor;
        game.settings.set('sf1e-hud', 'persistentActorId', actor.id);
        this._updateDisplay();
        
        // Hook into actor updates
        if (this._updateHook) {
            Hooks.off('updateActor', this._updateHook);
        }
        this._updateHook = Hooks.on('updateActor', (updatedActor) => {
            if (updatedActor.id === this.actor?.id) {
                this._updateDisplay();
            }
        });
    }
    
    clearActor() {
        this.actor = null;
        game.settings.set('sf1e-hud', 'persistentActorId', '');
        this._updateDisplay();
    }
    
    _addEventListeners() {
        // Minimize button click handler
        this.hud.find('.sf1e-hud-minimize').on('click', (e) => {
            e.stopPropagation();
            this._toggleMinimize();
        });

        // Portrait LEFT-click to open character sheet
        this.hud.find('.sf1e-hud-portrait').on('click', (e) => {
            if (e.button === 0 && this.actor) {  // Left click only
                console.log('SF1E-HUD | Opening character sheet for:', this.actor.name);
                this.actor.sheet.render(true);
            }
        });
        
        // Portrait right-click to clear actor
        this.hud.find('.sf1e-hud-portrait').on('contextmenu', (e) => {
            e.preventDefault();
            this.clearActor();
        });
        
        // Allow dropping items/effects on portrait
        this.hud.find('.sf1e-hud-portrait')[0].addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.actor) return;
            
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            this._handleDrop(data);
        });
        
        this.hud.find('.sf1e-hud-portrait')[0].addEventListener('dragover', (e) => {
            e.preventDefault();
        });
    }

    _toggleMinimize() {
        this.minimized = !this.minimized;

        if (this.minimized) {
            this.hud.addClass('minimized');
            // Close any open sidebar when minimizing
            if (this.activeSidebar) {
                this.activeSidebar = null;
                this.hud.find('.sf1e-hud-sidebar').removeClass('active');
                this.hud.find('.sf1e-sidebar-btn').removeClass('active');
            }
            // Update the icon to show expand
            this.hud.find('.sf1e-hud-minimize i').removeClass('fa-chevron-down').addClass('fa-chevron-up');
            this.hud.find('.sf1e-hud-minimize').attr('title', 'Expand HUD');
        } else {
            this.hud.removeClass('minimized');
            // Update the icon to show minimize
            this.hud.find('.sf1e-hud-minimize i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
            this.hud.find('.sf1e-hud-minimize').attr('title', 'Minimize HUD');
        }

        console.log('SF1E-HUD | HUD minimized:', this.minimized);
    }

    async _handleDrop(data) {
        if (!this.actor) return;
        
        if (data.type === 'Item') {
            const item = await fromUuid(data.uuid);
            if (item) {
                // Create item on actor
                await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
                ui.notifications.info(`Added ${item.name} to ${this.actor.name}`);
            }
        }
    }
    
    _updateDisplay() {
        if (!this.actor) {
            console.log('SF1E-HUD | No actor set, hiding HUD');
            this.hud?.removeClass('active');
            this.activeSidebar = null;
            return;
        }

        // Refresh actor reference to get latest data
        const freshActor = game.actors.get(this.actor.id);
        if (freshActor) {
            this.actor = freshActor;
        }

        console.log('SF1E-HUD | Updating display for:', this.actor.name);
        this.hud?.addClass('active');
        this._updatePortrait();
        this._updateResources();
        this._updateButtons();
    }
    
    _updatePortrait() {
        const portraitDiv = this.hud.find('.sf1e-hud-portrait');
        portraitDiv.html(`
            <img src="${this.actor.img}" alt="${this.actor.name}">
            <div class="sf1e-portrait-overlay">
                <div class="sf1e-portrait-name">${this.actor.name}</div>
                <div class="sf1e-portrait-level">LVL ${this.actor.system.details?.level?.value || 1}</div>
            </div>
        `);
    }
    
    _updateResources() {
        const system = this.actor.system;
        const hp = SystemAdapter.getHP(this.actor);
        const sp = SystemAdapter.getSP(this.actor);
        const rp = SystemAdapter.getRP(this.actor);
        const heroPoints = SystemAdapter.getHeroPoints(this.actor);
        const focusPoints = SystemAdapter.getFocusPoints(this.actor);
        const acValues = SystemAdapter.getACValues(this.actor);
        const saves = SystemAdapter.getSaves(this.actor);
        const abilities = SystemAdapter.getAbilities(this.actor);

        const healthPercent = hp.max > 0 ? (hp.value / hp.max) * 100 : 0;
        const staminaPercent = sp && sp.max > 0 ? (sp.value / sp.max) * 100 : 0;

        // Build resource bars HTML
        let barsHTML = '';

        // SF1E: Stamina bar
        if (sp && sp.max > 0) {
            barsHTML += `
                <div class="sf1e-hud-bar sf1e-hud-stamina" title="Stamina Points">
                    <div class="sf1e-hud-bar-fill" style="width: ${staminaPercent}%"></div>
                    <div class="sf1e-hud-bar-label">SP</div>
                    <div class="sf1e-hud-bar-value">${sp.value}/${sp.max}</div>
                </div>
            `;
        }

        // HP bar (both systems)
        barsHTML += `
            <div class="sf1e-hud-bar sf1e-hud-hp" title="Hit Points">
                <div class="sf1e-hud-bar-fill" style="width: ${healthPercent}%"></div>
                <div class="sf1e-hud-bar-label">HP</div>
                <div class="sf1e-hud-bar-value">${hp.value}/${hp.max}</div>
            </div>
        `;

        // SF1E: Resolve Points pips
        let pipsHTML = '';
        if (rp && rp.max > 0) {
            pipsHTML += `
                <div class="sf1e-hud-resolve" title="Resolve Points" data-resource="rp">
                    <span class="sf1e-resolve-label">RP:</span>
                    ${Array.from({length: rp.max}, (_, i) =>
                        `<span class="sf1e-rp-pip ${i < rp.value ? 'filled' : ''}">●</span>`
                    ).join('')}
                </div>
            `;
        }

        // SF2E: Hero Points pips
        if (heroPoints && heroPoints.max > 0 && game.settings.get('sf1e-hud', 'showHeroPoints')) {
            pipsHTML += `
                <div class="sf1e-hud-resolve sf1e-hero-points" title="Hero Points" data-resource="heroPoints">
                    <span class="sf1e-resolve-label">Hero:</span>
                    ${Array.from({length: heroPoints.max}, (_, i) =>
                        `<span class="sf1e-rp-pip ${i < heroPoints.value ? 'filled' : ''}">◆</span>`
                    ).join('')}
                </div>
            `;
        }

        // SF2E: Focus Points pips
        if (focusPoints && focusPoints.max > 0 && game.settings.get('sf1e-hud', 'showFocusPoints')) {
            pipsHTML += `
                <div class="sf1e-hud-resolve sf1e-focus-points" title="Focus Points" data-resource="focusPoints">
                    <span class="sf1e-resolve-label">Focus:</span>
                    ${Array.from({length: focusPoints.max}, (_, i) =>
                        `<span class="sf1e-rp-pip ${i < focusPoints.value ? 'filled' : ''}">●</span>`
                    ).join('')}
                </div>
            `;
        }

        // Build ability modifiers HTML
        const abilityHTML = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(key => `
            <div class="sf1e-ability-check" data-ability="${key}" title="${key.charAt(0).toUpperCase() + key.slice(1)} Check">
                <div class="sf1e-ability-label">${key.toUpperCase()}</div>
                <div class="sf1e-ability-mod">${abilities[key] >= 0 ? '+' : ''}${abilities[key]}</div>
            </div>
        `).join('');

        // Update resource bars in left panel
        const resourcesDiv = this.hud.find('.sf1e-hud-resources');
        resourcesDiv.html(`
            <div class="sf1e-hud-bars-section">
                ${barsHTML}
            </div>

            ${pipsHTML}

            ${this._getClassResourceHTML()}

            <div class="sf1e-hud-quick-buttons">
                <button class="sf1e-quick-btn" data-action="perception" title="Quick Roll Perception">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="sf1e-quick-btn" data-action="initiative" title="Quick Roll Initiative">
                    <i class="fas fa-bolt"></i>
                </button>
            </div>

            <div class="sf1e-hud-abilities">
                ${abilityHTML}
            </div>
        `);

        // Build AC display — adapts to single or dual AC
        const acHTML = acValues.map(ac => `
            <div class="sf1e-armor-stat" title="${ac.title}">
                <div class="sf1e-armor-label">${ac.label}</div>
                <div class="sf1e-armor-value">${ac.value}</div>
            </div>
        `).join('');

        // Update stats panel on right side
        const statsPanel = this.hud.find('.sf1e-hud-stats-panel');
        statsPanel.html(`
            <div class="sf1e-hud-saves">
                <div class="sf1e-save-stat" title="Fortitude Save">
                    <div class="sf1e-save-label">FORT</div>
                    <div class="sf1e-save-value">${saves.fort >= 0 ? '+' : ''}${saves.fort}</div>
                </div>
                <div class="sf1e-save-stat" title="Reflex Save">
                    <div class="sf1e-save-label">REF</div>
                    <div class="sf1e-save-value">${saves.ref >= 0 ? '+' : ''}${saves.ref}</div>
                </div>
                <div class="sf1e-save-stat" title="Will Save">
                    <div class="sf1e-save-label">WILL</div>
                    <div class="sf1e-save-value">${saves.will >= 0 ? '+' : ''}${saves.will}</div>
                </div>
            </div>

            <div class="sf1e-hud-armor">
                ${acHTML}
            </div>
        `);

        // Update save click handlers on both locations
        this.hud.find('.sf1e-save-stat').on('click', (e) => {
            const stat = $(e.currentTarget);
            const label = stat.find('.sf1e-save-label').text().toLowerCase();
            this._rollSave(label);
        });

        // Add armor stat click handler
        this.hud.find('.sf1e-armor-stat').on('click', (e) => {
            e.stopPropagation();
            // Just a visual confirmation, AC doesn't usually get rolled
        });
        
        // Add click handlers for bars
        this.hud.find('.sf1e-hud-bar').on('click', (e) => {
            const bar = $(e.currentTarget);
            if (bar.hasClass('sf1e-hud-stamina')) {
                this._editResource('sp');
            } else if (bar.hasClass('sf1e-hud-hp')) {
                this._editResource('hp');
            }
        });

        // Add click handlers for pip resources (RP, Hero Points, Focus Points)
        this.hud.find('.sf1e-hud-resolve').on('click', (e) => {
            const el = $(e.currentTarget);
            const resourceType = el.data('resource');
            if (resourceType === 'rp') {
                this._editResource('rp');
            } else if (resourceType === 'heroPoints') {
                this._editHeroPoints();
            } else if (resourceType === 'focusPoints') {
                this._editFocusPoints();
            }
        });

        // Add quick button handlers
        this.hud.find('.sf1e-quick-btn').on('click', async (e) => {
            const action = $(e.currentTarget).data('action');
            switch(action) {
                case 'perception':
                    await this._rollPerception();
                    break;
                case 'initiative':
                    await this._rollInitiative();
                    break;
            }
        });

        // Add ability check handlers
        this.hud.find('.sf1e-ability-check').on('click', async (e) => {
            const ability = $(e.currentTarget).data('ability');
            await this._rollAbilityCheck(ability);
        });

        // Add class resource click handler
        this.hud.find('.sf1e-class-resource').on('click', (e) => {
            const el = $(e.currentTarget);
            const type = el.data('resource-type');
            const subType = el.data('resource-subtype');
            const itemId = el.data('resource-item-id');
            const name = el.data('resource-name');
            if (type && subType) {
                this._editClassResource(type, subType, itemId, name);
            }
        });
    }
    
    /**
     * Icon map for known class resource types
     */
    static CLASS_RESOURCE_ICONS = {
        vanguard:     'fa-atom',
        solarian:     'fa-sun',
        biohacker:    'fa-syringe',
        evolutionist: 'fa-dna',
        nanocyte:     'fa-microscope',
        witchwarper:  'fa-globe',
        precog:       'fa-hourglass-half',
        soldier:      'fa-crosshairs',
        mystic:       'fa-hand-sparkles',
        technomancer: 'fa-microchip',
        mechanic:     'fa-cog',
        operative:    'fa-user-secret',
        envoy:        'fa-comments'
    };

    /**
     * Get all class-specific resources from the actor's actorResource items.
     * SF1E: The sfrpg system stores class resources as embedded items of type "actorResource"
     * which are computed into system.resources during prepareData().
     * SF2E: Class resources are not applicable in the same way.
     * @returns {Array} Array of resource objects with name, type, subType, value, max, icon, itemId
     */
    _getClassResources() {
        if (!this.actor) return [];
        if (!game.settings.get('sf1e-hud', 'showClassResource')) return [];
        if (SystemAdapter.isSF2E) return []; // SF2E uses Hero/Focus Points instead

        const results = [];
        const system = this.actor.system;
        const computedResources = system.resources || {};

        // Primary approach: find actorResource items on the actor
        const resourceItems = this.actor.items.filter(i => i.type === 'actorResource');
        
        for (const item of resourceItems) {
            const type = item.system.type;
            const subType = item.system.subType;
            if (!type || !subType) continue;

            // Read the computed value from system.resources (populated during prepareData)
            const computed = computedResources[type]?.[subType];
            const value = computed?.value ?? item.system.base ?? 0;
            const min = item.system.range?.min ?? 0;
            const max = computed?.max ?? item.system.range?.max ?? 0;
            
            // Pick an icon based on type, fall back to a generic one
            const icon = PersistentHUD.CLASS_RESOURCE_ICONS[type] || 'fa-star';
            
            results.push({
                className: type,
                name: item.name || `${type} ${subType}`,
                type: type,
                subType: subType,
                value: value,
                min: min,
                max: max,
                icon: icon,
                itemId: item.id
            });
        }

        // Fallback: if no actorResource items found, scan system.resources directly
        // (in case data was prepared but items aren't visible for some reason)
        if (results.length === 0) {
            for (const [type, subtypes] of Object.entries(computedResources)) {
                if (typeof subtypes !== 'object' || subtypes === null) continue;
                for (const [subType, data] of Object.entries(subtypes)) {
                    if (typeof data !== 'object' || data === null) continue;
                    if (data.value !== undefined || data.base !== undefined) {
                        const icon = PersistentHUD.CLASS_RESOURCE_ICONS[type] || 'fa-star';
                        results.push({
                            className: type,
                            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${subType}`,
                            type: type,
                            subType: subType,
                            value: data.value ?? data.base ?? 0,
                            min: 0,
                            max: data.max ?? 0,
                            icon: icon,
                            itemId: data.source || null
                        });
                    }
                }
            }
        }

        return results;
    }

    /**
     * Generate HTML for class resource display
     * @returns {string} HTML string for class resources or empty string
     */
    _getClassResourceHTML() {
        const resources = this._getClassResources();
        if (resources.length === 0) return '';

        return resources.map(resource => {
            const { className, name, type, subType, value, max, icon, itemId } = resource;

            // For resources with max values, show a bar
            if (max > 0) {
                const percent = Math.min((value / max) * 100, 100);
                return `
                    <div class="sf1e-class-resource sf1e-class-resource-${className}" 
                         data-resource-type="${type}" 
                         data-resource-subtype="${subType}"
                         data-resource-item-id="${itemId || ''}"
                         data-resource-name="${name}"
                         title="${name}: ${value}/${max}">
                        <div class="sf1e-class-resource-bar">
                            <div class="sf1e-class-resource-fill" style="width: ${percent}%"></div>
                            <div class="sf1e-class-resource-icon"><i class="fas ${icon}"></i></div>
                            <div class="sf1e-class-resource-label">${name}</div>
                            <div class="sf1e-class-resource-value">${value}/${max}</div>
                        </div>
                    </div>
                `;
            } else {
                // For resources without max (like Solarian mode which is a state), show current value
                return `
                    <div class="sf1e-class-resource sf1e-class-resource-${className}" 
                         data-resource-type="${type}" 
                         data-resource-subtype="${subType}"
                         data-resource-item-id="${itemId || ''}"
                         data-resource-name="${name}"
                         title="${name}: ${value}">
                        <div class="sf1e-class-resource-display">
                            <span class="sf1e-class-resource-icon"><i class="fas ${icon}"></i></span>
                            <span class="sf1e-class-resource-label">${name}:</span>
                            <span class="sf1e-class-resource-value">${value}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    /**
     * Edit a class-specific resource value.
     * Uses the sfrpg API (actor.setResourceBaseValue) when available,
     * falls back to directly updating the actorResource item.
     */
    async _editClassResource(type, subType, itemId, displayName) {
        if (!this.actor) return;

        // Read current computed values
        const computed = this.actor.system.resources?.[type]?.[subType];
        let currentValue, maxValue, minValue;

        if (computed) {
            currentValue = computed.value ?? computed.base ?? 0;
        }

        // Also read from the item if we have an ID
        const resourceItem = itemId ? this.actor.items.get(itemId) : null;
        if (resourceItem) {
            currentValue = currentValue ?? resourceItem.system.base ?? 0;
            maxValue = resourceItem.system.range?.max ?? null;
            minValue = resourceItem.system.range?.min ?? 0;
        } else {
            maxValue = computed?.max ?? null;
            minValue = 0;
        }

        currentValue = currentValue ?? 0;

        const maxAttr = maxValue !== null ? `max="${maxValue}"` : '';
        const maxLabel = maxValue !== null ? `<span> / ${maxValue}</span>` : '';

        const content = `
            <form>
                <div class="form-group">
                    <label>Current ${displayName}: </label>
                    <input type="number" name="value" value="${currentValue}" min="${minValue}" ${maxAttr} autofocus />
                    ${maxLabel}
                </div>
            </form>
        `;

        const newValue = await Dialog.prompt({
            title: `Edit ${displayName}`,
            content: content,
            callback: (html) => html.find('[name="value"]').val(),
            rejectClose: false
        });

        if (newValue !== null && newValue !== undefined) {
            const parsedValue = parseInt(newValue);
            
            // Prefer the sfrpg system API if available
            if (typeof this.actor.setResourceBaseValue === 'function') {
                await this.actor.setResourceBaseValue(type, subType, parsedValue);
            } else if (resourceItem) {
                // Fallback: update the actorResource item directly
                await resourceItem.update({ 'system.base': parsedValue });
            }
        }
    }

    async _editResource(type) {
        if (!this.actor) return;
        
        // For SF1E 'rp', handle RP editing
        if (type === 'rp') {
            const rp = SystemAdapter.getRP(this.actor);
            if (!rp) return;
            const newValue = await Dialog.prompt({
                title: 'Edit RP',
                content: `
                    <form>
                        <div class="form-group">
                            <label>Current RP: </label>
                            <input type="number" name="value" value="${rp.value}" min="0" max="${rp.max}" autofocus />
                            <span> / ${rp.max}</span>
                        </div>
                    </form>
                `,
                callback: (html) => html.find('[name="value"]').val(),
                rejectClose: false
            });
            if (newValue !== null) {
                await SystemAdapter.editResource(this.actor, 'rp', newValue);
            }
            return;
        }

        const resource = this.actor.system.attributes[type];
        const current = resource.value;
        const max = resource.max;
        
        const newValue = await Dialog.prompt({
            title: `Edit ${type.toUpperCase()}`,
            content: `
                <form>
                    <div class="form-group">
                        <label>Current ${type.toUpperCase()}: </label>
                        <input type="number" name="value" value="${current}" min="0" max="${max}" autofocus />
                        <span> / ${max}</span>
                    </div>
                </form>
            `,
            callback: (html) => html.find('[name="value"]').val(),
            rejectClose: false
        });
        
        if (newValue !== null) {
            await SystemAdapter.editResource(this.actor, type, newValue);
        }
    }

    async _editHeroPoints() {
        if (!this.actor) return;
        const heroPoints = SystemAdapter.getHeroPoints(this.actor);
        if (!heroPoints) return;

        const newValue = await Dialog.prompt({
            title: 'Edit Hero Points',
            content: `
                <form>
                    <div class="form-group">
                        <label>Current Hero Points: </label>
                        <input type="number" name="value" value="${heroPoints.value}" min="0" max="${heroPoints.max}" autofocus />
                        <span> / ${heroPoints.max}</span>
                    </div>
                </form>
            `,
            callback: (html) => html.find('[name="value"]').val(),
            rejectClose: false
        });

        if (newValue !== null) {
            await SystemAdapter.editHeroPoints(this.actor, newValue);
        }
    }

    async _editFocusPoints() {
        if (!this.actor) return;
        const focusPoints = SystemAdapter.getFocusPoints(this.actor);
        if (!focusPoints) return;

        const newValue = await Dialog.prompt({
            title: 'Edit Focus Points',
            content: `
                <form>
                    <div class="form-group">
                        <label>Current Focus Points: </label>
                        <input type="number" name="value" value="${focusPoints.value}" min="0" max="${focusPoints.max}" autofocus />
                        <span> / ${focusPoints.max}</span>
                    </div>
                </form>
            `,
            callback: (html) => html.find('[name="value"]').val(),
            rejectClose: false
        });

        if (newValue !== null) {
            await SystemAdapter.editFocusPoints(this.actor, newValue);
        }
    }
    
    async _rollSave(saveType) {
        if (!this.actor) return;
        console.log('SF1E-HUD | Rolling save:', saveType);
        await SystemAdapter.rollSave(this.actor, saveType);
    }
    
    _updateButtons() {
        const buttonsDiv = this.hud.find('.sf1e-hud-buttons');

        // Count active conditions using SystemAdapter
        const allConditions = SystemAdapter.getConditions(this.actor);
        const activeConditions = allConditions.filter(c => c.active).length;
        const conditionBadge = activeConditions > 0 ?
            `<span class="sf1e-condition-badge">${activeConditions}</span>` : '';

        buttonsDiv.html(`
            <div class="sf1e-sidebar-btn" data-sidebar="weapons" title="Weapons">
                <i class="fas fa-gun"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="spells" title="Spells">
                <i class="fas fa-wand-magic-sparkles"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="items" title="Items">
                <i class="fas fa-bag-shopping"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="features" title="Features">
                <i class="fas fa-star"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="skills" title="Skills">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="conditions" title="Conditions" style="position: relative;">
                <i class="fas fa-heart-crack"></i>
                ${conditionBadge}
            </div>
        `);

        // Add click handlers
        this.hud.find('.sf1e-sidebar-btn').on('click', (e) => {
            const sidebar = $(e.currentTarget).data('sidebar');
            this._toggleSidebar(sidebar);
        });
    }
    
    _toggleSidebar(sidebarType) {
        const sidebarDiv = this.hud.find('.sf1e-hud-sidebar');
        
        // If clicking the same sidebar, close it
        if (this.activeSidebar === sidebarType) {
            this.activeSidebar = null;
            sidebarDiv.removeClass('active');
            this.hud.find('.sf1e-sidebar-btn').removeClass('active');
            return;
        }
        
        // Update active sidebar
        this.activeSidebar = sidebarType;
        this.hud.find('.sf1e-sidebar-btn').removeClass('active');
        this.hud.find(`.sf1e-sidebar-btn[data-sidebar="${sidebarType}"]`).addClass('active');
        
        // Build sidebar content
        this._buildSidebar(sidebarType);
        sidebarDiv.addClass('active');
    }
    
    _buildSidebar(type) {
        const sidebarDiv = this.hud.find('.sf1e-hud-sidebar');

        let title = type.charAt(0).toUpperCase() + type.slice(1);
        let content = '';

        switch(type) {
            case 'weapons':
                content = this._buildWeaponsList();
                break;
            case 'spells':
                content = this._buildSpellsList();
                break;
            case 'items':
                content = this._buildItemsList();
                break;
            case 'features':
                content = this._buildFeaturesList();
                break;
            case 'skills':
                content = this._buildSkillsList();
                break;
            case 'conditions':
                content = this._buildConditionsList();
                break;
        }

        sidebarDiv.html(`
            <div class="sf1e-sidebar-header">
                <h3>${title}</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                ${content}
            </div>
        `);

        // Add close handler
        sidebarDiv.find('.sf1e-sidebar-close').on('click', () => {
            this.activeSidebar = null;
            sidebarDiv.removeClass('active');
            this.hud.find('.sf1e-sidebar-btn').removeClass('active');
        });

        // Add item/skill roll handlers
        switch(type) {
            case 'weapons':
                // Weapon toggle for attachments
                sidebarDiv.find('.sf1e-weapon-toggle').on('click', (e) => {
                    try {
                        e.stopPropagation();
                        const weaponId = $(e.currentTarget).data('weapon-id');
                        if (weaponId) {
                            if (this.expandedWeapons.has(weaponId)) {
                                this.expandedWeapons.delete(weaponId);
                            } else {
                                this.expandedWeapons.add(weaponId);
                            }
                            // Rebuild weapons sidebar
                            this._buildSidebar('weapons');
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error toggling weapon:', err);
                    }
                });

                // Weapon click to open sheet (click anywhere on weapon except roll button/toggle)
                sidebarDiv.find('.sf1e-sidebar-item').on('click', (e) => {
                    try {
                        // Don't trigger if clicking on roll button or toggle
                        if ($(e.target).closest('.sf1e-item-roll, .sf1e-weapon-toggle').length > 0) {
                            return;
                        }

                        const itemId = $(e.currentTarget).data('item-id');
                        if (itemId) {
                            const weapon = this.actor.items.get(itemId);
                            if (weapon && weapon.sheet) {
                                console.log('SF1E-HUD | Opening weapon sheet:', weapon.name);
                                weapon.sheet.render(true);
                            }
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error opening weapon sheet:', err);
                    }
                });

                // Weapon attack roll handler
                sidebarDiv.find('.sf1e-item-roll').on('click', async (e) => {
                    e.stopPropagation();
                    const itemId = $(e.currentTarget).closest('.sf1e-sidebar-item').data('item-id');
                    await this._rollWeaponAttack(itemId);
                });
                break;
            case 'spells':
                // Spell click to open sheet (click anywhere on spell except roll button)
                sidebarDiv.find('.sf1e-sidebar-item').on('click', (e) => {
                    try {
                        // Don't trigger if clicking on roll button
                        if ($(e.target).closest('.sf1e-item-roll').length > 0) {
                            return;
                        }

                        const itemId = $(e.currentTarget).data('item-id');
                        if (itemId) {
                            const spell = this.actor.items.get(itemId);
                            if (spell && spell.sheet) {
                                console.log('SF1E-HUD | Opening spell sheet:', spell.name);
                                spell.sheet.render(true);
                            }
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error opening spell sheet:', err);
                    }
                });

                // Spell cast handler
                sidebarDiv.find('.sf1e-item-roll').on('click', async (e) => {
                    e.stopPropagation();
                    const itemId = $(e.currentTarget).closest('.sf1e-sidebar-item').data('item-id');
                    await this._castSpell(itemId);
                });
                break;
            case 'items':
                // Item click to open sheet (click anywhere on item except roll button)
                sidebarDiv.find('.sf1e-sidebar-item').on('click', (e) => {
                    try {
                        // Don't trigger if clicking on roll button, toggle, or filter buttons
                        if ($(e.target).closest('.sf1e-item-roll, .sf1e-container-toggle, .sf1e-filter-btn, .sf1e-sort-btn').length > 0) {
                            return;
                        }

                        const itemId = $(e.currentTarget).data('item-id');
                        if (itemId) {
                            const item = this.actor.items.get(itemId);
                            if (item && item.sheet) {
                                console.log('SF1E-HUD | Opening item sheet:', item.name);
                                item.sheet.render(true);
                            }
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error opening item sheet:', err);
                    }
                });

                // Item use handlers (roll button)
                sidebarDiv.find('.sf1e-item-roll').on('click', async (e) => {
                    try {
                        e.stopPropagation();
                        const itemId = $(e.currentTarget).closest('.sf1e-sidebar-item').data('item-id');
                        if (itemId) {
                            await this._useItem(itemId);
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error using item:', err);
                    }
                });

                // Container and attachment toggle handlers (weapons, armor, containers)
                sidebarDiv.find('.sf1e-container-toggle').on('click', (e) => {
                    try {
                        e.stopPropagation();
                        e.preventDefault();
                        const containerId = $(e.currentTarget).data('container-id');
                        if (containerId) {
                            const item = this.actor.items.get(containerId);

                            // Check if this is a weapon or armor with attachments
                            if (item && (item.type === 'weapon' || item.type === 'equipment')) {
                                if (this.expandedWeapons.has(containerId)) {
                                    this.expandedWeapons.delete(containerId);
                                } else {
                                    this.expandedWeapons.add(containerId);
                                }
                            } else {
                                // Handle container expansion
                                if (this.expandedContainers.has(containerId)) {
                                    this.expandedContainers.delete(containerId);
                                } else {
                                    this.expandedContainers.add(containerId);
                                }
                            }
                            // Rebuild items sidebar
                            this._buildSidebar('items');
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error toggling container/attachment:', err);
                    }
                });

                // Filter button handlers
                sidebarDiv.find('.sf1e-filter-btn').on('click', (e) => {
                    try {
                        e.preventDefault();
                        const filter = $(e.currentTarget).data('filter');
                        if (filter !== undefined) {
                            this.inventoryFilter = filter;
                            // Rebuild items sidebar
                            this._buildSidebar('items');
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error changing filter:', err);
                    }
                });

                // Sort button handlers
                sidebarDiv.find('.sf1e-sort-btn').on('click', (e) => {
                    try {
                        e.preventDefault();
                        const sort = $(e.currentTarget).data('sort');
                        if (sort !== undefined) {
                            this.inventorySort = sort;
                            // Rebuild items sidebar
                            this._buildSidebar('items');
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error changing sort:', err);
                    }
                });
                break;
            case 'features':
                // Features are clickable to open their sheet
                sidebarDiv.find('.sf1e-feature-item').on('click', (e) => {
                    const featureId = $(e.currentTarget).data('feature-id');
                    const feature = this.actor.items.get(featureId);
                    if (feature) {
                        feature.sheet?.render(true);
                    }
                });
                break;
            case 'skills':
                sidebarDiv.find('.sf1e-item-roll').on('click', async (e) => {
                    e.stopPropagation();
                    const skillKey = $(e.currentTarget).closest('.sf1e-skill-item').data('skill');
                    await SystemAdapter.rollSkill(this.actor, skillKey);
                });
                break;
            case 'conditions':
                // Toggle conditions on/off using SystemAdapter
                sidebarDiv.find('.sf1e-condition-item').on('click', async (e) => {
                    try {
                        e.preventDefault();
                        e.stopPropagation();

                        const conditionId = $(e.currentTarget).data('condition-id');
                        const isActive = $(e.currentTarget).hasClass('active');

                        console.log('SF1E-HUD | Toggling condition:', conditionId, '- Current active:', isActive);

                        // Refresh actor reference
                        const freshActor = game.actors.get(this.actor?.id);
                        if (!freshActor) {
                            console.error('SF1E-HUD | Could not refresh actor reference');
                            return;
                        }

                        await SystemAdapter.toggleCondition(freshActor, conditionId, isActive);

                        console.log('SF1E-HUD | Condition toggled successfully');
                        // Small delay to let the system process the change
                        setTimeout(() => this._buildSidebar('conditions'), 100);
                    } catch (err) {
                        console.error('SF1E-HUD | Error toggling condition:', err);
                    }
                });
                break;
        }
    }
    
    _buildWeaponsList() {
        const weapons = this.actor.items.filter(i => i.type === 'weapon');

        if (weapons.length === 0) {
            return '<div class="sf1e-sidebar-empty">No weapons equipped</div>';
        }

        return weapons.map(weapon => {
            const displayData = SystemAdapter.getWeaponDisplayData(weapon);
            const damage = displayData.damage;
            const range = displayData.range;

            // Ammo information — SF1E specific
            let ammoInfo = '';
            if (SystemAdapter.isSF1E) {
                ammoInfo = this._buildSF1EAmmoInfo(weapon);
            }

            // Check for attachments (upgrades loaded on the weapon)
            let attachments = weapon.system.container?.contents || [];

            // Convert objects to IDs if necessary (attachments might be objects with _id property)
            attachments = attachments.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return item._id || item.id;
                }
                return item;
            }).filter(id => id); // Remove any null/undefined

            const hasAttachments = attachments.length > 0;
            const isExpanded = this.expandedWeapons && this.expandedWeapons.has(weapon.id);

            let weaponHTML = `
                <div class="sf1e-sidebar-item sf1e-weapon-item" data-item-id="${weapon.id}">
                    ${hasAttachments ? `
                        <button class="sf1e-weapon-toggle" data-weapon-id="${weapon.id}" title="Toggle attachments">
                            <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
                        </button>
                    ` : '<div class="sf1e-weapon-toggle-placeholder"></div>'}
                    <img src="${weapon.img}" alt="${weapon.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">
                            ${weapon.name}
                            ${hasAttachments ? `<span class="sf1e-weapon-attachments-badge" title="Attachments">${attachments.length}</span>` : ''}
                        </div>
                        <div class="sf1e-item-details">
                            <span>${damage}</span>
                            <span>${range}ft</span>
                            ${ammoInfo}
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Attack">
                        <i class="fas fa-dice-d20"></i>
                    </div>
                </div>
            `;

            // Add attachments if expanded
            if (hasAttachments && isExpanded) {
                weaponHTML += `<div class="sf1e-weapon-attachments">`;
                for (const attachId of attachments) {
                    try {
                        const attachment = this.actor.items.get(attachId);
                        if (attachment) {
                            weaponHTML += `
                                <div class="sf1e-weapon-attachment" data-item-id="${attachment.id}">
                                    <img src="${attachment.img}" alt="${attachment.name}">
                                    <div class="sf1e-attachment-info">
                                        <div class="sf1e-attachment-name">${attachment.name}</div>
                                        <div class="sf1e-attachment-type">${attachment.type}</div>
                                    </div>
                                </div>
                            `;
                        }
                    } catch (e) {
                        console.warn('SF1E-HUD | Could not load attachment:', attachId, e);
                    }
                }
                weaponHTML += `</div>`;
            }

            return weaponHTML;
        }).join('');
    }

    /**
     * Build SF1E-specific ammo display HTML for a weapon.
     * SF1E stores ammo by type on weapons, matching against ammunition items in inventory.
     */
    _buildSF1EAmmoInfo(weapon) {
        const ammoType = weapon.system.itemUsage?.ammunitionType ||
                       weapon.system.ammunition?.type ||
                       weapon.system.ammoType ||
                       weapon.system.ammunitionType;
        const loadedAmmo = weapon.system.itemUsage?.capacity?.value ||
                         weapon.system.ammunition?.capacity?.value ||
                         weapon.system.capacity?.value || 0;
        const maxCapacity = weapon.system.itemUsage?.capacity?.max ||
                           weapon.system.ammunition?.capacity?.max ||
                           weapon.system.capacity?.max || 0;

        const trimmedAmmoType = (ammoType || '').trim();
        if (!trimmedAmmoType || trimmedAmmoType.length === 0 || loadedAmmo <= 0) return '';

        const matchingAmmo = this.actor.items.filter(item =>
            item.type === 'ammunition' &&
            (item.system.ammunitionType === trimmedAmmoType ||
             (item.system.category && item.system.category === trimmedAmmoType))
        );

        if (matchingAmmo.length > 0) {
            let totalAvailable = 0;
            for (const ammo of matchingAmmo) {
                if (ammo.system.useCapacity) {
                    totalAvailable += ammo.system.capacity?.value || 0;
                } else {
                    totalAvailable += ammo.system.quantity || 0;
                }
            }
            const loadedDisplay = maxCapacity > 0 ? `${loadedAmmo}/${maxCapacity}` : `${loadedAmmo}`;
            return `<span class="sf1e-ammo-loaded" title="Loaded: ${loadedDisplay}">${loadedDisplay}</span><span class="sf1e-ammo-total" title="Total available: ${totalAvailable}">+${totalAvailable}</span>`;
        } else if (loadedAmmo > 0) {
            const loadedDisplay = maxCapacity > 0 ? `${loadedAmmo}/${maxCapacity}` : `${loadedAmmo}`;
            return `<span class="sf1e-ammo-loaded" title="Loaded: ${loadedDisplay}">${loadedDisplay}</span>`;
        }

        return '';
    }
    
    _buildSpellsList() {
        const spells = this.actor.items.filter(i => i.type === 'spell');

        if (spells.length === 0) {
            return '<div class="sf1e-sidebar-empty">No spells available</div>';
        }

        // Organize spells by level/rank using SystemAdapter
        const maxRank = SystemAdapter.maxSpellRank;
        const spellsByLevel = {};
        for (let level = 0; level <= maxRank; level++) {
            spellsByLevel[level] = spells.filter(s => SystemAdapter.getSpellLevel(s) === level);
        }

        let html = '<div class="sf1e-spells-list">';

        // Build spell levels with slots
        for (let level = 0; level <= maxRank; level++) {
            const levelSpells = spellsByLevel[level];
            if (levelSpells.length === 0) continue;

            // Get slot information via SystemAdapter
            const slotInfo = SystemAdapter.getSpellSlotInfo(this.actor, level);
            const slotsUsed = slotInfo.value || 0;
            const slotsMax = slotInfo.max || 0;
            const hasSlots = slotsMax > 0;

            // Determine label
            const rankWord = SystemAdapter.isSF1E ? 'Level' : 'Rank';
            let levelLabel = level === 0 ? 'Cantrips' : `${rankWord} ${level}`;

            html += `
                <div class="sf1e-spell-level-group">
                    <div class="sf1e-spell-level-header">
                        <span class="sf1e-spell-level-name">${levelLabel}</span>
                        ${hasSlots ? `
                            <span class="sf1e-spell-slots">
                                <span class="sf1e-slots-used">${slotsUsed}</span>
                                <span class="sf1e-slots-separator">/</span>
                                <span class="sf1e-slots-max">${slotsMax}</span>
                            </span>
                        ` : ''}
                    </div>
                    <div class="sf1e-spell-level-items">
            `;

            // Add spells for this level
            html += levelSpells.map(spell => {
                const detailText = SystemAdapter.getSpellDetailText(spell);

                // Build targeting badge from SystemAdapter
                const targetDetails = SystemAdapter.getSpellDefenseInfo(spell);
                let targetInfo = '';
                if (targetDetails.length > 0) {
                    targetInfo = `<span class="sf1e-spell-target">${targetDetails.join(' | ')}</span>`;
                }

                return `
                    <div class="sf1e-sidebar-item sf1e-spell-item" data-item-id="${spell.id}">
                        <img src="${spell.img}" alt="${spell.name}">
                        <div class="sf1e-item-info">
                            <div class="sf1e-item-name">${spell.name}</div>
                            <div class="sf1e-item-details">
                                <span>${detailText}</span>
                                ${targetInfo}
                            </div>
                        </div>
                        <div class="sf1e-item-roll" title="Cast">
                            <i class="fas fa-wand-sparkles"></i>
                        </div>
                    </div>
                `;
            }).join('');

            html += `
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }
    
    _buildItemsList() {
        try {
            // Get all items excluding non-inventory types
            const nonInvTypes = SystemAdapter.getNonInventoryTypes();
            let items = this.actor.items.filter(i => !nonInvTypes.includes(i.type));

            // Build header with currency
            let html = this._buildInventoryHeader();

            // Add currency display
            html += this._buildCurrencyDisplay();

            // Calculate bulk totals
            const totalBulk = this._calculateTotalBulk(items);
            const carryCapacity = this._getCarryCapacity();

            // Add bulk display
            html += `
                <div class="sf1e-bulk-display">
                    <div class="sf1e-bulk-bar-container">
                        <div class="sf1e-bulk-label">ENCUMBRANCE</div>
                        <div class="sf1e-bulk-bar">
                            <div class="sf1e-bulk-fill" style="width: ${Math.min((totalBulk / carryCapacity) * 100, 100)}%"></div>
                        </div>
                        <div class="sf1e-bulk-text">${totalBulk.toFixed(1)} / ${carryCapacity}</div>
                    </div>
                </div>
            `;

            // Organize items by category
            const categorizedItems = this._categorizeItems(items);

            // Build categorized inventory
            html += this._buildCategorizedInventory(categorizedItems);

            return html;
        } catch (e) {
            console.error('SF1E-HUD | Error in _buildItemsList:', e);
            return '<div class="sf1e-sidebar-empty">Error loading inventory</div>';
        }
    }

    _buildCurrencyDisplay() {
        try {
            const currency = SystemAdapter.getCurrency(this.actor);
            return `
                <div class="sf1e-currency-display">
                    ${currency.display.map(c => `
                        <div class="sf1e-currency-item">
                            <i class="fas ${c.icon}"></i>
                            <span class="sf1e-currency-label">${c.label}:</span>
                            <span class="sf1e-currency-value">${c.value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            console.warn('SF1E-HUD | Error building currency display:', e);
            return '';
        }
    }

    _categorizeItems(items) {
        // Get category definitions from adapter
        const catDefs = SystemAdapter.getItemCategories();
        const categories = {};
        for (const [key, def] of Object.entries(catDefs)) {
            categories[key] = { label: def.label, items: [], icon: def.icon };
        }

        // Identify which items are inside containers
        const containerContents = new Set();
        items.forEach(item => {
            try {
                if (SystemAdapter.isContainer(item)) {
                    const contents = item.system.container?.contents || item.data?.container?.contents || [];
                    if (Array.isArray(contents)) {
                        contents.forEach(contentId => {
                            if (contentId) {
                                const id = (typeof contentId === 'object') ? (contentId._id || contentId.id) : contentId;
                                if (id) containerContents.add(id);
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('SF1E-HUD | Error identifying container contents:', item.name, e);
            }
        });

        // Categorize items, skipping items inside containers
        const nonInvTypes = SystemAdapter.getNonInventoryTypes();
        items.forEach(item => {
            try {
                if (containerContents.has(item.id)) return;
                if (nonInvTypes.includes(item.type)) return;

                const catKey = SystemAdapter.categorizeItem(item);
                if (catKey && categories[catKey]) {
                    categories[catKey].items.push(item);
                } else if (catKey) {
                    // Ensure category exists even if not pre-defined
                    if (!categories[catKey]) {
                        categories[catKey] = { label: catKey.charAt(0).toUpperCase() + catKey.slice(1), items: [], icon: 'fa-box' };
                    }
                    categories[catKey].items.push(item);
                }
            } catch (e) {
                console.warn('SF1E-HUD | Error categorizing item:', item.name, e);
            }
        });

        return categories;
    }

    _buildCategorizedInventory(categories) {
        let html = '<div class="sf1e-categorized-inventory">';

        // Only show categories with items
        Object.entries(categories).forEach(([key, category]) => {
            if (category.items.length === 0) return;

            // Apply filters to category items
            let filteredItems = this._filterInventoryItems(category.items);
            if (filteredItems.length === 0) return;

            // Apply sorting
            filteredItems = this._sortInventoryItems(filteredItems);

            html += `<div class="sf1e-inventory-category" data-category="${key}">`;
            html += `
                <div class="sf1e-category-header">
                    <i class="fas ${category.icon}"></i>
                    <span class="sf1e-category-label">${category.label}</span>
                    <span class="sf1e-category-count">(${filteredItems.length})</span>
                </div>
                <div class="sf1e-category-items">
            `;

            // Build items in category
            html += filteredItems.map(item => {
                try {
                    return this._buildItemElement(item);
                } catch (e) {
                    console.error('SF1E-HUD | Error building item:', item.name, e);
                    return '';
                }
            }).join('');

            html += `</div></div>`;
        });

        html += '</div>';
        return html;
    }

    _buildInventoryHeader() {
        return `
            <div class="sf1e-inventory-controls">
                <div class="sf1e-filter-buttons">
                    <button class="sf1e-filter-btn ${this.inventoryFilter === 'all' ? 'active' : ''}" data-filter="all" title="All Items">
                        <i class="fas fa-list"></i> All
                    </button>
                    <button class="sf1e-filter-btn ${this.inventoryFilter === 'equipped' ? 'active' : ''}" data-filter="equipped" title="Equipped Only">
                        <i class="fas fa-check"></i> Equipped
                    </button>
                    <button class="sf1e-filter-btn ${this.inventoryFilter === 'containers' ? 'active' : ''}" data-filter="containers" title="Containers Only">
                        <i class="fas fa-box"></i> Containers
                    </button>
                </div>
                <div class="sf1e-sort-buttons">
                    <button class="sf1e-sort-btn ${this.inventorySort === 'default' ? 'active' : ''}" data-sort="default" title="Default Order">
                        <i class="fas fa-sort"></i>
                    </button>
                    <button class="sf1e-sort-btn ${this.inventorySort === 'bulk' ? 'active' : ''}" data-sort="bulk" title="Sort by Bulk">
                        <i class="fas fa-weight"></i>
                    </button>
                </div>
            </div>
        `;
    }

    _filterInventoryItems(items) {
        switch(this.inventoryFilter) {
            case 'equipped':
                return items.filter(i => SystemAdapter.isItemEquipped(i));
            case 'containers':
                return items.filter(i => SystemAdapter.isContainer(i));
            case 'all':
            default:
                return items;
        }
    }

    _sortInventoryItems(items) {
        switch(this.inventorySort) {
            case 'bulk':
                return items.sort((a, b) => SystemAdapter.getItemBulk(b) - SystemAdapter.getItemBulk(a));
            case 'default':
            default:
                return items;
        }
    }

    _calculateTotalBulk(items = null) {
        if (!this.actor) return 0;

        // SF2E may have pre-computed encumbrance
        const precomputed = SystemAdapter.getTotalBulk(this.actor);
        if (precomputed !== null) return precomputed;

        const nonInvTypes = SystemAdapter.getNonInventoryTypes();
        const itemsToCount = items || this.actor.items.filter(i =>
            !nonInvTypes.includes(i.type)
        );

        try {
            const total = itemsToCount.reduce((total, item) => {
                try {
                    const bulk = SystemAdapter.getItemBulk(item);
                    const quantity = Math.max(parseInt(item.system.quantity) || 1, 1);
                    return total + (bulk * quantity);
                } catch (e) {
                    console.warn('SF1E-HUD | Error calculating bulk for item:', item.name, e);
                    return total;
                }
            }, 0);
            return isNaN(total) ? 0 : total;
        } catch (e) {
            console.warn('SF1E-HUD | Error calculating total bulk:', e);
            return 0;
        }
    }

    _getCarryCapacity() {
        if (!this.actor) return 10;
        return SystemAdapter.getCarryCapacity(this.actor);
    }

    _buildItemElement(item, depth = 0, containerName = null) {
        try {
            const quantity = item.system.quantity || 1;
            const bulk = SystemAdapter.getItemBulk(item);
            const isContainer = SystemAdapter.isContainer(item);
            const isWeapon = item.type === 'weapon';
            const isArmor = item.type === 'equipment' || item.type === 'armor';
            const isEquipped = SystemAdapter.isItemEquipped(item);
            const isExpanded = this.expandedContainers.has(item.id);
            const isWeaponExpanded = this.expandedWeapons.has(item.id);
            const isArmorExpanded = this.expandedWeapons.has(item.id); // Reuse expandedWeapons for armor too

            // Get contained items if this is a container or attachments if this is a weapon
            let containedItems = [];
            let attachments = [];

            if (isContainer) {
                // Try multiple possible locations for container contents
                let contents = item.system.container?.contents || item.data?.container?.contents || [];

                console.log(`SF1E-HUD | Checking container "${item.name}" (ID: ${item.id})`);
                console.log(`  - Type: ${item.type}, Category: ${item.system.category}`);
                console.log(`  - Contents path 1 (system.container.contents):`, item.system.container?.contents);
                console.log(`  - Contents path 2 (data.container.contents):`, item.data?.container?.contents);
                console.log(`  - Raw contents:`, contents);
                console.log(`  - Contents[0] type:`, contents && contents.length > 0 ? typeof contents[0] : 'N/A');

                // Handle case where contents is an array of objects instead of IDs
                if (Array.isArray(contents) && contents.length > 0) {
                    // If first element is an object with _id or id, extract the ID
                    if (typeof contents[0] === 'object' && contents[0] !== null) {
                        console.log(`  - Contents contains objects, extracting IDs...`);
                        containedItems = contents
                            .map(obj => {
                                try {
                                    const itemId = obj._id || obj.id || obj;
                                    console.log(`    - Object has ID: ${itemId}, looking it up...`);
                                    const foundItem = this.actor.items.get(itemId);
                                    console.log(`    - Found item:`, foundItem ? foundItem.name : 'NOT FOUND');
                                    return foundItem;
                                } catch (e) {
                                    console.warn('SF1E-HUD | Could not process container item:', obj, e);
                                    return null;
                                }
                            })
                            .filter(i => i !== null && i !== undefined);
                    } else {
                        // Contents are already IDs (strings)
                        console.log(`  - Contents are IDs (strings), looking them up...`);
                        containedItems = contents
                            .map(id => {
                                try {
                                    const foundItem = this.actor.items.get(id);
                                    console.log(`  - Found item for ID ${id}:`, foundItem ? foundItem.name : 'NOT FOUND');
                                    return foundItem;
                                } catch (e) {
                                    console.warn('SF1E-HUD | Could not find item:', id, e);
                                    return null;
                                }
                            })
                            .filter(i => i !== null && i !== undefined);
                    }
                    console.log(`  - Contained items after filtering: ${containedItems.length} items`);
                } else {
                    console.log(`  - No contents array or empty`);
                }
            }

            // Handle weapon and armor attachments (both use system.container.contents)
            if (isWeapon || isArmor) {
                let itemContents = item.system.container?.contents || item.data?.container?.contents || [];

                if (Array.isArray(itemContents) && itemContents.length > 0) {
                    // Convert objects to IDs if necessary
                    let attachmentIds = itemContents.map(obj => {
                        if (typeof obj === 'object' && obj !== null) {
                            return obj._id || obj.id;
                        }
                        return obj;
                    }).filter(id => id);

                    attachments = attachmentIds
                        .map(id => {
                            try {
                                const foundItem = this.actor.items.get(id);
                                return foundItem || null;
                            } catch (e) {
                                console.warn(`SF1E-HUD | Could not find ${isWeapon ? 'weapon' : 'armor'} attachment:`, id, e);
                                return null;
                            }
                        })
                        .filter(i => i !== null && i !== undefined);
                }
            }

            const indentClass = depth > 0 ? ` sf1e-item-indent-${Math.min(depth, 3)}` : '';
            const containerClass = isContainer ? ' sf1e-container-item' : '';
            const weaponClass = isWeapon && attachments.length > 0 ? ' sf1e-weapon-item' : '';
            const armorClass = isArmor && attachments.length > 0 ? ' sf1e-armor-item' : '';
            const equippedClass = isEquipped ? ' sf1e-equipped-item' : '';
            const inContainerClass = containerName ? ' sf1e-item-in-container' : '';

            let html = `
                <div class="sf1e-sidebar-item${containerClass}${weaponClass}${armorClass}${equippedClass}${indentClass}${inContainerClass}" data-item-id="${item.id}" data-item-type="${item.type}" data-container="${containerName || ''}">
                    ${(isContainer && containedItems.length > 0) || ((isWeapon || isArmor) && attachments.length > 0) ? `
                        <button class="sf1e-container-toggle" data-container-id="${item.id}" title="Toggle ${isWeapon ? 'weapon attachments' : isArmor ? 'armor attachments' : 'contents'}">
                            <i class="fas fa-chevron-${(isExpanded || isWeaponExpanded || isArmorExpanded) ? 'down' : 'right'}"></i>
                        </button>
                    ` : '<div class="sf1e-container-toggle-placeholder"></div>'}
                    <img src="${item.img}" alt="${item.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">
                            ${item.name}
                            ${isEquipped ? '<span class="sf1e-equipped-badge" title="Equipped"><i class="fas fa-check"></i></span>' : ''}
                            ${isContainer && containedItems.length > 0 ? `<span class="sf1e-container-badge" title="Container">${containedItems.length}</span>` : ''}
                            ${(isWeapon || isArmor) && attachments.length > 0 ? `<span class="sf1e-weapon-attachments-badge" title="Attachments">${attachments.length}</span>` : ''}
                            ${containerName ? `<span class="sf1e-in-container-badge" title="Inside: ${containerName}"><i class="fas fa-box"></i></span>` : ''}
                        </div>
                        <div class="sf1e-item-details">
                            <span>Qty: ${quantity}</span>
                            <span>Bulk: ${bulk}</span>
                            ${containerName ? `<span class="sf1e-container-info">in ${containerName}</span>` : ''}
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Use">
                        <i class="fas fa-hand"></i>
                    </div>
                </div>
            `;

            // Add contained items if expanded
            if (isContainer && isExpanded && containedItems.length > 0) {
                html += `<div class="sf1e-container-contents">`;
                html += containedItems.map(containedItem => {
                    try {
                        return this._buildItemElement(containedItem, depth + 1, item.name);
                    } catch (e) {
                        console.warn('SF1E-HUD | Error building contained item:', e);
                        return '';
                    }
                }).join('');
                html += `</div>`;
            }

            // Add weapon/armor attachments if expanded
            if ((isWeapon || isArmor) && (isWeaponExpanded || isArmorExpanded) && attachments.length > 0) {
                html += `<div class="sf1e-weapon-attachments">`;
                html += attachments.map(attachment => {
                    try {
                        const attachmentType = attachment.type || 'unknown';
                        const attachmentQuantity = attachment.system.quantity || 1;
                        return `
                            <div class="sf1e-weapon-attachment" data-item-id="${attachment.id}">
                                <img src="${attachment.img}" alt="${attachment.name}">
                                <div class="sf1e-attachment-info">
                                    <div class="sf1e-attachment-name">${attachment.name}</div>
                                    <div class="sf1e-attachment-type">${attachmentType}</div>
                                    ${attachmentQuantity > 1 ? `<div class="sf1e-attachment-qty">Qty: ${attachmentQuantity}</div>` : ''}
                                </div>
                            </div>
                        `;
                    } catch (e) {
                        console.warn(`SF1E-HUD | Error building ${isWeapon ? 'weapon' : 'armor'} attachment:`, e);
                        return '';
                    }
                }).join('');
                html += `</div>`;
            }

            return html;
        } catch (e) {
            console.error('SF1E-HUD | Error in _buildItemElement:', e);
            return `<div class="sf1e-sidebar-item"><span>Error loading item</span></div>`;
        }
    }

    _buildFeaturesList() {
        // Get feats, class features, and system-specific feature types
        const featureTypes = SystemAdapter.getFeatureTypes();
        const features = this.actor.items.filter(i => {
            if (!featureTypes.includes(i.type)) return false;

            // Filter out ability score increase feats (they clutter the features list)
            if (i.type === 'feat') {
                const name = i.name.toLowerCase();
                if (name.includes('ability') && name.includes('increase') ||
                    name.includes('ability') && name.includes('boost') ||
                    name.includes('ability score') ||
                    name.includes('asi')) {
                    return false;
                }
            }
            return true;
        });

        if (features.length === 0) {
            return '<div class="sf1e-sidebar-empty">No features available</div>';
        }

        return features.map(feature => {
            const type = SystemAdapter.getFeatureTypeLabel(feature.type);

            return `
                <div class="sf1e-sidebar-item sf1e-feature-item" data-feature-id="${feature.id}">
                    <img src="${feature.img}" alt="${feature.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${feature.name}</div>
                        <div class="sf1e-item-details">
                            <span class="sf1e-feature-type">${type}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    _buildSkillsList() {
        const skills = SystemAdapter.getSkills(this.actor);

        if (skills.length === 0) {
            return '<div class="sf1e-sidebar-empty">No skills available</div>';
        }

        return skills.map(skill => {
            const modSign = skill.mod >= 0 ? '+' : '';

            return `
                <div class="sf1e-sidebar-item sf1e-skill-item ${skill.isClass ? 'class-skill' : ''}" data-skill="${skill.key}">
                    <div class="sf1e-skill-info">
                        <div class="sf1e-skill-name">${skill.name}</div>
                        <div class="sf1e-skill-details">
                            <span class="sf1e-skill-mod">${modSign}${skill.mod}</span>
                            <span class="sf1e-skill-ranks">${skill.detailText}</span>
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Roll">
                        <i class="fas fa-dice-d20"></i>
                    </div>
                </div>
            `;
        }).join('');
    }

    _buildConditionsList() {
        console.log('SF1E-HUD | Building conditions list');

        // Refresh actor reference to get latest data
        const freshActor = game.actors.get(this.actor?.id);
        if (!freshActor) {
            console.error('SF1E-HUD | Could not refresh actor for conditions list');
            return '<div class="sf1e-sidebar-empty">Error loading conditions</div>';
        }

        const conditions = SystemAdapter.getConditions(freshActor);

        if (conditions.length === 0) {
            return '<div class="sf1e-sidebar-empty">No conditions available</div>';
        }

        // Separate active and inactive conditions
        const activeConditions = conditions.filter(c => c.active).sort((a, b) => a.name.localeCompare(b.name));
        const inactiveConditions = conditions.filter(c => !c.active).sort((a, b) => a.name.localeCompare(b.name));

        let html = '';

        // Display active conditions
        if (activeConditions.length > 0) {
            html += '<div class="sf1e-conditions-section"><h4 class="sf1e-conditions-header">Active Conditions</h4>';
            html += activeConditions.map(cond => {
                const valueDisplay = cond.value ? ` (${cond.value})` : '';
                return `
                    <div class="sf1e-condition-item active" data-condition-id="${cond.id}">
                        <div class="sf1e-condition-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="sf1e-condition-info">
                            <div class="sf1e-condition-name">${cond.name}${valueDisplay}</div>
                        </div>
                    </div>
                `;
            }).join('');
            html += '</div>';
        }

        // Display inactive conditions
        if (inactiveConditions.length > 0) {
            html += '<div class="sf1e-conditions-section"><h4 class="sf1e-conditions-header">All Conditions</h4>';
            html += inactiveConditions.map(cond => {
                return `
                    <div class="sf1e-condition-item inactive" data-condition-id="${cond.id}">
                        <div class="sf1e-condition-icon">
                            <i class="fas fa-circle"></i>
                        </div>
                        <div class="sf1e-condition-info">
                            <div class="sf1e-condition-name">${cond.name}</div>
                        </div>
                    </div>
                `;
            }).join('');
            html += '</div>';
        }

        return html;
    }

    async _rollWeaponAttack(itemId) {
        if (!this.actor) return;

        const weapon = this.actor.items.get(itemId);
        if (!weapon) {
            console.warn('SF1E-HUD | Weapon not found:', itemId);
            return;
        }

        console.log('SF1E-HUD | Rolling weapon attack:', weapon.name);
        await SystemAdapter.rollWeaponAttack(this.actor, weapon);
    }

    async _castSpell(itemId) {
        if (!this.actor) return;

        const spell = this.actor.items.get(itemId);
        if (!spell) {
            console.warn('SF1E-HUD | Spell not found:', itemId);
            return;
        }

        console.log('SF1E-HUD | Casting spell:', spell.name);
        await SystemAdapter.castSpell(this.actor, spell);
    }

    async _useItem(itemId) {
        if (!this.actor) return;

        const item = this.actor.items.get(itemId);
        if (!item) {
            console.warn('SF1E-HUD | Item not found:', itemId);
            return;
        }

        console.log('SF1E-HUD | Using item:', item.name);

        // Try different methods depending on what's available
        if (item.use && typeof item.use === 'function') {
            await item.use();
        } else if (item.roll && typeof item.roll === 'function') {
            await item.roll();
        } else if (item.displayCard && typeof item.displayCard === 'function') {
            await item.displayCard();
        }
    }

    async _rollSkill(skillKey) {
        if (!this.actor) return;
        console.log('SF1E-HUD | Rolling skill:', skillKey);
        await SystemAdapter.rollSkill(this.actor, skillKey);
    }

    async _rollPerception() {
        if (!this.actor) return;
        console.log('SF1E-HUD | Rolling Perception');
        await SystemAdapter.rollPerception(this.actor);
    }

    async _rollInitiative() {
        if (!this.actor) return;

        console.log('SF1E-HUD | Rolling Initiative');

        // Check if there is an active combat encounter
        const combat = game.combat;
        if (!combat) {
            ui.notifications.warn('No active encounter. Create an encounter in the Combat Tracker first.');
            return;
        }

        // Find this actor's combatant in the active encounter
        let combatant = combat.combatants.find(c => c.actorId === this.actor.id);

        // If the actor isn't in the encounter, try to add them via their token
        if (!combatant) {
            const token = this.actor.getActiveTokens()?.[0];
            if (token) {
                // Add token to combat
                await token.toggleCombat(combat);
                // Re-fetch combatant after adding
                combatant = combat.combatants.find(c => c.actorId === this.actor.id);
            }

            if (!combatant) {
                ui.notifications.warn(`${this.actor.name} has no token in the scene to add to the encounter.`);
                return;
            }
        }

        // Roll initiative using the combat encounter's method (uses the system's formula)
        await combat.rollInitiative([combatant.id]);
        console.log('SF1E-HUD | Initiative rolled for', this.actor.name);
    }

    async _rollAbilityCheck(ability) {
        if (!this.actor) return;
        console.log('SF1E-HUD | Rolling ability check:', ability);
        await SystemAdapter.rollAbilityCheck(this.actor, ability);
    }
}
