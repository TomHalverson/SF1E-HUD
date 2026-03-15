/**
 * System Adapter for SF1E HUD
 * Normalizes data access between Starfinder 1E (sfrpg) and Starfinder 2E (sf2e / PF2E-based).
 *
 * SF1E (sfrpg) — classic Starfinder with EAC/KAC, SP/RP, rank-based skills
 * SF2E (sf2e)  — built from PF2E codebase with single AC, proficiency skills, hero/focus points
 */

export class SystemAdapter {

    // ═══════════════════════════════════════════
    //  System Detection
    // ═══════════════════════════════════════════

    static get systemId() { return game.system.id; }
    static get isSF1E()   { return this.systemId === 'sfrpg'; }
    static get isSF2E()   { return this.systemId === 'sf2e'; }

    // ═══════════════════════════════════════════
    //  Hit Points
    // ═══════════════════════════════════════════

    static getHP(actor) {
        const hp = actor.system.attributes?.hp;
        return { value: hp?.value ?? 0, max: hp?.max ?? 0 };
    }

    // ═══════════════════════════════════════════
    //  Stamina Points (SF1E only)
    // ═══════════════════════════════════════════

    static getSP(actor) {
        if (!this.isSF1E) return null;
        const sp = actor.system.attributes?.sp;
        if (!sp || sp.max <= 0) return null;
        return { value: sp.value ?? 0, max: sp.max ?? 0 };
    }

    // ═══════════════════════════════════════════
    //  Resolve Points (SF1E only)
    // ═══════════════════════════════════════════

    static getRP(actor) {
        if (!this.isSF1E) return null;
        const rp = actor.system.attributes?.rp;
        if (!rp || rp.max <= 0) return null;
        return { value: rp.value ?? 0, max: rp.max ?? 0 };
    }

    // ═══════════════════════════════════════════
    //  Hero Points (SF2E only)
    // ═══════════════════════════════════════════

    static getHeroPoints(actor) {
        if (!this.isSF2E) return null;
        const hp = actor.system.resources?.heroPoints;
        if (!hp) return null;
        return { value: hp.value ?? 0, max: hp.max ?? 3 };
    }

    // ═══════════════════════════════════════════
    //  Focus Points (SF2E only)
    // ═══════════════════════════════════════════

    static getFocusPoints(actor) {
        if (!this.isSF2E) return null;
        const fp = actor.system.resources?.focus;
        if (!fp || (fp.max ?? 0) <= 0) return null;
        return { value: fp.value ?? 0, max: fp.max ?? 0 };
    }

    // ═══════════════════════════════════════════
    //  Armor Class
    //  Returns an array of { label, value, title } for flexible display
    // ═══════════════════════════════════════════

    static getACValues(actor) {
        if (this.isSF1E) {
            return [
                { label: 'EAC', value: actor.system.attributes?.eac?.value ?? 10, title: 'Energy Armor Class' },
                { label: 'KAC', value: actor.system.attributes?.kac?.value ?? 10, title: 'Kinetic Armor Class' }
            ];
        }
        return [
            { label: 'AC', value: actor.system.attributes?.ac?.value ?? 10, title: 'Armor Class' }
        ];
    }

    // ═══════════════════════════════════════════
    //  Saving Throws — values
    // ═══════════════════════════════════════════

    static getSaves(actor) {
        if (this.isSF1E) {
            return {
                fort: actor.system.attributes?.fort?.bonus ?? 0,
                ref:  actor.system.attributes?.reflex?.bonus ?? 0,
                will: actor.system.attributes?.will?.bonus ?? 0
            };
        }
        // SF2E — saves live under system.saves
        return {
            fort: actor.system.saves?.fortitude?.totalModifier ?? actor.system.saves?.fortitude?.value ?? 0,
            ref:  actor.system.saves?.reflex?.totalModifier    ?? actor.system.saves?.reflex?.value    ?? 0,
            will: actor.system.saves?.will?.totalModifier      ?? actor.system.saves?.will?.value      ?? 0
        };
    }

    // ═══════════════════════════════════════════
    //  Saving Throws — rolling
    // ═══════════════════════════════════════════

    static async rollSave(actor, saveType) {
        const fullNameMap = { 'fort': 'fortitude', 'ref': 'reflex', 'will': 'will' };
        const fullName = fullNameMap[saveType] || saveType;

        if (this.isSF1E) {
            if (typeof actor.rollSave === 'function') {
                return actor.rollSave(fullName);
            }
            // Manual fallback
            const shortKey = saveType === 'ref' ? 'reflex' : saveType;
            const bonus = actor.system.attributes?.[shortKey]?.bonus ?? 0;
            const roll = await new Roll(`1d20 + ${bonus}`).evaluate({ async: true });
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `${fullName.charAt(0).toUpperCase() + fullName.slice(1)} Save`
            });
        }

        // SF2E — prefer actor.saves.X.roll(), then actor.rollSave()
        if (actor.saves?.[fullName]?.roll) {
            return actor.saves[fullName].roll();
        }
        if (typeof actor.rollSave === 'function') {
            return actor.rollSave(fullName);
        }
        // Manual fallback
        const saves = this.getSaves(actor);
        const mod = saves[saveType] ?? 0;
        const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: `${fullName.charAt(0).toUpperCase() + fullName.slice(1)} Save`
        });
    }

    // ═══════════════════════════════════════════
    //  Ability Modifiers
    // ═══════════════════════════════════════════

    static getAbilities(actor) {
        const abilities = {};
        for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            abilities[key] = actor.system.abilities?.[key]?.mod ?? 0;
        }
        return abilities;
    }

    // ═══════════════════════════════════════════
    //  Perception
    // ═══════════════════════════════════════════

    static getPerception(actor) {
        if (this.isSF1E) {
            return actor.system.skills?.per?.mod ?? 0;
        }
        return actor.system.perception?.totalModifier ?? actor.system.perception?.mod ?? 0;
    }

    static async rollPerception(actor) {
        if (this.isSF1E) {
            if (typeof actor.rollSkill === 'function') {
                return actor.rollSkill('per');
            }
            const mod = actor.system.skills?.per?.mod ?? 0;
            const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: 'Perception Check'
            });
        }

        // SF2E — perception is a standalone statistic, not a skill
        if (actor.perception?.roll) {
            return actor.perception.roll();
        }
        const mod = this.getPerception(actor);
        const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: 'Perception Check'
        });
    }

    // ═══════════════════════════════════════════
    //  Speed
    // ═══════════════════════════════════════════

    static getSpeed(actor) {
        const speed = actor.system.attributes?.speed;
        if (this.isSF2E) {
            // SF2E may store other speeds as an array
            const otherSpeeds = speed?.otherSpeeds;
            const special = Array.isArray(otherSpeeds)
                ? otherSpeeds.map(s => `${s.type} ${s.value} ft`).join(', ')
                : (speed?.special || '');
            return {
                value: speed?.total ?? speed?.value ?? 0,
                special
            };
        }
        return {
            value: speed?.value ?? 0,
            special: speed?.special || ''
        };
    }

    // ═══════════════════════════════════════════
    //  Skills
    //  Returns a normalized, sorted array of skill objects
    // ═══════════════════════════════════════════

    static getSkills(actor) {
        const skills = actor.system.skills || {};
        const result = [];

        for (const [key, skill] of Object.entries(skills)) {
            if (this.isSF1E) {
                let name = skill.label || key;
                if (!name || name === key) {
                    name = game.i18n.localize(`SFRPG.Skill${this._capitalizeSF1ESkill(key)}`);
                }
                result.push({
                    key,
                    name,
                    mod: skill.mod ?? 0,
                    ranks: skill.ranks ?? 0,
                    isClass: skill.isTrainedOnly || false,
                    detailText: `${skill.ranks ?? 0} ranks`
                });
            } else {
                // SF2E — proficiency-based
                const rank = skill.rank ?? 0;
                const profLabels = ['U', 'T', 'E', 'M', 'L'];
                const profLabel = profLabels[rank] || 'U';

                let name = skill.label || key;
                if (name === key) {
                    name = key.charAt(0).toUpperCase() + key.slice(1);
                }

                result.push({
                    key,
                    name,
                    mod: skill.totalModifier ?? skill.mod ?? 0,
                    rank,
                    proficiency: profLabel,
                    isClass: rank > 0,
                    detailText: profLabel
                });
            }
        }

        result.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }

    /** @private Map SF1E 3-letter skill keys to i18n suffix */
    static _capitalizeSF1ESkill(key) {
        const map = {
            'acr': 'Acr', 'ath': 'Ath', 'blu': 'Blu', 'com': 'Com', 'cul': 'Cul',
            'dip': 'Dip', 'dis': 'Dis', 'eng': 'Eng', 'int': 'Int', 'lsc': 'Lsc',
            'med': 'Med', 'mys': 'Mys', 'per': 'Per', 'phs': 'Phs', 'pil': 'Pil',
            'pro': 'Pro', 'sen': 'Sen', 'sle': 'Sle', 'ste': 'Ste', 'sur': 'Sur'
        };
        return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    // ═══════════════════════════════════════════
    //  Skill Rolling
    // ═══════════════════════════════════════════

    static async rollSkill(actor, skillKey) {
        if (this.isSF1E) {
            if (typeof actor.rollSkill === 'function') {
                return actor.rollSkill(skillKey);
            }
        } else {
            // SF2E — actors may expose skill objects with roll()
            if (actor.skills?.[skillKey]?.roll) {
                return actor.skills[skillKey].roll();
            }
            if (typeof actor.rollSkill === 'function') {
                return actor.rollSkill(skillKey);
            }
        }

        // Manual fallback
        const skill = actor.system.skills?.[skillKey];
        if (skill) {
            const mod = skill.totalModifier ?? skill.mod ?? 0;
            const skillName = skill.label || skillKey;
            const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `${skillName} Check`
            });
        }
    }

    // ═══════════════════════════════════════════
    //  Conditions
    // ═══════════════════════════════════════════

    /** Standard PF2E / SF2E conditions for the "all conditions" list */
    static SF2E_CONDITIONS = [
        'blinded', 'broken', 'clumsy', 'concealed', 'confused', 'controlled',
        'dazzled', 'deafened', 'doomed', 'drained', 'dying', 'encumbered',
        'enfeebled', 'fascinated', 'fatigued', 'fleeing', 'frightened',
        'grabbed', 'hidden', 'immobilized', 'invisible', 'off-guard',
        'paralyzed', 'petrified', 'prone', 'quickened', 'restrained',
        'sickened', 'slowed', 'stunned', 'stupefied', 'unconscious',
        'undetected', 'wounded'
    ];

    /**
     * Get normalized condition data for the actor.
     * @returns {Array<{id, name, active, value}>}
     */
    static getConditions(actor) {
        if (this.isSF1E) {
            return this._getSF1EConditions(actor);
        }
        return this._getSF2EConditions(actor);
    }

    static _getSF1EConditions(actor) {
        const conditions = actor.system.conditions || {};
        const hasConditionFn = typeof actor.hasCondition === 'function';
        const result = [];

        for (const [id, isActive] of Object.entries(conditions)) {
            const active = hasConditionFn ? actor.hasCondition(id) : (isActive === true);
            result.push({
                id,
                name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                active,
                value: null
            });
        }
        return result;
    }

    static _getSF2EConditions(actor) {
        // Active conditions are embedded items of type 'condition'
        const activeItems = actor.items.filter(i => i.type === 'condition');
        const activeMap = new Map();

        for (const cond of activeItems) {
            const slug = cond.system.slug || cond.slug || cond.name.toLowerCase().replace(/\s+/g, '-');
            activeMap.set(slug, {
                value: cond.system.value?.value ?? cond.system.value ?? null,
                name: cond.name,
                img: cond.img
            });
        }

        const result = [];

        // Standard conditions
        for (const condId of this.SF2E_CONDITIONS) {
            const activeData = activeMap.get(condId);
            result.push({
                id: condId,
                name: activeData?.name || condId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                active: !!activeData,
                value: activeData?.value ?? null,
                img: activeData?.img || null
            });
        }

        // Include any active conditions not in the standard list
        for (const [slug, data] of activeMap) {
            if (!this.SF2E_CONDITIONS.includes(slug)) {
                result.push({
                    id: slug,
                    name: data.name,
                    active: true,
                    value: data.value,
                    img: data.img
                });
            }
        }

        return result;
    }

    /**
     * Toggle a condition on/off.
     */
    static async toggleCondition(actor, conditionId, currentlyActive) {
        if (this.isSF1E) {
            if (typeof actor.setCondition === 'function') {
                return actor.setCondition(conditionId, !currentlyActive);
            }
            return actor.update({ [`system.conditions.${conditionId}`]: !currentlyActive });
        }

        // SF2E — conditions are embedded items
        if (currentlyActive) {
            // Remove condition
            const condItem = actor.items.find(i =>
                i.type === 'condition' &&
                (i.system.slug === conditionId || i.slug === conditionId ||
                 i.name.toLowerCase().replace(/\s+/g, '-') === conditionId)
            );
            if (condItem) {
                return condItem.delete();
            }
        } else {
            // Add condition — try system APIs first
            const manager = game.sf2e?.ConditionManager ?? game.pf2e?.ConditionManager;
            if (typeof manager?.addConditionToActor === 'function') {
                return manager.addConditionToActor(conditionId, actor);
            }

            // Fallback: pull from compendium
            const pack = game.packs.get('sf2e.conditionitems') ?? game.packs.get('pf2e.conditionitems');
            if (pack) {
                const index = await pack.getIndex();
                const entry = index.find(e =>
                    (e.system?.slug || e.name.toLowerCase().replace(/\s+/g, '-')) === conditionId
                );
                if (entry) {
                    const doc = await pack.getDocument(entry._id);
                    if (doc) {
                        return actor.createEmbeddedDocuments('Item', [doc.toObject()]);
                    }
                }
            }

            // Last resort: create a bare condition item
            return actor.createEmbeddedDocuments('Item', [{
                name: conditionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                type: 'condition',
                system: { slug: conditionId }
            }]);
        }
    }

    // ═══════════════════════════════════════════
    //  Currency
    // ═══════════════════════════════════════════

    /**
     * @returns {{ display: Array<{label, value, icon}> }}
     */
    static getCurrency(actor) {
        if (this.isSF1E) {
            return {
                display: [
                    { label: 'Credits', value: actor.system.currency?.credit ?? 0, icon: 'fa-coins' }
                ]
            };
        }
        // SF2E / PF2E
        const c = actor.system.currency || {};
        const display = [];
        if (c.pp) display.push({ label: 'PP', value: c.pp, icon: 'fa-gem' });
        display.push({ label: 'GP', value: c.gp ?? 0, icon: 'fa-coins' });
        if (c.sp) display.push({ label: 'SP', value: c.sp, icon: 'fa-coins' });
        if (c.cp) display.push({ label: 'CP', value: c.cp, icon: 'fa-coins' });
        return { display };
    }

    // ═══════════════════════════════════════════
    //  Encumbrance / Carry Capacity
    // ═══════════════════════════════════════════

    static getCarryCapacity(actor) {
        if (this.isSF1E) {
            const strMod = actor.system.abilities?.str?.mod ?? 0;
            let capacity = 10 + strMod;
            const hasFeat = actor.items.some(i =>
                i.type === 'feat' &&
                (i.name.includes('Bulk') || i.name.includes('Carry') || i.name.includes('Encumbrance'))
            );
            if (hasFeat) capacity += 5;
            return Math.max(capacity, 1);
        }

        // SF2E — check for PF2E encumbrance data
        const enc = actor.system.attributes?.encumbrance;
        if (enc?.max) return enc.max;

        // Fallback
        const strMod = actor.system.abilities?.str?.mod ?? 0;
        return Math.max(5 + strMod, 1);
    }

    static getTotalBulk(actor) {
        if (this.isSF2E) {
            // PF2E may compute this already
            const enc = actor.system.attributes?.encumbrance;
            if (enc?.value !== undefined) return enc.value;
        }
        // Fallback: manual calculation handled by caller
        return null;
    }

    // ═══════════════════════════════════════════
    //  Item Helpers
    // ═══════════════════════════════════════════

    static getItemBulk(item) {
        if (this.isSF1E) return parseFloat(item.system.bulk) || 0;
        const bulk = item.system.bulk;
        if (typeof bulk === 'object') return parseFloat(bulk.value) || 0;
        return parseFloat(bulk) || 0;
    }

    static isItemEquipped(item) {
        if (this.isSF1E) return item.system.equipped === true;
        const eq = item.system.equipped;
        if (typeof eq === 'object') {
            return eq.carryType === 'worn' || eq.carryType === 'held' || eq.inSlot === true;
        }
        return eq === true;
    }

    static isContainer(item) {
        if (this.isSF1E) return item.type === 'container';
        return item.type === 'backpack';
    }

    /** Types to exclude from inventory (they appear in other sidebars) */
    static getNonInventoryTypes() {
        if (this.isSF1E) {
            return ['feat', 'class', 'race', 'theme', 'spell', 'archetypes', 'asi', 'effect'];
        }
        return ['feat', 'class', 'ancestry', 'heritage', 'background', 'spell',
                'action', 'lore', 'condition', 'effect', 'spellcastingEntry', 'melee',
                'deity', 'campaignFeature', 'kit', 'affliction'];
    }

    // ═══════════════════════════════════════════
    //  Weapon Display Data
    // ═══════════════════════════════════════════

    static getWeaponDisplayData(weapon) {
        if (this.isSF1E) {
            return {
                damage: weapon.system.damage?.parts?.[0]?.[0] || '—',
                range: weapon.system.range?.value || '—'
            };
        }
        // SF2E / PF2E
        const dmgDice = weapon.system.damage?.dice ?? 1;
        const dmgDie  = weapon.system.damage?.die || 'd4';
        const dmgType = weapon.system.damage?.damageType || '';
        const damage  = `${dmgDice}${dmgDie}${dmgType ? ` ${dmgType}` : ''}`;

        let range = weapon.system.range;
        if (typeof range === 'object') range = range?.value || range?.increment;
        return {
            damage: damage || '—',
            range: range ? String(range) : '—'
        };
    }

    // ═══════════════════════════════════════════
    //  Spell Helpers
    // ═══════════════════════════════════════════

    /** Get the numeric rank/level of a spell, normalized across systems */
    static getSpellLevel(spell) {
        if (this.isSF1E) {
            return spell.system.level || 0;
        }
        // SF2E / PF2E — system.level is an object {value: N}
        // Cantrips have the 'cantrip' trait and should be grouped at rank 0
        const isCantrip = spell.isCantrip ??
            spell.system.traits?.value?.includes?.('cantrip') ?? false;
        if (isCantrip) return 0;
        return spell.system.level?.value ?? spell.rank ?? spell.baseRank ?? 1;
    }

    /** Get the maximum spell rank for the system */
    static get maxSpellRank() {
        return this.isSF1E ? 6 : 10;
    }

    /** Get spell detail text (school for SF1E, traditions for SF2E) */
    static getSpellDetailText(spell) {
        if (this.isSF1E) {
            return spell.system.school || '—';
        }
        // SF2E — show traditions instead of school (schools removed in PF2E remaster)
        const traditions = spell.system.traits?.traditions;
        if (Array.isArray(traditions) && traditions.length > 0) {
            return traditions.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
        }
        return '—';
    }

    /** Get spell defense/save info */
    static getSpellDefenseInfo(spell) {
        if (this.isSF1E) {
            const saveType = spell.system.save?.type;
            const saveStr = saveType ? saveType.toLowerCase() : '';
            const hasSpellResistance = spell.system.sr === true;
            const saveMap = {
                'will': 'Will', 'ref': 'Reflex', 'reflex': 'Reflex',
                'fort': 'Fortitude', 'fortitude': 'Fortitude',
                'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution',
                'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma'
            };
            const details = [];
            if (saveStr && saveStr !== 'none' && saveStr !== '') {
                details.push(`${saveMap[saveStr] || saveStr} Save`);
            }
            if (hasSpellResistance) details.push('SR');
            return details;
        }
        // SF2E / PF2E — uses defense property
        const defense = spell.system.defense;
        const details = [];
        if (defense?.save?.statistic) {
            const saveMap = {
                'fortitude': 'Fortitude', 'reflex': 'Reflex', 'will': 'Will'
            };
            const saveName = saveMap[defense.save.statistic] || defense.save.statistic;
            const basic = defense.save.basic ? 'Basic ' : '';
            details.push(`${basic}${saveName}`);
        }
        if (defense?.passive?.statistic) {
            details.push(defense.passive.statistic.toUpperCase());
        }
        return details;
    }

    /** Get spellcasting entries with slot information for SF2E */
    static getSpellSlotInfo(actor, spellLevel) {
        if (this.isSF1E) {
            const slotKey = `spell${spellLevel}`;
            const slotInfo = actor.system.spells?.[slotKey] || { value: 0, max: 0 };
            return { value: slotInfo.value || 0, max: slotInfo.max || 0 };
        }
        // SF2E — aggregate slots across all spellcasting entries for this rank
        let totalValue = 0;
        let totalMax = 0;
        const entries = actor.items.filter(i => i.type === 'spellcastingEntry');
        for (const entry of entries) {
            const slotKey = `slot${spellLevel}`;
            const slotData = entry.system.slots?.[slotKey];
            if (slotData) {
                totalValue += slotData.value || 0;
                totalMax += slotData.max || 0;
            }
        }
        return { value: totalValue, max: totalMax };
    }

    /** Roll/cast a spell */
    static async castSpell(actor, spell) {
        if (this.isSF1E) {
            // SF1E — try system methods
            if (typeof spell.roll === 'function') return spell.roll();
            if (typeof spell.use === 'function') return spell.use();
            if (typeof spell.displayCard === 'function') return spell.displayCard();
            return null;
        }
        // SF2E / PF2E — use toMessage for chat card, or spellcasting entry cast
        if (typeof spell.toMessage === 'function') {
            return spell.toMessage();
        }
        return null;
    }

    /** Roll a weapon attack */
    static async rollWeaponAttack(actor, weapon) {
        if (this.isSF1E) {
            if (typeof weapon.roll === 'function') return weapon.roll();
            if (typeof weapon.rollAttack === 'function') return weapon.rollAttack();
            if (typeof weapon.use === 'function') return weapon.use();
            if (typeof weapon.displayCard === 'function') return weapon.displayCard();
            return null;
        }
        // SF2E / PF2E — find matching strike in actor.system.actions
        const actions = actor.system.actions;
        if (Array.isArray(actions)) {
            const strike = actions.find(s => s.item?.id === weapon.id)
                        || actions.find(s => s.item?.name === weapon.name);
            if (strike) {
                // Use the first variant (no MAP) roll
                if (typeof strike.roll === 'function') return strike.roll();
                if (typeof strike.attack === 'function') return strike.attack();
                if (strike.variants?.[0]?.roll) return strike.variants[0].roll();
            }
        }
        // Fallback — use rollActionMacro if available
        const rollMacro = game.sf2e?.rollActionMacro ?? game.pf2e?.rollActionMacro;
        if (typeof rollMacro === 'function') {
            return rollMacro({
                actorUUID: actor.uuid,
                itemId: weapon.id,
                slug: weapon.slug ?? weapon.name.toLowerCase().replace(/\s+/g, '-')
            });
        }
        // Last resort — toMessage creates a chat card
        if (typeof weapon.toMessage === 'function') return weapon.toMessage();
        return null;
    }

    // ═══════════════════════════════════════════
    //  Feature Types
    // ═══════════════════════════════════════════

    static getFeatureTypes() {
        if (this.isSF1E) return ['feat', 'class', 'race', 'theme'];
        return ['feat', 'class', 'ancestry', 'heritage', 'background'];
    }

    static getFeatureTypeLabel(type) {
        if (this.isSF1E) {
            const labels = {
                'feat': 'FEAT', 'class': 'CLASS FEATURE',
                'race': 'RACIAL TRAIT', 'theme': 'THEME'
            };
            return labels[type] || type.toUpperCase();
        }
        const labels = {
            'feat': 'FEAT', 'class': 'CLASS FEATURE',
            'ancestry': 'ANCESTRY', 'heritage': 'HERITAGE', 'background': 'BACKGROUND'
        };
        return labels[type] || type.toUpperCase();
    }

    // ═══════════════════════════════════════════
    //  IWR (Immunities / Weaknesses / Resistances)
    // ═══════════════════════════════════════════

    static getIWR(actor) {
        if (this.isSF1E) {
            return {
                immunities:      this._parseSF1EIWR(actor.system.traits?.di),
                resistances:     this._parseSF1EIWR(actor.system.traits?.dr),
                vulnerabilities: this._parseSF1EIWR(actor.system.traits?.dv)
            };
        }
        // SF2E / PF2E
        const attrs = actor.system.attributes || {};
        return {
            immunities:      this._parseSF2EIWR(attrs.immunities),
            resistances:     this._parseSF2EIWR(attrs.resistances),
            vulnerabilities: this._parseSF2EIWR(attrs.weaknesses)
        };
    }

    /** @private */
    static _parseSF1EIWR(traitArray) {
        if (!Array.isArray(traitArray) || traitArray.length === 0) return null;
        return traitArray.map(t => {
            if (typeof t === 'object') {
                return t.amount ? `${t.types.join(', ')} ${t.amount}` : t.types.join(', ');
            }
            return t;
        }).join(', ');
    }

    /** @private */
    static _parseSF2EIWR(iwrArray) {
        if (!Array.isArray(iwrArray) || iwrArray.length === 0) return null;
        return iwrArray.map(entry => {
            if (typeof entry === 'object') {
                const type = entry.type || entry.label || '';
                const value = entry.value ? ` ${entry.value}` : '';
                const exceptions = entry.exceptions?.length
                    ? ` (except ${entry.exceptions.join(', ')})`
                    : '';
                return `${type}${value}${exceptions}`;
            }
            return String(entry);
        }).join(', ');
    }

    // ═══════════════════════════════════════════
    //  Item Categories (for inventory sidebar)
    // ═══════════════════════════════════════════

    static getItemCategories() {
        if (this.isSF1E) {
            return {
                'weapons':       { label: 'Weapons',            icon: 'fa-gun' },
                'shields':       { label: 'Shields',            icon: 'fa-shield-alt' },
                'armor':         { label: 'Armor',              icon: 'fa-shield' },
                'ammunition':    { label: 'Ammunition',         icon: 'fa-box' },
                'consumables':   { label: 'Consumables',        icon: 'fa-vial' },
                'goods':         { label: 'Goods',              icon: 'fa-bag-shopping' },
                'containers':    { label: 'Containers',         icon: 'fa-box' },
                'technological': { label: 'Technological Items',icon: 'fa-microchip' },
                'magical':       { label: 'Magical Items',      icon: 'fa-wand-magic-sparkles' },
                'hybrid':        { label: 'Hybrid Items',       icon: 'fa-wand-magic' },
                'upgrades':      { label: 'Upgrades',           icon: 'fa-wrench' },
                'augmentations': { label: 'Augmentations',      icon: 'fa-circle-nodes' }
            };
        }
        return {
            'weapons':     { label: 'Weapons',     icon: 'fa-sword' },
            'armor':       { label: 'Armor',       icon: 'fa-shield' },
            'shields':     { label: 'Shields',     icon: 'fa-shield-alt' },
            'equipment':   { label: 'Equipment',   icon: 'fa-vest' },
            'consumables': { label: 'Consumables', icon: 'fa-vial' },
            'treasure':    { label: 'Treasure',    icon: 'fa-gem' },
            'containers':  { label: 'Containers',  icon: 'fa-box' },
            'other':       { label: 'Other',       icon: 'fa-bag-shopping' }
        };
    }

    /**
     * Map a single item to a category key.
     * @returns {string|null} category key, or null to skip
     */
    static categorizeItem(item) {
        const type = item.type;

        if (this.isSF1E) {
            const map = {
                'weapon': 'weapons', 'shield': 'shields', 'equipment': 'armor',
                'container': 'containers', 'ammunition': 'ammunition',
                'consumable': 'consumables', 'goods': 'goods',
                'technological': 'technological', 'magic': 'magical',
                'hybrid': 'hybrid', 'upgrade': 'upgrades',
                'augmentation': 'augmentations', 'fusion': 'upgrades',
                'weaponAccessory': 'goods'
            };
            return map[type] || null;
        }

        // SF2E / PF2E
        const map = {
            'weapon': 'weapons', 'armor': 'armor', 'shield': 'shields',
            'equipment': 'equipment', 'consumable': 'consumables',
            'treasure': 'treasure', 'backpack': 'containers',
            'ammo': 'equipment', 'book': 'other'
        };
        return map[type] || 'other';
    }

    // ═══════════════════════════════════════════
    //  Ability Check Rolling
    // ═══════════════════════════════════════════

    static async rollAbilityCheck(actor, ability) {
        const nameMap = {
            'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution',
            'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma'
        };
        const abilityName = nameMap[ability] || ability;
        const mod = actor.system.abilities?.[ability]?.mod ?? 0;

        // Try system-specific ability check method
        if (typeof actor.rollAbility === 'function') {
            return actor.rollAbility(ability);
        }
        if (typeof actor.rollAbilityCheck === 'function') {
            return actor.rollAbilityCheck(ability);
        }

        // Manual fallback
        const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: `${abilityName} Check`
        });
    }

    // ═══════════════════════════════════════════
    //  Edit Resource
    // ═══════════════════════════════════════════

    /**
     * Update an attribute value (HP, SP, etc.) on the actor.
     * @param {string} type — 'hp', 'sp', or for SF2E: 'hp'
     */
    static async editResource(actor, type, newValue) {
        return actor.update({
            [`system.attributes.${type}.value`]: parseInt(newValue)
        });
    }

    /**
     * Update Hero Points value (SF2E only).
     */
    static async editHeroPoints(actor, newValue) {
        return actor.update({
            'system.resources.heroPoints.value': parseInt(newValue)
        });
    }

    /**
     * Update Focus Points value (SF2E only).
     */
    static async editFocusPoints(actor, newValue) {
        return actor.update({
            'system.resources.focus.value': parseInt(newValue)
        });
    }
}
