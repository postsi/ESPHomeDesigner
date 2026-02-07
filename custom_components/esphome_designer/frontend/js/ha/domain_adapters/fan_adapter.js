/**
 * @file fan_adapter.js
 * @description Domain adapter for Home Assistant fan entities.
 * Handles fans with speed, direction, and oscillation support.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Fan domain feature flags (from HA FanEntityFeature)
 */
export const FAN_FEATURES = {
    SET_SPEED: 1,
    OSCILLATE: 2,
    DIRECTION: 4,
    PRESET_MODE: 8
};

/**
 * Fan domain adapter
 */
export class FanAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'fan',
            name: 'Fan',
            icon: 'mdi:fan'
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
            isOn: entity.state === 'on',
            percentage: attrs.percentage,
            oscillating: attrs.oscillating,
            direction: attrs.direction, // 'forward' or 'reverse'
            presetMode: attrs.preset_mode,
            
            // Available options
            presetModes: attrs.preset_modes || [],
            speedCount: attrs.speed_count || 0,
            
            // Feature flags
            supportsSetSpeed: !!(supportedFeatures & FAN_FEATURES.SET_SPEED),
            supportsOscillate: !!(supportedFeatures & FAN_FEATURES.OSCILLATE),
            supportsDirection: !!(supportedFeatures & FAN_FEATURES.DIRECTION),
            supportsPresetMode: !!(supportedFeatures & FAN_FEATURES.PRESET_MODE)
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'fan_entity',
                name: 'Fan Entity',
                type: 'entity',
                required: true,
                description: 'Select a fan entity',
                domainConstraint: {
                    domains: ['fan']
                }
            },
            {
                id: 'show_speed',
                name: 'Show Speed Control',
                type: 'boolean',
                defaultValue: capabilities?.supportsSetSpeed || false,
                description: 'Display speed slider or buttons'
            }
        ];

        if (capabilities?.supportsOscillate) {
            params.push({
                id: 'show_oscillate',
                name: 'Show Oscillation',
                type: 'boolean',
                defaultValue: false,
                description: 'Display oscillation toggle'
            });
        }

        if (capabilities?.supportsDirection) {
            params.push({
                id: 'show_direction',
                name: 'Show Direction',
                type: 'boolean',
                defaultValue: false,
                description: 'Display direction toggle'
            });
        }

        if (capabilities?.supportsPresetMode && capabilities.presetModes?.length > 0) {
            params.push({
                id: 'show_preset',
                name: 'Show Preset Mode',
                type: 'boolean',
                defaultValue: false,
                description: 'Display preset mode selector'
            });
        }

        params.push({
            id: 'on_color',
            name: 'On Color',
            type: 'color',
            defaultValue: '#4caf50',
            description: 'Color when fan is on'
        });

        params.push({
            id: 'off_color',
            name: 'Off Color',
            type: 'color',
            defaultValue: '#424242',
            description: 'Color when fan is off'
        });

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'fan_entity';

        // On/Off state
        bindings.push(this._createReadBinding(entityParam, 'props.is_on', {
            transform: 'map',
            transformConfig: {
                map: { 'on': true, 'off': false }
            }
        }));

        // Speed percentage
        if (capabilities?.supportsSetSpeed) {
            bindings.push(this._createReadBinding(entityParam, 'props.percentage', {
                attribute: 'percentage',
                transform: 'identity'
            }));
        }

        // Oscillation
        if (capabilities?.supportsOscillate) {
            bindings.push(this._createReadBinding(entityParam, 'props.oscillating', {
                attribute: 'oscillating',
                transform: 'identity'
            }));
        }

        // Direction
        if (capabilities?.supportsDirection) {
            bindings.push(this._createReadBinding(entityParam, 'props.direction', {
                attribute: 'direction',
                transform: 'identity'
            }));
        }

        // Preset mode
        if (capabilities?.supportsPresetMode) {
            bindings.push(this._createReadBinding(entityParam, 'props.preset_mode', {
                attribute: 'preset_mode',
                transform: 'identity'
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getDefaultWriteBindings(capabilities) {
        const bindings = [];
        const entityParam = 'fan_entity';

        // Toggle
        bindings.push(this._createWriteBinding('on_click', 'fan.toggle', entityParam, {
            debounce: false
        }));

        // Turn on
        bindings.push(this._createWriteBinding('on_turn_on', 'fan.turn_on', entityParam, {
            debounce: false
        }));

        // Turn off
        bindings.push(this._createWriteBinding('on_turn_off', 'fan.turn_off', entityParam, {
            debounce: false
        }));

        // Set speed
        if (capabilities?.supportsSetSpeed) {
            bindings.push(this._createWriteBinding('on_speed_change', 'fan.set_percentage', entityParam, {
                dynamicPayload: {
                    'props.percentage': 'percentage'
                },
                debounce: true,
                debounceMs: 300
            }));
        }

        // Oscillate
        if (capabilities?.supportsOscillate) {
            bindings.push(this._createWriteBinding('on_oscillate_toggle', 'fan.oscillate', entityParam, {
                dynamicPayload: {
                    'props.oscillating': 'oscillating'
                },
                debounce: false
            }));
        }

        // Direction
        if (capabilities?.supportsDirection) {
            bindings.push(this._createWriteBinding('on_direction_change', 'fan.set_direction', entityParam, {
                dynamicPayload: {
                    'props.direction': 'direction'
                },
                debounce: false
            }));
        }

        // Preset mode
        if (capabilities?.supportsPresetMode) {
            bindings.push(this._createWriteBinding('on_preset_change', 'fan.set_preset_mode', entityParam, {
                dynamicPayload: {
                    'props.preset_mode': 'preset_mode'
                },
                debounce: false
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const attrs = entity.attributes || {};
        const isOn = entity.state === 'on';
        
        let icon = isOn ? 'mdi:fan' : 'mdi:fan-off';
        let color = isOn ? '#4caf50' : '#424242';
        let text = isOn ? 'On' : 'Off';

        // Show percentage if on and available
        if (isOn && attrs.percentage !== undefined) {
            text = `${attrs.percentage}%`;
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'fan.turn_on',
                name: 'Turn On',
                description: 'Turn on the fan',
                fields: {
                    percentage: { type: 'number', min: 0, max: 100 },
                    preset_mode: { type: 'string' }
                }
            },
            {
                service: 'fan.turn_off',
                name: 'Turn Off',
                description: 'Turn off the fan'
            },
            {
                service: 'fan.toggle',
                name: 'Toggle',
                description: 'Toggle the fan on/off'
            },
            {
                service: 'fan.set_percentage',
                name: 'Set Speed',
                description: 'Set fan speed percentage',
                fields: {
                    percentage: { type: 'number', min: 0, max: 100, required: true }
                }
            },
            {
                service: 'fan.oscillate',
                name: 'Oscillate',
                description: 'Set oscillation',
                fields: {
                    oscillating: { type: 'boolean', required: true }
                }
            },
            {
                service: 'fan.set_direction',
                name: 'Set Direction',
                description: 'Set fan direction',
                fields: {
                    direction: { type: 'select', options: ['forward', 'reverse'], required: true }
                }
            },
            {
                service: 'fan.set_preset_mode',
                name: 'Set Preset',
                description: 'Set preset mode',
                fields: {
                    preset_mode: { type: 'string', required: true }
                }
            }
        ];
    }
}

export default new FanAdapter();
