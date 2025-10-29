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
        
        const healthPercent = hp.max > 0 ? (hp.value / hp.max) * 100 : 0;
        const staminaPercent = sp.max > 0 ? (sp.value / sp.max) * 100 : 0;
        
        const resourcesDiv = this.hud.find('.sf1e-hud-resources');
        resourcesDiv.html(`
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
                    ${this._generateResolvePoints(rp.value, rp.max)}
                </div>
            ` : ''}
        `);
        
        // Add click handlers for adjusting resources
        resourcesDiv.find('.sf1e-hud-stamina').on('click', () => this._openResourceDialog('sp'));
        resourcesDiv.find('.sf1e-hud-hp').on('click', () => this._openResourceDialog('hp'));
    }
    
    _generateResolvePoints(current, max) {
        let html = '';
        for (let i = 0; i < max; i++) {
            const filled = i < current;
            html += `<span class="sf1e-rp-pip ${filled ? 'filled' : ''}" data-index="${i}">◆</span>`;
        }
        return html;
    }
    
    _updateButtons() {
        const buttonsDiv = this.hud.find('.sf1e-hud-buttons');
        buttonsDiv.html(`
            <button class="sf1e-sidebar-btn" data-sidebar="actions" title="Actions">
                <i class="fas fa-bolt"></i>
            </button>
            <button class="sf1e-sidebar-btn" data-sidebar="weapons" title="Weapons">
                <i class="fas fa-crosshairs"></i>
            </button>
            <button class="sf1e-sidebar-btn" data-sidebar="spells" title="Spells">
                <i class="fas fa-wand-magic-sparkles"></i>
            </button>
            <button class="sf1e-sidebar-btn" data-sidebar="items" title="Items">
                <i class="fas fa-backpack"></i>
            </button>
            <button class="sf1e-sidebar-btn" data-sidebar="skills" title="Skills">
                <i class="fas fa-graduation-cap"></i>
            </button>
        `);
        
        buttonsDiv.find('.sf1e-sidebar-btn').on('click', (e) => {
            const sidebar = $(e.currentTarget).data('sidebar');
            this._toggleSidebar(sidebar);
        });
    }
    
    _toggleSidebar(sidebarType) {
        const sidebarDiv = this.hud.find('.sf1e-hud-sidebar');
        
        if (this.activeSidebar === sidebarType) {
            // Close current sidebar
            this.activeSidebar = null;
            sidebarDiv.removeClass('active').empty();
            this.hud.find('.sf1e-sidebar-btn').removeClass('active');
        } else {
            // Open new sidebar
            this.activeSidebar = sidebarType;
            this.hud.find('.sf1e-sidebar-btn').removeClass('active');
            this.hud.find(`[data-sidebar="${sidebarType}"]`).addClass('active');
            
            sidebarDiv.addClass('active');
            this._renderSidebar(sidebarType);
        }
    }
    
    _renderSidebar(type) {
        const sidebarDiv = this.hud.find('.sf1e-hud-sidebar');
        
        let content = '';
        switch(type) {
            case 'actions':
                content = this._renderActionsSidebar();
                break;
            case 'weapons':
                content = this._renderWeaponsSidebar();
                break;
            case 'spells':
                content = this._renderSpellsSidebar();
                break;
            case 'items':
                content = this._renderItemsSidebar();
                break;
            case 'skills':
                content = this._renderSkillsSidebar();
                break;
        }
        
        sidebarDiv.html(content);
        this._addSidebarEventListeners(type);
    }
    
    _renderActionsSidebar() {
        return `
            <div class="sf1e-sidebar-header">
                <h3>Actions</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                <div class="sf1e-action-grid">
                    <button class="sf1e-action-btn" data-action="standard">
                        <i class="fas fa-fist-raised"></i>
                        <span>Standard Action</span>
                    </button>
                    <button class="sf1e-action-btn" data-action="move">
                        <i class="fas fa-running"></i>
                        <span>Move Action</span>
                    </button>
                    <button class="sf1e-action-btn" data-action="swift">
                        <i class="fas fa-bolt"></i>
                        <span>Swift Action</span>
                    </button>
                    <button class="sf1e-action-btn" data-action="full">
                        <i class="fas fa-expand"></i>
                        <span>Full Action</span>
                    </button>
                    <button class="sf1e-action-btn" data-action="reaction">
                        <i class="fas fa-shield-alt"></i>
                        <span>Reaction</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    _renderWeaponsSidebar() {
        const weapons = this.actor.items.filter(i => i.type === 'weapon');
        
        let weaponsList = weapons.map(weapon => {
            const attack = weapon.system.attack?.bonus || 0;
            const damage = weapon.system.damage?.parts?.[0]?.[0] || '';
            
            return `
                <div class="sf1e-sidebar-item" data-item-id="${weapon.id}">
                    <img src="${weapon.img}" alt="${weapon.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${weapon.name}</div>
                        <div class="sf1e-item-details">
                            <span>+${attack}</span>
                            <span>${damage}</span>
                        </div>
                    </div>
                    <button class="sf1e-item-roll" data-action="attack">
                        <i class="fas fa-dice-d20"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        if (!weaponsList) {
            weaponsList = '<div class="sf1e-sidebar-empty">No weapons equipped</div>';
        }
        
        return `
            <div class="sf1e-sidebar-header">
                <h3>Weapons</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                ${weaponsList}
            </div>
        `;
    }
    
    _renderSpellsSidebar() {
        const spells = this.actor.items.filter(i => i.type === 'spell').sort((a, b) => {
            return (a.system.level || 0) - (b.system.level || 0);
        });
        
        let spellsList = spells.map(spell => {
            const level = spell.system.level || 0;
            const school = spell.system.school || '';
            
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
                    <button class="sf1e-item-roll" data-action="cast">
                        <i class="fas fa-wand-sparkles"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        if (!spellsList) {
            spellsList = '<div class="sf1e-sidebar-empty">No spells known</div>';
        }
        
        return `
            <div class="sf1e-sidebar-header">
                <h3>Spells</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                ${spellsList}
            </div>
        `;
    }
    
    _renderItemsSidebar() {
        const items = this.actor.items.filter(i => 
            ['consumable', 'goods', 'technological'].includes(i.type)
        );
        
        let itemsList = items.map(item => {
            const quantity = item.system.quantity || 1;
            
            return `
                <div class="sf1e-sidebar-item" data-item-id="${item.id}">
                    <img src="${item.img}" alt="${item.name}">
                    <div class="sf1e-item-info">
                        <div class="sf1e-item-name">${item.name}</div>
                        <div class="sf1e-item-details">
                            <span>Qty: ${quantity}</span>
                        </div>
                    </div>
                    <button class="sf1e-item-roll" data-action="use">
                        <i class="fas fa-hand-pointer"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        if (!itemsList) {
            itemsList = '<div class="sf1e-sidebar-empty">No items in inventory</div>';
        }
        
        return `
            <div class="sf1e-sidebar-header">
                <h3>Items</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                ${itemsList}
            </div>
        `;
    }
    
    _renderSkillsSidebar() {
        const skills = this.actor.system.skills || {};
        
        let skillsList = Object.entries(skills).map(([key, skill]) => {
            const mod = skill.mod || 0;
            const ranks = skill.ranks || 0;
            const isClassSkill = skill.classSkill || false;
            
            return `
                <div class="sf1e-sidebar-item sf1e-skill-item ${isClassSkill ? 'class-skill' : ''}" 
                     data-skill="${key}">
                    <div class="sf1e-skill-info">
                        <div class="sf1e-skill-name">${skill.label || key}</div>
                        <div class="sf1e-skill-details">
                            <span class="sf1e-skill-mod">${mod >= 0 ? '+' : ''}${mod}</span>
                            <span class="sf1e-skill-ranks">Ranks: ${ranks}</span>
                        </div>
                    </div>
                    <button class="sf1e-skill-roll">
                        <i class="fas fa-dice-d20"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        return `
            <div class="sf1e-sidebar-header">
                <h3>Skills</h3>
                <button class="sf1e-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sf1e-sidebar-content">
                ${skillsList}
            </div>
        `;
    }
    
    _addSidebarEventListeners(type) {
        const sidebarDiv = this.hud.find('.sf1e-hud-sidebar');
        
        // Close button
        sidebarDiv.find('.sf1e-sidebar-close').on('click', () => {
            this._toggleSidebar(this.activeSidebar);
        });
        
        // Item rolls
        sidebarDiv.find('.sf1e-item-roll').on('click', (e) => {
            const itemId = $(e.currentTarget).closest('.sf1e-sidebar-item').data('item-id');
            const item = this.actor.items.get(itemId);
            if (item) {
                item.roll();
            }
        });
        
        // Skill rolls
        sidebarDiv.find('.sf1e-skill-roll').on('click', (e) => {
            const skillKey = $(e.currentTarget).closest('.sf1e-skill-item').data('skill');
            this.actor.rollSkill(skillKey);
        });
        
        // Item right-click to view sheet
        sidebarDiv.find('.sf1e-sidebar-item').on('contextmenu', (e) => {
            e.preventDefault();
            const itemId = $(e.currentTarget).data('item-id');
            const item = this.actor.items.get(itemId);
            if (item) {
                item.sheet.render(true);
            }
        });
    }
    
    _openResourceDialog(resourceType) {
        const system = this.actor.system;
        const resource = system.attributes?.[resourceType];
        if (!resource) return;
        
        const label = resourceType === 'hp' ? 'Hit Points' : 'Stamina Points';
        
        new Dialog({
            title: `Adjust ${label}`,
            content: `
                <form>
                    <div class="form-group">
                        <label>Current Value (${resource.value}/${resource.max})</label>
                        <input type="number" name="value" value="${resource.value}" 
                               min="0" max="${resource.max}" step="1"/>
                    </div>
                </form>
            `,
            buttons: {
                set: {
                    label: 'Set',
                    callback: (html) => {
                        const value = parseInt(html.find('[name="value"]').val());
                        this.actor.update({
                            [`system.attributes.${resourceType}.value`]: value
                        });
                    }
                },
                cancel: {
                    label: 'Cancel'
                }
            },
            default: 'set'
        }).render(true);
    }
    
    destroy() {
        if (this._updateHook) {
            Hooks.off('updateActor', this._updateHook);
        }
        this.hud?.remove();
    }
}
