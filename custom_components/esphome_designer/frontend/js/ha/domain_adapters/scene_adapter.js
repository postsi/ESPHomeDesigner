/**
 * @file scene_adapter.js
 * @description Domain adapter for Home Assistant scene entities.
 * Handles scenes (predefined states for multiple entities).
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Scene domain adapter
 */
export class SceneAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'scene',
            name: 'Scene',
            icon: 'mdi:palette',
            aliases: ['script']
        });
    }

    /**
     * @override
     */
    handles(entity) {
        if (!entity || !entity.entity_id) return false;
        const entityDomain = entity.entity_id.split('.')[0];
        return entityDomain === 'scene' || entityDomain === 'script';
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const entityDomain = entity.entity_id.split('.')[0];
        const attrs = entity.attributes || {};

        return {
            ...base,
            isScene: entityDomain === 'scene',
            isScript: entityDomain === 'script',
            // Scripts have running state
            isRunning: entityDomain === 'script' && entity.state === 'on',
            // Last activated (for scenes)
            lastActivated: attrs.last_activated,
            // Script mode
            mode: attrs.mode, // single, restart, queued, parallel
            currentRuns: attrs.current
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'scene_entity',
                name: capabilities?.isScript ? 'Script Entity' : 'Scene Entity',
                type: 'entity',
                required: true,
                description: capabilities?.isScript ? 'Select a script to run' : 'Select a scene to activate',
                domainConstraint: {
                    domains: ['scene', 'script']
                }
            },
            {
                id: 'button_text',
                name: 'Button Text',
                type: 'string',
                defaultValue: '',
                description: 'Custom button text (leave empty to use entity name)'
            },
            {
                id: 'confirm_activate',
                name: 'Confirm Activation',
                type: 'boolean',
                defaultValue: false,
                description: 'Require confirmation before activating'
            },
            {
                id: 'button_color',
                name: 'Button Color',
                type: 'color',
                defaultValue: '#6200ea',
                description: 'Button background color'
            },
            {
                id: 'active_color',
                name: 'Active Color',
                type: 'color',
                defaultValue: '#4caf50',
                description: 'Color when script is running'
            }
        ];

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'scene_entity';

        // For scripts, track running state
        if (capabilities?.isScript) {
            bindings.push(this._createReadBinding(entityParam, 'props.is_running', {
                transform: 'map',
                transformConfig: {
                    map: { 'on': true, 'off': false }
                }
            }));
        }

        // Friendly name for button text
        bindings.push(this._createReadBinding(entityParam, 'props.name', {
            attribute: 'friendly_name',
            transform: 'identity'
        }));

        return bindings;
    }

    /**
     * @override
     */
    getDefaultWriteBindings(capabilities) {
        const bindings = [];
        const entityParam = 'scene_entity';

        if (capabilities?.isScene) {
            // Activate scene
            bindings.push(this._createWriteBinding('on_click', 'scene.turn_on', entityParam, {
                debounce: false
            }));
        } else {
            // Run script
            bindings.push(this._createWriteBinding('on_click', 'script.turn_on', entityParam, {
                debounce: false
            }));

            // Cancel script (if running)
            bindings.push(this._createWriteBinding('on_cancel', 'script.turn_off', entityParam, {
                debounce: false
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const entityDomain = entity.entity_id.split('.')[0];
        const attrs = entity.attributes || {};
        
        let icon;
        let color = '#6200ea';
        let text = attrs.friendly_name || entity.entity_id;

        if (entityDomain === 'scene') {
            icon = 'mdi:palette';
        } else {
            // Script
            if (entity.state === 'on') {
                icon = 'mdi:play-circle';
                color = '#4caf50';
                text = 'Running...';
            } else {
                icon = 'mdi:script-text';
            }
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'scene.turn_on',
                name: 'Activate Scene',
                description: 'Activate the scene'
            },
            {
                service: 'script.turn_on',
                name: 'Run Script',
                description: 'Run the script'
            },
            {
                service: 'script.turn_off',
                name: 'Stop Script',
                description: 'Stop a running script'
            },
            {
                service: 'script.toggle',
                name: 'Toggle Script',
                description: 'Toggle script execution'
            }
        ];
    }
}

export default new SceneAdapter();
