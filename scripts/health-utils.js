/**
 * Health status utilities for SF1E HUD
 */

export class HealthUtils {
    /**
     * Get health status based on current/max HP
     * @param {number} current Current HP
     * @param {number} max Maximum HP
     * @returns {string} Health status key
     */
    static getHealthStatus(current, max) {
        if (max <= 0) return 'healthy';

        const percent = (current / max) * 100;

        if (current <= 0) return 'dead';
        if (percent <= 25) return 'critical';
        if (percent <= 50) return 'wounded';
        if (percent <= 75) return 'injured';
        return 'healthy';
    }

    /**
     * Get localized health status label
     * @param {string} status Health status key
     * @returns {string} Localized label
     */
    static getHealthLabel(status) {
        try {
            const customLabels = JSON.parse(game.settings.get('sf1e-hud', 'healthStateLabels'));
            return customLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
        } catch (e) {
            // Fallback if JSON parsing fails
            return status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    /**
     * Get health status color based on status
     * @param {string} status Health status key
     * @returns {string} CSS color or class
     */
    static getHealthColor(status) {
        switch(status) {
            case 'dead':
                return '#ff0000'; // Red
            case 'critical':
                return '#ff6600'; // Orange
            case 'wounded':
                return '#ffff00'; // Yellow
            case 'injured':
                return '#00ff00'; // Green
            case 'healthy':
                return '#00ffff'; // Cyan
            default:
                return '#8080a0'; // Default gray
        }
    }

    /**
     * Format health/resources display with status
     * @param {object} actor The actor object
     * @returns {object} Formatted health info
     */
    static formatHealthDisplay(actor) {
        if (!actor || !actor.system) return null;

        const hp = actor.system.attributes?.hp || { value: 0, max: 0 };
        const sp = actor.system.attributes?.sp || { value: 0, max: 0 };
        const rp = actor.system.attributes?.rp || { value: 0, max: 0 };

        const healthStatus = this.getHealthStatus(hp.value, hp.max);
        const healthLabel = this.getHealthLabel(healthStatus);
        const healthColor = this.getHealthColor(healthStatus);

        return {
            hp: {
                value: hp.value,
                max: hp.max,
                percent: hp.max > 0 ? (hp.value / hp.max) * 100 : 0,
                status: healthStatus,
                label: healthLabel,
                color: healthColor
            },
            sp: {
                value: sp.value,
                max: sp.max,
                percent: sp.max > 0 ? (sp.value / sp.max) * 100 : 0
            },
            rp: {
                value: rp.value,
                max: rp.max
            }
        };
    }

    /**
     * Check if actor is dead
     * @param {object} actor The actor object
     * @returns {boolean}
     */
    static isDead(actor) {
        if (!actor || !actor.system) return false;
        const hp = actor.system.attributes?.hp?.value || 0;
        return hp <= 0;
    }

    /**
     * Check if actor is dying (within a few rounds)
     * @param {object} actor The actor object
     * @returns {boolean}
     */
    static isDying(actor) {
        return this.getHealthStatus(
            actor?.system.attributes?.hp?.value || 0,
            actor?.system.attributes?.hp?.max || 1
        ) === 'critical';
    }
}
