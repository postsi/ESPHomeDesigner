/**
 * @file switch_adapter.js
 * @description Domain adapter for Home Assistant switch entities.
 * Handles switches, input_boolean, and similar binary toggle entities.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Switch domain adapter
 */
export class SwitchAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'switch',
            name: 'Switch',
            icon: 'mdi:toggle-switch',
            aliases: ['input_boolean']
        });
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};

        return {
            ...base,
            isOn: entity.state === 'on',
            deviceClass: attrs.device_class,
            icon: attrs.icon || this._getIconForDeviceClass(attrs.device_class, entity.state === 'on')
        };
    }

    /**
     * Gets appropriate icon based on device class
     * @private
     */
    _getIconForDeviceClass(deviceClass, isOn) {
        const icons = {
            outlet: isOn ? 'mdi:power-plug' : 'mdi:power-plug-off',
            switch: isOn ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off'
        };
        return icons[deviceClass] || (isOn ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off');
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        return [
            {
                id: 'switch_entity',
                name: 'Switch Entity',
                type: 'entity',
                required: true,
                description: 'Select a switch or input_boolean entity',
                domainConstraint: {
                    domains: ['switch', 'input_boolean']
                }
            },
            {
                id: 'on_color',
                name: 'On Color',
                type: 'color',
                defaultValue: '#4caf50',
                description: 'Color when switch is on'
            },
            {
                id: 'off_color',
                name: 'Off Color',
                type: 'color',
                defaultValue: '#424242',
                description: 'Color when switch is off'
            },
            {
                id: 'show_label',
                name: 'Show Label',
                type: 'boolean',
                defaultValue: true,
                description: 'Display On/Off text label'
            },
            {
                id: 'confirm_off',
                name: 'Confirm Turn Off',
                type: 'boolean',
                defaultValue: false,
                description: 'Require confirmation before turning off'
            }
        ];
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'switch_entity';

        // On/Off state
        bindings.push(this._createReadBinding(entityParam, 'props.is_on', {
            transform: 'map',
            transformConfig: {
                map: {
                    'on': true,
                    'off': false
                }
            }
        }));

        // State text
        bindings.push(this._createReadBinding(entityParam, 'props.state_text', {
            transform: 'map',
            transformConfig: {
                map: {
                    'on': 'ON',
                    'off': 'OFF',
                    'unavailable': '--'
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
        const entityParam = 'switch_entity';

        // Toggle
        bindings.push(this._createWriteBinding('on_click', 'switch.toggle', entityParam, {
            debounce: false
        }));

        // Explicit turn on
        bindings.push(this._createWriteBinding('on_turn_on', 'switch.turn_on', entityParam, {
            debounce: false
        }));

        // Explicit turn off (with optional confirmation)
        bindings.push(this._createWriteBinding('on_turn_off', 'switch.turn_off', entityParam, {
            debounce: false,
            // Note: confirmPrompt will be populated from parameter if confirm_off is true
            confirmPrompt: null
        }));

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const isOn = entity.state === 'on';
        const attrs = entity.attributes || {};
        
        const icon = this._getIconForDeviceClass(attrs.device_class, isOn);
        const color = isOn ? '#4caf50' : '#424242';
        const text = isOn ? 'ON' : 'OFF';

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'switch.turn_on',
                name: 'Turn On',
                description: 'Turn on the switch'
            },
            {
                service: 'switch.turn_off',
                name: 'Turn Off',
                description: 'Turn off the switch'
            },
            {
                service: 'switch.toggle',
                name: 'Toggle',
                description: 'Toggle the switch on/off'
            }
        ];
    }
}

export default new SwitchAdapter();
