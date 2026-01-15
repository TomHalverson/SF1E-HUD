export class TokenTooltip {
    constructor() {
        this.tooltip = null;
        this.currentToken = null;
        this.distanceLine = null;
    }
    
    render() {
        if (!game.settings.get('sf1e-hud', 'enableTooltip')) return;
        
        if (!this.tooltip) {
            this.tooltip = $(`
                <div id="sf1e-tooltip" class="sf1e-tooltip">
                    <div class="sf1e-tooltip-content"></div>
                </div>
            `).appendTo('body');
        }
        
        this._addEventListeners();
    }
    
    _addEventListeners() {
        $(document).on('mousemove.sf1etooltip', (event) => {
            const token = this._getTokenAtPosition(event.clientX, event.clientY);
            
            if (token !== this.currentToken) {
                this.currentToken = token;
                if (token) {
                    this._showTooltip(token, event.clientX, event.clientY);
                } else {
                    this._hideTooltip();
                }
            } else if (token) {
                this._updatePosition(event.clientX, event.clientY);
            }
        });
        
        $(document).on('mouseleave.sf1etooltip', '#board', () => {
            this._hideTooltip();
        });
    }
    
    _getTokenAtPosition(x, y) {
        const pos = canvas.stage.toLocal({x, y});
        const tokens = canvas.tokens.quadtree.getObjects(new PIXI.Rectangle(pos.x - 1, pos.y - 1, 2, 2));
        return tokens.find(t => t.visible) || null;
    }
    
    _showTooltip(token, x, y) {
        if (!token.actor) return;
        
        const actor = token.actor;
        const content = this._generateTooltipContent(token, actor);
        
        this.tooltip.find('.sf1e-tooltip-content').html(content);
        this.tooltip.addClass('active');
        this._updatePosition(x, y);
        
        if (game.settings.get('sf1e-hud', 'showDistance')) {
            this._drawDistanceLine(token);
        }
    }
    
    _hideTooltip() {
        this.tooltip?.removeClass('active');
        this._clearDistanceLine();
    }
    
    _updatePosition(x, y) {
        if (!this.tooltip) return;
        
        const side = game.settings.get('sf1e-hud', 'tooltipSide');
        const offset = 20;
        const tooltipWidth = this.tooltip.outerWidth();
        const tooltipHeight = this.tooltip.outerHeight();
        
        let left, top;
        
        switch(side) {
            case 'left':
                left = x - tooltipWidth - offset;
                top = y - tooltipHeight / 2;
                break;
            case 'right':
                left = x + offset;
                top = y - tooltipHeight / 2;
                break;
            case 'top':
                left = x - tooltipWidth / 2;
                top = y - tooltipHeight - offset;
                break;
            case 'bottom':
                left = x - tooltipWidth / 2;
                top = y + offset;
                break;
        }
        
        // Keep within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
        
        this.tooltip.css({left: `${left}px`, top: `${top}px`});
    }
    
    _generateTooltipContent(token, actor) {
        const isOwned = actor.isOwner;
        const system = actor.system;
        
        // Basic tooltip for non-owned tokens
        if (!isOwned && !actor.testUserPermission(game.user, "OBSERVER")) {
            return this._generateBasicTooltip(token, actor);
        }
        
        // Full tooltip for owned/observed tokens
        return this._generateFullTooltip(token, actor);
    }
    
    _generateBasicTooltip(token, actor) {
        const hp = actor.system.attributes?.hp || {};
        const healthPercent = (hp.value / hp.max) * 100;
        const healthStatus = this._getHealthStatus(healthPercent);
        
        return `
            <div class="sf1e-tooltip-basic">
                <div class="sf1e-tooltip-name">${token.name}</div>
                <div class="sf1e-health-bar">
                    <div class="sf1e-health-fill" style="width: ${healthPercent}%"></div>
                    <div class="sf1e-health-text">${healthStatus}</div>
                </div>
                ${this._getDistanceDisplay(token)}
            </div>
        `;
    }
    
    _generateFullTooltip(token, actor) {
        const system = actor.system;
        const hp = system.attributes?.hp || { value: 0, max: 0 };
        const sp = system.attributes?.sp || { value: 0, max: 0 };
        const rp = system.attributes?.rp || { value: 0, max: 0 };
        
        const healthPercent = hp.max > 0 ? (hp.value / hp.max) * 100 : 0;
        const staminaPercent = sp.max > 0 ? (sp.value / sp.max) * 100 : 0;
        
        const eac = system.attributes?.eac?.value || 0;
        const kac = system.attributes?.kac?.value || 0;

        const fort = system.attributes?.fort?.bonus || 0;
        const reflex = system.attributes?.reflex?.bonus || 0;
        const will = system.attributes?.will?.bonus || 0;
        
        const speeds = this._getSpeeds(system);
        const immunities = this._getIWR(system, 'di');
        const resistances = this._getIWR(system, 'dr');
        const vulnerabilities = this._getIWR(system, 'dv');
        
        return `
            <div class="sf1e-tooltip-full">
                <div class="sf1e-tooltip-header">
                    <img src="${actor.img}" class="sf1e-tooltip-portrait">
                    <div class="sf1e-tooltip-name-section">
                        <div class="sf1e-tooltip-name">${actor.name}</div>
                        <div class="sf1e-tooltip-level">Level ${system.details?.level?.value || 1}</div>
                    </div>
                </div>
                
                <div class="sf1e-tooltip-stats">
                    <div class="sf1e-stat-row">
                        <div class="sf1e-stat">
                            <span class="sf1e-stat-label">EAC</span>
                            <span class="sf1e-stat-value">${eac}</span>
                        </div>
                        <div class="sf1e-stat">
                            <span class="sf1e-stat-label">KAC</span>
                            <span class="sf1e-stat-value">${kac}</span>
                        </div>
                    </div>
                    
                    <div class="sf1e-stat-row">
                        <div class="sf1e-stat">
                            <span class="sf1e-stat-label">FORT</span>
                            <span class="sf1e-stat-value">${fort >= 0 ? '+' : ''}${fort}</span>
                        </div>
                        <div class="sf1e-stat">
                            <span class="sf1e-stat-label">REF</span>
                            <span class="sf1e-stat-value">${reflex >= 0 ? '+' : ''}${reflex}</span>
                        </div>
                        <div class="sf1e-stat">
                            <span class="sf1e-stat-label">WILL</span>
                            <span class="sf1e-stat-value">${will >= 0 ? '+' : ''}${will}</span>
                        </div>
                    </div>
                </div>
                
                <div class="sf1e-health-section">
                    ${game.settings.get('sf1e-hud', 'showStaminaBar') && sp.max > 0 ? `
                        <div class="sf1e-resource-bar sf1e-stamina-bar">
                            <div class="sf1e-resource-label">SP</div>
                            <div class="sf1e-resource-fill" style="width: ${staminaPercent}%"></div>
                            <div class="sf1e-resource-text">${sp.value} / ${sp.max}</div>
                        </div>
                    ` : ''}
                    
                    <div class="sf1e-resource-bar sf1e-hp-bar">
                        <div class="sf1e-resource-label">HP</div>
                        <div class="sf1e-resource-fill" style="width: ${healthPercent}%"></div>
                        <div class="sf1e-resource-text">${hp.value} / ${hp.max}</div>
                    </div>
                    
                    ${rp.max > 0 ? `
                        <div class="sf1e-resolve-points">
                            <span class="sf1e-rp-label">RP:</span>
                            ${this._generateResolvePoints(rp.value, rp.max)}
                        </div>
                    ` : ''}
                </div>
                
                ${speeds ? `
                    <div class="sf1e-speeds">
                        <i class="fas fa-running"></i>
                        ${speeds}
                    </div>
                ` : ''}
                
                ${immunities || resistances || vulnerabilities ? `
                    <div class="sf1e-iwr">
                        ${immunities ? `<div class="sf1e-iwr-section"><strong>Immune:</strong> ${immunities}</div>` : ''}
                        ${resistances ? `<div class="sf1e-iwr-section"><strong>Resist:</strong> ${resistances}</div>` : ''}
                        ${vulnerabilities ? `<div class="sf1e-iwr-section"><strong>Vuln:</strong> ${vulnerabilities}</div>` : ''}
                    </div>
                ` : ''}
                
                ${this._getDistanceDisplay(token)}
            </div>
        `;
    }
    
    _getHealthStatus(percent) {
        if (percent <= 0) return 'Dead';
        if (percent <= 25) return 'Critical';
        if (percent <= 50) return 'Wounded';
        if (percent <= 75) return 'Injured';
        return 'Healthy';
    }
    
    _getSpeeds(system) {
        const speeds = [];
        const attrs = system.attributes || {};
        
        if (attrs.speed?.value) {
            speeds.push(`${attrs.speed.value} ft`);
        }
        
        const special = attrs.speed?.special || '';
        if (special) {
            speeds.push(special);
        }
        
        return speeds.length > 0 ? speeds.join(', ') : null;
    }
    
    _getIWR(system, type) {
        const traits = system.traits?.[type];
        if (!traits || !Array.isArray(traits) || traits.length === 0) return null;
        
        return traits.map(t => {
            if (typeof t === 'object') {
                return t.amount ? `${t.types.join(', ')} ${t.amount}` : t.types.join(', ');
            }
            return t;
        }).join(', ');
    }
    
    _generateResolvePoints(current, max) {
        let html = '';
        for (let i = 0; i < max; i++) {
            html += `<span class="sf1e-rp-pip ${i < current ? 'filled' : ''}">◆</span>`;
        }
        return html;
    }
    
    _getDistanceDisplay(token) {
        if (!game.settings.get('sf1e-hud', 'showDistance')) return '';
        
        const controlled = canvas.tokens.controlled;
        if (controlled.length === 0) return '';
        
        const origin = controlled[0];
        if (origin === token) return '';
        
        const distance = canvas.grid.measureDistance(origin.center, token.center);
        const units = canvas.scene.grid.units || 'ft';
        
        return `
            <div class="sf1e-distance">
                <i class="fas fa-arrows-alt-h"></i>
                ${Math.round(distance)} ${units}
            </div>
        `;
    }
    
    _drawDistanceLine(token) {
        this._clearDistanceLine();
        
        const controlled = canvas.tokens.controlled;
        if (controlled.length === 0) return;
        
        const origin = controlled[0];
        if (origin === token) return;
        
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x00ffff, 0.5);
        graphics.moveTo(origin.center.x, origin.center.y);
        graphics.lineTo(token.center.x, token.center.y);
        
        canvas.interface.grid.addChild(graphics);
        this.distanceLine = graphics;
    }
    
    _clearDistanceLine() {
        if (this.distanceLine) {
            this.distanceLine.parent?.removeChild(this.distanceLine);
            this.distanceLine = null;
        }
    }
    
    destroy() {
        $(document).off('.sf1etooltip');
        this.tooltip?.remove();
        this._clearDistanceLine();
    }
}
