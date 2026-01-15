export class PersistentHUD {
    constructor() {
        this.hud = null;
        this.actor = null;
        this.activeSidebar = null;
        this.expandedContainers = new Set(); // Track expanded containers
        this.expandedWeapons = new Set(); // Track expanded weapons with attachments
        this.inventoryFilter = 'all'; // Track current inventory filter
        this.inventorySort = 'default'; // Track current sorting method
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
        const hp = system.attributes?.hp || { value: 0, max: 0 };
        const sp = system.attributes?.sp || { value: 0, max: 0 };
        const rp = system.attributes?.rp || { value: 0, max: 0 };

        // Get armor values
        const eac = system.attributes?.eac?.value || 10;
        const kac = system.attributes?.kac?.value || 10;

        // Get saves - use bonus property which contains the calculated total
        const fort = system.attributes?.fort?.bonus || 0;
        const reflex = system.attributes?.reflex?.bonus || 0;
        const will = system.attributes?.will?.bonus || 0;

        const healthPercent = hp.max > 0 ? (hp.value / hp.max) * 100 : 0;
        const staminaPercent = sp.max > 0 ? (sp.value / sp.max) * 100 : 0;

        // Update resource bars in left panel
        const resourcesDiv = this.hud.find('.sf1e-hud-resources');
        resourcesDiv.html(`
            <div class="sf1e-hud-bars-section">
                ${sp.max > 0 ? `
                    <div class="sf1e-hud-bar sf1e-hud-stamina" title="Stamina Points">
                        <div class="sf1e-hud-bar-fill" style="width: ${staminaPercent}%"></div>
                        <div class="sf1e-hud-bar-label">SP</div>
                        <div class="sf1e-hud-bar-value">${sp.value}/${sp.max}</div>
                    </div>
                ` : ''}

                <div class="sf1e-hud-bar sf1e-hud-hp" title="Hit Points">
                    <div class="sf1e-hud-bar-fill" style="width: ${healthPercent}%"></div>
                    <div class="sf1e-hud-bar-label">HP</div>
                    <div class="sf1e-hud-bar-value">${hp.value}/${hp.max}</div>
                </div>
            </div>

            ${rp.max > 0 ? `
                <div class="sf1e-hud-resolve" title="Resolve Points">
                    <span class="sf1e-resolve-label">RP:</span>
                    ${Array.from({length: rp.max}, (_, i) =>
                        `<span class="sf1e-rp-pip ${i < rp.value ? 'filled' : ''}">●</span>`
                    ).join('')}
                </div>
            ` : ''}

            <div class="sf1e-hud-quick-buttons">
                <button class="sf1e-quick-btn" data-action="perception" title="Quick Roll Perception">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="sf1e-quick-btn" data-action="initiative" title="Quick Roll Initiative">
                    <i class="fas fa-bolt"></i>
                </button>
            </div>

            <div class="sf1e-hud-abilities">
                <div class="sf1e-ability-check" data-ability="str" title="Strength Check">
                    <div class="sf1e-ability-label">STR</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.str?.mod || 0}</div>
                </div>
                <div class="sf1e-ability-check" data-ability="dex" title="Dexterity Check">
                    <div class="sf1e-ability-label">DEX</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.dex?.mod || 0}</div>
                </div>
                <div class="sf1e-ability-check" data-ability="con" title="Constitution Check">
                    <div class="sf1e-ability-label">CON</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.con?.mod || 0}</div>
                </div>
                <div class="sf1e-ability-check" data-ability="int" title="Intelligence Check">
                    <div class="sf1e-ability-label">INT</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.int?.mod || 0}</div>
                </div>
                <div class="sf1e-ability-check" data-ability="wis" title="Wisdom Check">
                    <div class="sf1e-ability-label">WIS</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.wis?.mod || 0}</div>
                </div>
                <div class="sf1e-ability-check" data-ability="cha" title="Charisma Check">
                    <div class="sf1e-ability-label">CHA</div>
                    <div class="sf1e-ability-mod">+${system.abilities?.cha?.mod || 0}</div>
                </div>
            </div>
        `);

        // Update stats panel on right side
        const statsPanel = this.hud.find('.sf1e-hud-stats-panel');
        statsPanel.html(`
            <div class="sf1e-hud-saves">
                <div class="sf1e-save-stat" title="Fortitude Save">
                    <div class="sf1e-save-label">FORT</div>
                    <div class="sf1e-save-value">+${fort}</div>
                </div>
                <div class="sf1e-save-stat" title="Reflex Save">
                    <div class="sf1e-save-label">REF</div>
                    <div class="sf1e-save-value">+${reflex}</div>
                </div>
                <div class="sf1e-save-stat" title="Will Save">
                    <div class="sf1e-save-label">WILL</div>
                    <div class="sf1e-save-value">+${will}</div>
                </div>
            </div>

            <div class="sf1e-hud-armor">
                <div class="sf1e-armor-stat" title="Energy Armor Class">
                    <div class="sf1e-armor-label">EAC</div>
                    <div class="sf1e-armor-value">${eac}</div>
                </div>
                <div class="sf1e-armor-stat" title="Kinetic Armor Class">
                    <div class="sf1e-armor-label">KAC</div>
                    <div class="sf1e-armor-value">${kac}</div>
                </div>
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
    }
    
    async _editResource(type) {
        if (!this.actor) return;
        
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
            await this.actor.update({
                [`system.attributes.${type}.value`]: parseInt(newValue)
            });
        }
    }
    
    async _rollSave(saveType) {
        if (!this.actor) return;

        const saveMap = {
            'fort': 'fortitude',
            'ref': 'reflex',
            'will': 'will'
        };

        const saveName = saveMap[saveType] || saveType;
        const shortName = saveType;

        // Use Starfinder's roll save method if available
        if (this.actor.rollSave) {
            await this.actor.rollSave(saveName);
        } else {
            // Fallback manual roll - use the short key (fort, reflex, will) to access attributes
            const save = this.actor.system.attributes[shortName];
            if (save) {
                const bonus = save.bonus || 0;
                const roll = await new Roll(`1d20 + ${bonus}`).evaluate({async: true});
                await roll.toMessage({
                    speaker: ChatMessage.getSpeaker({actor: this.actor}),
                    flavor: `${saveName.charAt(0).toUpperCase() + saveName.slice(1)} Save`
                });
            }
        }
    }
    
    _updateButtons() {
        const buttonsDiv = this.hud.find('.sf1e-hud-buttons');

        // Count active conditions for badge
        // In SFRPG, conditions are stored as boolean values directly
        const activeConditions = this.actor.system.conditions?.conditions ?
            Object.values(this.actor.system.conditions.conditions).filter(c => c === true).length : 0;
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
                    await this._rollSkill(skillKey);
                });
                break;
            case 'conditions':
                // Toggle conditions on/off
                sidebarDiv.find('.sf1e-condition-item').on('click', async (e) => {
                    try {
                        e.preventDefault();
                        e.stopPropagation();

                        const conditionId = $(e.currentTarget).data('condition-id');
                        const isActive = $(e.currentTarget).hasClass('active');

                        console.log('SF1E-HUD | Toggling condition:', conditionId, '- Current active:', isActive);
                        console.log('  - this.actor.id:', this.actor?.id);

                        // Refresh actor reference to get latest data
                        const freshActor = game.actors.get(this.actor?.id);
                        if (!freshActor) {
                            console.error('SF1E-HUD | Could not refresh actor reference, this.actor.id =', this.actor?.id);
                            return;
                        }

                        console.log('  - freshActor found:', freshActor.name);
                        console.log('  - freshActor.system.conditions type:', typeof freshActor.system.conditions);
                        console.log('  - freshActor.system.conditions:', freshActor.system.conditions);
                        console.log('  - freshActor.system.conditions?.conditions:', freshActor.system.conditions?.conditions);

                        // Get current conditions - the conditions object IS the system.conditions itself, not nested
                        const currentConditions = freshActor.system.conditions;
                        if (!currentConditions || typeof currentConditions !== 'object') {
                            console.error('SF1E-HUD | No conditions object found at system.conditions');
                            console.error('  - currentConditions:', currentConditions);
                            return;
                        }

                        const newConditions = { ...currentConditions };

                        console.log('  - Current conditions object:', currentConditions);
                        console.log('  - Condition exists:', conditionId in newConditions);
                        console.log('  - All condition keys:', Object.keys(newConditions));
                        console.log('  - newConditions type:', typeof newConditions);

                        // In SFRPG, conditions are stored as boolean values, not objects
                        if (conditionId in newConditions) {
                            const oldValue = newConditions[conditionId];
                            const newValue = !oldValue;
                            newConditions[conditionId] = newValue;
                            console.log('  - Condition found! Toggling from', oldValue, 'to', newValue);
                            console.log('  - newConditions after update:', newConditions);

                            console.log('  - Attempting to update actor...');
                            const updateResult = await freshActor.update({
                                'system.conditions': newConditions
                            });
                            console.log('  - Condition update result:', updateResult);

                            console.log('  - Rebuilding sidebar...');
                            this._buildSidebar('conditions');
                        } else {
                            console.warn('SF1E-HUD | Condition not found:', conditionId);
                            console.warn('  - Available keys:', Object.keys(newConditions));
                            console.warn('  - Checking if condition exists elsewhere...');
                            console.warn('  - freshActor.system:', freshActor.system);
                        }
                    } catch (err) {
                        console.error('SF1E-HUD | Error toggling condition:', err);
                        console.error('  - Stack:', err.stack);
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
            const damage = weapon.system.damage?.parts?.[0]?.[0] || '—';
            const range = weapon.system.range?.value || '—';

            // Get ammo information using type-based matching (SF1E stores ammo by type, not ID)
            let ammoInfo = '';

            // Try different possible locations for ammo info in this SF1E version
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

            console.log(`SF1E-HUD | Checking weapon "${weapon.name}"`);
            console.log(`  - Ammo type: ${ammoType}`);
            console.log(`  - Loaded: ${loadedAmmo}`);
            console.log(`  - system.itemUsage:`, weapon.system.itemUsage);
            console.log(`  - system.ammunition:`, weapon.system.ammunition);
            console.log(`  - system.capacity:`, weapon.system.capacity);
            console.log(`  - Full system object keys:`, Object.keys(weapon.system || {}));

            // Trim and check ammoType (it might have whitespace)
            const trimmedAmmoType = (ammoType || '').trim();
            console.log(`  - ammoType after trim: "${trimmedAmmoType}" (length: ${trimmedAmmoType.length})`);

            if (trimmedAmmoType && trimmedAmmoType.length > 0 && loadedAmmo > 0) {
                // Find all ammo items that match this weapon's type
                const matchingAmmo = this.actor.items.filter(item =>
                    item.type === 'ammunition' &&
                    (item.system.ammunitionType === trimmedAmmoType ||
                     (item.system.category && item.system.category === trimmedAmmoType))
                );

                console.log(`  - Matching ammo items found: ${matchingAmmo.length}`);
                if (matchingAmmo.length > 0) {
                    matchingAmmo.forEach(ammo => {
                        console.log(`    - ${ammo.name}: useCapacity=${ammo.system.useCapacity}, qty=${ammo.system.quantity}, capacity=${ammo.system.capacity?.value}`);
                    });
                }

                if (matchingAmmo.length > 0) {
                    // Calculate total available ammo from all matching ammo items
                    let totalAvailable = 0;
                    for (const ammo of matchingAmmo) {
                        if (ammo.system.useCapacity) {
                            totalAvailable += ammo.system.capacity?.value || 0;
                        } else {
                            totalAvailable += ammo.system.quantity || 0;
                        }
                    }

                    console.log(`  - Total available: ${totalAvailable}`);
                    console.log(`  - Max capacity: ${maxCapacity}`);
                    console.log(`  - Creating ammo badges: ${loadedAmmo}/${maxCapacity} | ${totalAvailable}`);

                    // Show two separate badges: loaded/capacity and total available
                    const loadedDisplay = maxCapacity > 0 ? `${loadedAmmo}/${maxCapacity}` : `${loadedAmmo}`;
                    ammoInfo = `<span class="sf1e-ammo-loaded" title="Loaded: ${loadedDisplay}">${loadedDisplay}</span><span class="sf1e-ammo-total" title="Total available: ${totalAvailable}">+${totalAvailable}</span>`;
                } else if (loadedAmmo > 0) {
                    console.log(`  - No matching ammo in inventory, but weapon has ${loadedAmmo} loaded`);
                    // Show loaded ammo even if no ammo items in inventory
                    const loadedDisplay = maxCapacity > 0 ? `${loadedAmmo}/${maxCapacity}` : `${loadedAmmo}`;
                    ammoInfo = `<span class="sf1e-ammo-loaded" title="Loaded: ${loadedDisplay}">${loadedDisplay}</span>`;
                }
            } else {
                console.log(`  - Skipping ammo display: ammoType="${trimmedAmmoType}" (${trimmedAmmoType.length} chars), loadedAmmo=${loadedAmmo}`);
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
    
    _buildSpellsList() {
        const spells = this.actor.items.filter(i => i.type === 'spell');

        if (spells.length === 0) {
            return '<div class="sf1e-sidebar-empty">No spells available</div>';
        }

        // Organize spells by level
        const spellsByLevel = {};
        for (let level = 0; level <= 6; level++) {
            spellsByLevel[level] = spells.filter(s => (s.system.level || 0) === level);
        }

        // Get spell slots from actor
        const spellSlots = this.actor.system.spells || {};

        let html = '<div class="sf1e-spells-list">';

        // Build spell levels with slots
        for (let level = 0; level <= 6; level++) {
            const levelSpells = spellsByLevel[level];
            if (levelSpells.length === 0) continue;

            // Get slot information
            const slotKey = `spell${level}`;
            const slotInfo = spellSlots[slotKey] || { value: 0, max: 0 };
            const slotsUsed = slotInfo.value || 0;
            const slotsMax = slotInfo.max || 0;
            const hasSlots = slotsMax > 0;

            // Determine label
            let levelLabel = level === 0 ? 'Cantrips' : `Level ${level}`;

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
                const school = spell.system.school || '—';

                // Get spell targeting info from save.type (not savingThrow)
                let targetInfo = '';
                const saveType = spell.system.save?.type;
                const saveStr = saveType ? saveType.toLowerCase() : '';
                const hasSpellResistance = spell.system.sr === true;

                // Build targeting badge
                const targetDetails = [];

                // Add save type (will, reflex, fortitude)
                if (saveStr && saveStr !== 'none' && saveStr !== '') {
                    // Map save types to proper names
                    const saveMap = {
                        'will': 'Will',
                        'ref': 'Reflex',
                        'reflex': 'Reflex',
                        'fort': 'Fortitude',
                        'fortitude': 'Fortitude',
                        'str': 'Strength',
                        'dex': 'Dexterity',
                        'con': 'Constitution',
                        'int': 'Intelligence',
                        'wis': 'Wisdom',
                        'cha': 'Charisma'
                    };
                    const saveName = saveMap[saveStr] || saveStr;
                    targetDetails.push(`${saveName} Save`);
                }

                // Add spell resistance if applicable
                if (hasSpellResistance) {
                    targetDetails.push('SR');
                }

                if (targetDetails.length > 0) {
                    targetInfo = `<span class="sf1e-spell-target">${targetDetails.join(' | ')}</span>`;
                }

                return `
                    <div class="sf1e-sidebar-item sf1e-spell-item" data-item-id="${spell.id}">
                        <img src="${spell.img}" alt="${spell.name}">
                        <div class="sf1e-item-info">
                            <div class="sf1e-item-name">${spell.name}</div>
                            <div class="sf1e-item-details">
                                <span>${school}</span>
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
            // Get all items and organize by category (excluding character info and spells)
            let items = this.actor.items.filter(i =>
                !['feat', 'class', 'race', 'theme', 'spell'].includes(i.type)
            );

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
            const currency = this.actor.system?.currency || {};
            const credits = currency.credit || 0;

            return `
                <div class="sf1e-currency-display">
                    <div class="sf1e-currency-item">
                        <i class="fas fa-coins"></i>
                        <span class="sf1e-currency-label">Credits:</span>
                        <span class="sf1e-currency-value">${credits}</span>
                    </div>
                </div>
            `;
        } catch (e) {
            console.warn('SF1E-HUD | Error building currency display:', e);
            return '';
        }
    }

    _categorizeItems(items) {
        const categories = {
            'weapons': { label: 'Weapons', items: [], icon: 'fa-gun' },
            'shields': { label: 'Shields', items: [], icon: 'fa-shield-alt' },
            'armor': { label: 'Armor', items: [], icon: 'fa-shield' },
            'ammunition': { label: 'Ammunition', items: [], icon: 'fa-box-bullets' },
            'consumables': { label: 'Consumables', items: [], icon: 'fa-vial' },
            'goods': { label: 'Goods', items: [], icon: 'fa-bag-shopping' },
            'containers': { label: 'Containers', items: [], icon: 'fa-box' },
            'technological': { label: 'Technological Items', items: [], icon: 'fa-microchip' },
            'magical': { label: 'Magical Items', items: [], icon: 'fa-wand-magic-sparkles' },
            'hybrid': { label: 'Hybrid Items', items: [], icon: 'fa-wand-magic' },
            'upgrades': { label: 'Upgrades', items: [], icon: 'fa-wrench' },
            'augmentations': { label: 'Augmentations', items: [], icon: 'fa-circle-nodes' }
        };

        // FIRST PASS: Identify which items are inside containers
        // These items should NOT appear in main categories - only nested under their container
        const containerContents = new Set();
        items.forEach(item => {
            try {
                const isContainer = item.type === 'container';
                if (isContainer) {
                    // Get the contents array - try multiple locations for compatibility
                    const contents = item.system.container?.contents || item.data?.container?.contents || [];
                    if (Array.isArray(contents)) {
                        contents.forEach(contentId => {
                            if (contentId) {
                                containerContents.add(contentId);
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('SF1E-HUD | Error identifying container contents:', item.name, e);
            }
        });

        // SECOND PASS: Categorize items, but skip items that are inside containers
        items.forEach(item => {
            try {
                // Skip items that are inside containers - they'll only appear nested
                if (containerContents.has(item.id)) {
                    return;
                }

                const type = item.type;

                // Skip spells - they're shown in the Spells sidebar, not inventory
                if (type === 'spell') {
                    return;
                }

                // Skip feats and other non-inventory items
                if (type === 'feat' || type === 'class' || type === 'race' || type === 'theme' ||
                    type === 'archetypes' || type === 'asi' || type === 'effect') {
                    return;
                }

                // Handle weapon type
                if (type === 'weapon') {
                    categories.weapons.items.push(item);
                    return;
                }

                // Handle shield type - shields are their own type, not equipment
                if (type === 'shield') {
                    categories.shields.items.push(item);
                    return;
                }

                // Handle equipment type (body armor and other equipment)
                if (type === 'equipment') {
                    categories.armor.items.push(item);
                    return;
                }

                // Handle container type
                if (type === 'container') {
                    categories.containers.items.push(item);
                    return;
                }

                // Handle ammo type
                if (type === 'ammunition') {
                    categories.ammunition.items.push(item);
                    return;
                }

                // Handle consumable type
                if (type === 'consumable') {
                    categories.consumables.items.push(item);
                    return;
                }

                // Handle goods type
                if (type === 'goods') {
                    categories.goods.items.push(item);
                    return;
                }

                // Handle technological items
                if (type === 'technological') {
                    categories.technological.items.push(item);
                    return;
                }

                // Handle magical items
                if (type === 'magic') {
                    categories.magical.items.push(item);
                    return;
                }

                // Handle hybrid items
                if (type === 'hybrid') {
                    categories.hybrid.items.push(item);
                    return;
                }

                // Handle upgrade type (equipment upgrades/enhancements)
                if (type === 'upgrade') {
                    categories.upgrades.items.push(item);
                    return;
                }

                // Handle augmentation type
                if (type === 'augmentation') {
                    categories.augmentations.items.push(item);
                    return;
                }

                // Handle fusion (enchantment fusion items)
                if (type === 'fusion') {
                    categories.upgrades.items.push(item);
                    return;
                }

                // Handle weapon accessories
                if (type === 'weaponAccessory') {
                    categories.goods.items.push(item);
                    return;
                }

                // Catch-all for unknown types - log and skip
                console.warn(`SF1E-HUD | Unknown item type in categorization: ${type} (${item.name})`);
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
                return items.filter(i => i.system.equipped === true);
            case 'containers':
                return items.filter(i => i.type === 'container');
            case 'all':
            default:
                return items;
        }
    }

    _sortInventoryItems(items) {
        switch(this.inventorySort) {
            case 'bulk':
                return items.sort((a, b) => (b.system.bulk || 0) - (a.system.bulk || 0));
            case 'default':
            default:
                return items;
        }
    }

    _calculateTotalBulk(items = null) {
        if (!this.actor) return 0;

        const itemsToCount = items || this.actor.items.filter(i =>
            !['weapon', 'spell', 'feat', 'class', 'race', 'theme', 'archetypes', 'asi', 'effect'].includes(i.type)
        );

        try {
            const total = itemsToCount.reduce((total, item) => {
                try {
                    const bulk = parseFloat(item.system.bulk) || 0;
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
        // In Starfinder 1E, carrying capacity is based on STR modifier
        // Default is 10 + STR mod, but can be modified by feats, etc.
        if (!this.actor) return 10;

        const strMod = this.actor.system.abilities?.str?.mod || 0;
        let capacity = 10 + strMod;

        // Check for carrying capacity increasing feats (add more as needed)
        const hasExpansibleCarry = this.actor.items.some(i =>
            i.type === 'feat' && (i.name.includes('Bulk') || i.name.includes('Carry') || i.name.includes('Encumbrance'))
        );

        if (hasExpansibleCarry) {
            capacity += 5; // Example bonus
        }

        return Math.max(capacity, 1); // Minimum capacity of 1
    }

    _buildItemElement(item, depth = 0, containerName = null) {
        try {
            const quantity = item.system.quantity || 1;
            const bulk = item.system.bulk || 0;
            const isContainer = item.type === 'container' || (item.type === 'loot' && item.system.category === 'container');
            const isWeapon = item.type === 'weapon';
            const isArmor = item.type === 'equipment';
            const isEquipped = item.system.equipped === true;
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
        // Get feats, class features, racial traits, and themes
        // Filter out ability score increase feats
        const features = this.actor.items.filter(i => {
            if (!['feat', 'class', 'race', 'theme'].includes(i.type)) {
                return false;
            }

            // Filter out ability score increase feats (they clutter the features list)
            if (i.type === 'feat') {
                const name = i.name.toLowerCase();
                // Check if this is an ability score increase feat
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
            let type = feature.type.toUpperCase();
            if (type === 'CLASS') {
                type = 'CLASS FEATURE';
            } else if (type === 'RACE') {
                type = 'RACIAL TRAIT';
            }

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
        const skills = this.actor.system.skills || {};

        if (Object.keys(skills).length === 0) {
            return '<div class="sf1e-sidebar-empty">No skills available</div>';
        }

        return Object.entries(skills).map(([key, skill]) => {
            // Get the full skill name from localization or use label
            let name = skill.label;
            if (!name || name === key) {
                // Try to get localized name
                name = game.i18n.localize(`SFRPG.Skill${this._capitalizeSkillName(key)}`);
            }

            const mod = skill.mod || 0;
            const ranks = skill.ranks || 0;
            const isClass = skill.isTrainedOnly || false;

            return `
                <div class="sf1e-sidebar-item sf1e-skill-item ${isClass ? 'class-skill' : ''}" data-skill="${key}">
                    <div class="sf1e-skill-info">
                        <div class="sf1e-skill-name">${name}</div>
                        <div class="sf1e-skill-details">
                            <span class="sf1e-skill-mod">+${mod}</span>
                            <span class="sf1e-skill-ranks">${ranks} ranks</span>
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Roll">
                        <i class="fas fa-dice-d20"></i>
                    </div>
                </div>
            `;
        }).join('');
    }

    _capitalizeSkillName(key) {
        // Map abbreviations to capitalized names for localization
        const map = {
            'acr': 'Acr', 'ath': 'Ath', 'blu': 'Blu', 'com': 'Com', 'cul': 'Cul',
            'dip': 'Dip', 'dis': 'Dis', 'eng': 'Eng', 'int': 'Int', 'lsc': 'Lsc',
            'med': 'Med', 'mys': 'Mys', 'per': 'Per', 'phs': 'Phs', 'pil': 'Pil',
            'pro': 'Pro', 'sen': 'Sen', 'sle': 'Sle', 'ste': 'Ste', 'sur': 'Sur'
        };
        return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    _buildConditionsList() {
        console.log('SF1E-HUD | Building conditions list');
        console.log('  - Actor:', this.actor?.name);

        // Refresh actor reference to get latest data
        const freshActor = game.actors.get(this.actor?.id);
        if (!freshActor) {
            console.error('SF1E-HUD | Could not refresh actor for conditions list');
            return '<div class="sf1e-sidebar-empty">Error loading conditions</div>';
        }

        console.log('  - Actor system.conditions:', freshActor.system?.conditions);

        // Check if conditions are stored as items with type 'condition'
        const conditionItems = freshActor.items.filter(i => i.type === 'condition');
        console.log('  - Condition items found:', conditionItems.length, conditionItems);

        // In SFRPG, conditions are stored directly at system.conditions
        const conditions = freshActor.system.conditions || {};

        const conditionsList = Array.isArray(conditions)
            ? conditions
            : Object.entries(conditions);

        console.log('  - Conditions object:', conditions);
        console.log('  - Conditions entries:', conditionsList);
        console.log('  - Entry count:', conditionsList.length);

        // Deep debug: Log the actual keys and values
        if (conditionsList.length > 0) {
            if (Array.isArray(conditionsList)) {
                conditionsList.forEach((item, idx) => {
                    console.log(`    - Condition [${idx}]:`, item);
                });
            } else {
                conditionsList.forEach(([key, value]) => {
                    console.log(`    - Condition "${key}":`, value);
                });
            }
        }

        // Also check for condition items
        if (conditionsList.length === 0 && conditionItems.length === 0) {
            return '<div class="sf1e-sidebar-empty">No conditions applied</div>';
        }

        let html = '';

        // Display condition items (if any exist)
        if (conditionItems.length > 0) {
            html += conditionItems.map(item => `
                <div class="sf1e-condition-item active" data-condition-id="${item.id}">
                    <div class="sf1e-condition-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="sf1e-condition-info">
                        <div class="sf1e-condition-name">${item.name}</div>
                        ${item.system?.description ? `<div class="sf1e-condition-notes">${item.system.description}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Display system conditions if any exist
        if (conditionsList.length > 0) {
            // Separate active and inactive conditions
            const activeConditions = [];
            const inactiveConditions = [];

            conditionsList.forEach(([condId, isActive]) => {
                if (isActive === true) {
                    activeConditions.push([condId, isActive]);
                } else {
                    inactiveConditions.push([condId, isActive]);
                }
            });

            // Sort alphabetically within each group
            activeConditions.sort((a, b) => a[0].localeCompare(b[0]));
            inactiveConditions.sort((a, b) => a[0].localeCompare(b[0]));

            // Display active conditions header
            if (activeConditions.length > 0) {
                html += '<div class="sf1e-conditions-section"><h4 class="sf1e-conditions-header">Active Conditions</h4>';
                html += activeConditions.map(([condId, isActive]) => {
                    const condName = condId.charAt(0).toUpperCase() + condId.slice(1);
                    return `
                        <div class="sf1e-condition-item active" data-condition-id="${condId}">
                            <div class="sf1e-condition-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="sf1e-condition-info">
                                <div class="sf1e-condition-name">${condName}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                html += '</div>';
            }

            // Display inactive conditions header
            if (inactiveConditions.length > 0) {
                html += '<div class="sf1e-conditions-section"><h4 class="sf1e-conditions-header">Inactive Conditions</h4>';
                html += inactiveConditions.map(([condId, isActive]) => {
                    const condName = condId.charAt(0).toUpperCase() + condId.slice(1);
                    return `
                        <div class="sf1e-condition-item inactive" data-condition-id="${condId}">
                            <div class="sf1e-condition-icon">
                                <i class="fas fa-circle"></i>
                            </div>
                            <div class="sf1e-condition-info">
                                <div class="sf1e-condition-name">${condName}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                html += '</div>';
            }
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

        // Try different methods depending on what's available
        if (weapon.roll && typeof weapon.roll === 'function') {
            await weapon.roll();
        } else if (weapon.rollAttack && typeof weapon.rollAttack === 'function') {
            await weapon.rollAttack();
        } else if (weapon.use && typeof weapon.use === 'function') {
            await weapon.use();
        } else {
            // Fallback: display card
            await weapon.displayCard?.();
        }
    }

    async _castSpell(itemId) {
        if (!this.actor) return;

        const spell = this.actor.items.get(itemId);
        if (!spell) {
            console.warn('SF1E-HUD | Spell not found:', itemId);
            return;
        }

        console.log('SF1E-HUD | Casting spell:', spell.name);

        // Try different methods depending on what's available
        if (spell.roll && typeof spell.roll === 'function') {
            await spell.roll();
        } else if (spell.use && typeof spell.use === 'function') {
            await spell.use();
        } else if (spell.displayCard && typeof spell.displayCard === 'function') {
            await spell.displayCard();
        }
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

        // Use the actor's rollSkill method if available
        if (this.actor.rollSkill && typeof this.actor.rollSkill === 'function') {
            await this.actor.rollSkill(skillKey);
        } else {
            // Fallback manual roll
            const skill = this.actor.system.skills?.[skillKey];
            if (skill) {
                const mod = skill.mod || 0;
                const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
                const skillName = skill.label || skillKey;
                await roll.toMessage({
                    speaker: ChatMessage.getSpeaker({actor: this.actor}),
                    flavor: `${skillName} Check`
                });
            }
        }
    }

    async _rollPerception() {
        if (!this.actor) return;

        console.log('SF1E-HUD | Rolling Perception');

        // Perception is typically a Wisdom-based skill check
        const perceptionSkill = this.actor.system.skills?.per;
        if (perceptionSkill) {
            if (this.actor.rollSkill && typeof this.actor.rollSkill === 'function') {
                await this.actor.rollSkill('per');
            } else {
                const mod = perceptionSkill.mod || 0;
                const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
                await roll.toMessage({
                    speaker: ChatMessage.getSpeaker({actor: this.actor}),
                    flavor: 'Perception Check'
                });
            }
        }
    }

    async _rollInitiative() {
        if (!this.actor) return;

        console.log('SF1E-HUD | Rolling Initiative');

        // Initiative is typically based on Dexterity modifier + any initiative bonuses
        const dexMod = this.actor.system.abilities?.dex?.mod || 0;
        const initBonus = this.actor.system.attributes?.init?.bonus || 0;
        const totalMod = dexMod + initBonus;

        const roll = await new Roll(`1d20 + ${totalMod}`).evaluate({async: true});
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: 'Initiative Check'
        });
    }

    async _rollAbilityCheck(ability) {
        if (!this.actor) return;

        console.log('SF1E-HUD | Rolling ability check:', ability);

        // Map ability abbreviations to full names and ability scores
        const abilityMap = {
            'str': { name: 'Strength', path: 'strength' },
            'dex': { name: 'Dexterity', path: 'dexterity' },
            'con': { name: 'Constitution', path: 'constitution' },
            'int': { name: 'Intelligence', path: 'intelligence' },
            'wis': { name: 'Wisdom', path: 'wisdom' },
            'cha': { name: 'Charisma', path: 'charisma' }
        };

        const abilityInfo = abilityMap[ability];
        if (!abilityInfo) return;

        // Get the ability modifier
        const abilityData = this.actor.system.abilities?.[ability];
        const mod = abilityData?.mod || 0;

        const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: `${abilityInfo.name} Check`
        });
    }
}
