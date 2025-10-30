export class PersistentHUD {
    constructor() {
        this.hud = null;
        this.actor = null;
        this.activeSidebar = null;
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
        
        // Get saves
        const fort = system.attributes?.fort?.total || 0;
        const reflex = system.attributes?.reflex?.total || 0;
        const will = system.attributes?.will?.total || 0;
        
        const healthPercent = hp.max > 0 ? (hp.value / hp.max) * 100 : 0;
        const staminaPercent = sp.max > 0 ? (sp.value / sp.max) * 100 : 0;
        
        const resourcesDiv = this.hud.find('.sf1e-hud-resources');
        resourcesDiv.html(`
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
            
            ${rp.max > 0 ? `
                <div class="sf1e-hud-resolve" title="Resolve Points">
                    <span class="sf1e-resolve-label">RP:</span>
                    ${Array.from({length: rp.max}, (_, i) => 
                        `<span class="sf1e-rp-pip ${i < rp.value ? 'filled' : ''}">●</span>`
                    ).join('')}
                </div>
            ` : ''}
        `);
        
        // Add click handlers for bars
        this.hud.find('.sf1e-hud-bar').on('click', (e) => {
            const bar = $(e.currentTarget);
            if (bar.hasClass('sf1e-hud-stamina')) {
                this._editResource('sp');
            } else if (bar.hasClass('sf1e-hud-hp')) {
                this._editResource('hp');
            }
        });
        
        // Add click handler for saves
        this.hud.find('.sf1e-save-stat').on('click', (e) => {
            const stat = $(e.currentTarget);
            const label = stat.find('.sf1e-save-label').text().toLowerCase();
            this._rollSave(label);
        });
        
        // Add click handler for armor stats
        this.hud.find('.sf1e-armor-stat').on('click', (e) => {
            e.stopPropagation();
            // Just a visual confirmation, AC doesn't usually get rolled
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
        
        // Use Starfinder's roll save method if available
        if (this.actor.rollSave) {
            await this.actor.rollSave(saveName);
        } else {
            // Fallback manual roll
            const save = this.actor.system.attributes[saveName];
            if (save) {
                const roll = await new Roll(`1d20 + ${save.total}`).evaluate();
                roll.toMessage({
                    speaker: ChatMessage.getSpeaker({actor: this.actor}),
                    flavor: `${saveName.charAt(0).toUpperCase() + saveName.slice(1)} Save`
                });
            }
        }
    }
    
    _updateButtons() {
        const buttonsDiv = this.hud.find('.sf1e-hud-buttons');
        buttonsDiv.html(`
            <div class="sf1e-sidebar-btn" data-sidebar="weapons" title="Weapons">
                <i class="fas fa-crossed-swords"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="spells" title="Spells">
                <i class="fas fa-magic"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="items" title="Items">
                <i class="fas fa-backpack"></i>
            </div>
            <div class="sf1e-sidebar-btn" data-sidebar="skills" title="Skills">
                <i class="fas fa-list-check"></i>
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
            case 'skills':
                content = this._buildSkillsList();
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
    }
    
    _buildWeaponsList() {
        const weapons = this.actor.items.filter(i => i.type === 'weapon');
        
        if (weapons.length === 0) {
            return '<div class="sf1e-sidebar-empty">No weapons equipped</div>';
        }
        
        return weapons.map(weapon => {
            const damage = weapon.system.damage?.parts?.[0]?.[0] || '—';
            const range = weapon.system.range?.value || '—';
            
            return `
                <div class="sf1e-sidebar-item" data-item-id="${weapon.id}">
                    <img src="${weapon.img}" alt="${weapon.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${weapon.name}</div>
                        <div class="sf1e-item-details">
                            <span>${damage}</span>
                            <span>${range}ft</span>
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Attack">
                        <i class="fas fa-dice-d20"></i>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    _buildSpellsList() {
        const spells = this.actor.items.filter(i => i.type === 'spell');
        
        if (spells.length === 0) {
            return '<div class="sf1e-sidebar-empty">No spells available</div>';
        }
        
        return spells.map(spell => {
            const level = spell.system.level || 0;
            const school = spell.system.school || '—';
            
            return `
                <div class="sf1e-sidebar-item" data-item-id="${spell.id}">
                    <img src="${spell.img}" alt="${spell.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${spell.name}</div>
                        <div class="sf1e-item-details">
                            <span>Level ${level}</span>
                            <span>${school}</span>
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Cast">
                        <i class="fas fa-wand-sparkles"></i>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    _buildItemsList() {
        const items = this.actor.items.filter(i => 
            !['weapon', 'spell', 'feat', 'class'].includes(i.type)
        );
        
        if (items.length === 0) {
            return '<div class="sf1e-sidebar-empty">No items in inventory</div>';
        }
        
        return items.map(item => {
            const quantity = item.system.quantity || 1;
            const bulk = item.system.bulk || '—';
            
            return `
                <div class="sf1e-sidebar-item" data-item-id="${item.id}">
                    <img src="${item.img}" alt="${item.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${item.name}</div>
                        <div class="sf1e-item-details">
                            <span>Qty: ${quantity}</span>
                            <span>Bulk: ${bulk}</span>
                        </div>
                    </div>
                    <div class="sf1e-item-roll" title="Use">
                        <i class="fas fa-hand"></i>
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
            const name = skill.label || key;
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
                </div>
            `;
        }).join('');
    }
}
