/**
 * @file lock_adapter.js
 * @description Domain adapter for Home Assistant lock entities.
 * Handles smart locks with lock/unlock and optional open functionality.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Lock feature flags (from HA LockEntityFeature)
 */
export const LOCK_FEATURES = {
    OPEN: 1
};

/**
 * Lock states
 */
export const LOCK_STATES = {
    LOCKED: 'locked',
    UNLOCKED: 'unlocked',
    LOCKING: 'locking',
    UNLOCKING: 'unlocking',
    JAMMED: 'jammed'
};

/**
 * Lock domain adapter
 */
export class LockAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'lock',
            name: 'Lock',
            icon: 'mdi:lock'
        });
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};
        const supportedFeatures = attrs.supported_features || 0;

        return {
            ...base,
            // Current state
            state: entity.state,
            isLocked: entity.state === LOCK_STATES.LOCKED,
            isUnlocked: entity.state === LOCK_STATES.UNLOCKED,
            isLocking: entity.state === LOCK_STATES.LOCKING,
            isUnlocking: entity.state === LOCK_STATES.UNLOCKING,
            isJammed: entity.state === LOCK_STATES.JAMMED,
            
            // Feature flags
            supportsOpen: !!(supportedFeatures & LOCK_FEATURES.OPEN),
            
            // Code required
            codeFormat: attrs.code_format // regex for valid codes
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'lock_entity',
                name: 'Lock Entity',
                type: 'entity',
                required: true,
                description: 'Select a lock entity',
                domainConstraint: {
                    domains: ['lock']
                }
            },
            {
                id: 'confirm_unlock',
                name: 'Confirm Unlock',
                type: 'boolean',
                defaultValue: true,
                description: 'Require confirmation before unlocking'
            },
            {
                id: 'locked_color',
                name: 'Locked Color',
                type: 'color',
                defaultValue: '#4caf50',
                description: 'Color when locked (secure)'
            },
            {
                id: 'unlocked_color',
                name: 'Unlocked Color',
                type: 'color',
                defaultValue: '#f44336',
                description: 'Color when unlocked'
            },
            {
                id: 'jammed_color',
                name: 'Jammed Color',
                type: 'color',
                defaultValue: '#ff9800',
                description: 'Color when jammed'
            }
        ];

        if (capabilities?.supportsOpen) {
            params.push({
                id: 'show_open_button',
                name: 'Show Open Button',
                type: 'boolean',
                defaultValue: false,
                description: 'Display separate open button (for locks with latch release)'
            });
        }

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'lock_entity';

        // State
        bindings.push(this._createReadBinding(entityParam, 'props.state', {
            transform: 'identity'
        }));

        // Is locked (boolean)
        bindings.push(this._createReadBinding(entityParam, 'props.is_locked', {
            transform: 'map',
            transformConfig: {
                map: {
                    'locked': true,
                    'unlocked': false,
                    'locking': true,
                    'unlocking': false,
                    'jammed': false
                }
            }
        }));

        // State text
        bindings.push(this._createReadBinding(entityParam, 'props.state_text', {
            transform: 'map',
            transformConfig: {
                map: {
                    'locked': 'LOCKED',
                    'unlocked': 'UNLOCKED',
                    'locking': 'LOCKING...',
                    'unlocking': 'UNLOCKING...',
                    'jammed': 'JAMMED!'
                }
            }
        }));

        return bindings;
    }

    /**
     * @override
     */
    getDefaultWriteBindings(capabilities) {
        const bindings = [];
        const entityParam = 'lock_entity';

        // Lock
        bindings.push(this._createWriteBinding('on_lock', 'lock.lock', entityParam, {
            debounce: false
        }));

        // Unlock (with confirmation by default)
        bindings.push(this._createWriteBinding('on_unlock', 'lock.unlock', entityParam, {
            debounce: false,
            confirmPrompt: 'Are you sure you want to unlock?'
        }));

        // Toggle
        bindings.push(this._createWriteBinding('on_click', 'lock.lock', entityParam, {
            debounce: false
            // Note: Toggle behavior should check current state
        }));

        // Open (if supported)
        if (capabilities?.supportsOpen) {
            bindings.push(this._createWriteBinding('on_open', 'lock.open', entityParam, {
                debounce: false,
                confirmPrompt: 'Are you sure you want to open the lock?'
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        let icon;
        let color;
        let text = entity.state;

        switch (entity.state) {
            case LOCK_STATES.LOCKED:
                icon = 'mdi:lock';
                color = '#4caf50';
                text = 'Locked';
                break;
            case LOCK_STATES.UNLOCKED:
                icon = 'mdi:lock-open';
                color = '#f44336';
                text = 'Unlocked';
                break;
            case LOCK_STATES.LOCKING:
                icon = 'mdi:lock-clock';
                color = '#ff9800';
                text = 'Locking...';
                break;
            case LOCK_STATES.UNLOCKING:
                icon = 'mdi:lock-clock';
                color = '#ff9800';
                text = 'Unlocking...';
                break;
            case LOCK_STATES.JAMMED:
                icon = 'mdi:lock-alert';
                color = '#f44336';
                text = 'Jammed!';
                break;
            default:
                icon = 'mdi:lock-question';
                color = '#9e9e9e';
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'lock.lock',
                name: 'Lock',
                description: 'Lock the lock',
                fields: {
                    code: { type: 'string', description: 'Optional code' }
                }
            },
            {
                service: 'lock.unlock',
                name: 'Unlock',
                description: 'Unlock the lock',
                fields: {
                    code: { type: 'string', description: 'Optional code' }
                }
            },
            {
                service: 'lock.open',
                name: 'Open',
                description: 'Open the lock (release latch)',
                fields: {
                    code: { type: 'string', description: 'Optional code' }
                }
            }
        ];
    }
}

export default new LockAdapter();
