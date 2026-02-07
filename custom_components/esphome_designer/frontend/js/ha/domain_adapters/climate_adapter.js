/**
 * @file climate_adapter.js
 * @description Domain adapter for Home Assistant climate entities.
 * Handles thermostats, HVAC systems, and climate control devices.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Climate domain feature flags (from HA ClimateEntityFeature)
 * @see https://developers.home-assistant.io/docs/core/entity/climate
 */
export const CLIMATE_FEATURES = {
    TARGET_TEMPERATURE: 1,
    TARGET_TEMPERATURE_RANGE: 2,
    TARGET_HUMIDITY: 4,
    FAN_MODE: 8,
    PRESET_MODE: 16,
    SWING_MODE: 32,
    AUX_HEAT: 64,
    TURN_ON: 128,
    TURN_OFF: 256
};

/**
 * Climate HVAC modes
 */
export const HVAC_MODES = {
    OFF: 'off',
    HEAT: 'heat',
    COOL: 'cool',
    HEAT_COOL: 'heat_cool',
    AUTO: 'auto',
    DRY: 'dry',
    FAN_ONLY: 'fan_only'
};

/**
 * Climate HVAC actions (current activity)
 */
export const HVAC_ACTIONS = {
    OFF: 'off',
    HEATING: 'heating',
    COOLING: 'cooling',
    DRYING: 'drying',
    IDLE: 'idle',
    FAN: 'fan'
};

/**
 * Climate domain adapter
 */
export class ClimateAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'climate',
            name: 'Climate',
            icon: 'mdi:thermostat',
            aliases: ['water_heater']
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
            hvacMode: entity.state,
            hvacAction: attrs.hvac_action,
            currentTemperature: attrs.current_temperature,
            currentHumidity: attrs.current_humidity,
            
            // Target values
            targetTemperature: attrs.temperature,
            targetTempHigh: attrs.target_temp_high,
            targetTempLow: attrs.target_temp_low,
            targetHumidity: attrs.humidity,
            
            // Limits
            minTemp: attrs.min_temp || 7,
            maxTemp: attrs.max_temp || 35,
            tempStep: attrs.target_temp_step || 0.5,
            minHumidity: attrs.min_humidity || 30,
            maxHumidity: attrs.max_humidity || 99,
            
            // Available modes
            hvacModes: attrs.hvac_modes || ['off', 'heat'],
            fanModes: attrs.fan_modes || [],
            swingModes: attrs.swing_modes || [],
            presetModes: attrs.preset_modes || [],
            
            // Current modes
            fanMode: attrs.fan_mode,
            swingMode: attrs.swing_mode,
            presetMode: attrs.preset_mode,
            
            // Feature flags
            supportsTargetTemp: !!(supportedFeatures & CLIMATE_FEATURES.TARGET_TEMPERATURE),
            supportsTargetTempRange: !!(supportedFeatures & CLIMATE_FEATURES.TARGET_TEMPERATURE_RANGE),
            supportsTargetHumidity: !!(supportedFeatures & CLIMATE_FEATURES.TARGET_HUMIDITY),
            supportsFanMode: !!(supportedFeatures & CLIMATE_FEATURES.FAN_MODE),
            supportsPresetMode: !!(supportedFeatures & CLIMATE_FEATURES.PRESET_MODE),
            supportsSwingMode: !!(supportedFeatures & CLIMATE_FEATURES.SWING_MODE),
            supportsAuxHeat: !!(supportedFeatures & CLIMATE_FEATURES.AUX_HEAT),
            supportsTurnOn: !!(supportedFeatures & CLIMATE_FEATURES.TURN_ON),
            supportsTurnOff: !!(supportedFeatures & CLIMATE_FEATURES.TURN_OFF),
            
            // Units
            temperatureUnit: attrs.temperature_unit || '°C'
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'climate_entity',
                name: 'Climate Entity',
                type: 'entity',
                required: true,
                description: 'Select a climate/thermostat entity',
                domainConstraint: {
                    domains: ['climate', 'water_heater']
                }
            },
            {
                id: 'show_current_temp',
                name: 'Show Current Temperature',
                type: 'boolean',
                defaultValue: true,
                description: 'Display the current temperature'
            },
            {
                id: 'show_target_temp',
                name: 'Show Target Temperature',
                type: 'boolean',
                defaultValue: true,
                description: 'Display and allow editing target temperature'
            },
            {
                id: 'show_hvac_mode',
                name: 'Show HVAC Mode',
                type: 'boolean',
                defaultValue: true,
                description: 'Display current heating/cooling mode'
            },
            {
                id: 'temp_step',
                name: 'Temperature Step',
                type: 'number',
                defaultValue: capabilities?.tempStep || 0.5,
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Temperature adjustment increment'
            },
            {
                id: 'accent_color',
                name: 'Accent Color',
                type: 'color',
                defaultValue: '#42a5f5',
                description: 'Color for temperature arc and highlights'
            }
        ];

        // Add fan mode parameter if supported
        if (capabilities?.supportsFanMode && capabilities.fanModes?.length > 0) {
            params.push({
                id: 'show_fan_mode',
                name: 'Show Fan Mode',
                type: 'boolean',
                defaultValue: false,
                description: 'Display fan mode selector'
            });
        }

        // Add preset mode parameter if supported
        if (capabilities?.supportsPresetMode && capabilities.presetModes?.length > 0) {
            params.push({
                id: 'show_preset_mode',
                name: 'Show Preset Mode',
                type: 'boolean',
                defaultValue: false,
                description: 'Display preset mode selector'
            });
        }

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'climate_entity';

        // Current temperature
        bindings.push(this._createReadBinding(entityParam, 'props.current_temp', {
            attribute: 'current_temperature',
            transform: 'round',
            transformConfig: { precision: 1 },
            availability: {
                onUnavailable: 'show_placeholder',
                onUnknown: 'show_placeholder',
                placeholderText: '--'
            }
        }));

        // Target temperature
        bindings.push(this._createReadBinding(entityParam, 'props.target_temp', {
            attribute: 'temperature',
            transform: 'round',
            transformConfig: { precision: 1 }
        }));

        // HVAC mode (state)
        bindings.push(this._createReadBinding(entityParam, 'props.hvac_mode', {
            transform: 'identity'
        }));

        // HVAC action
        bindings.push(this._createReadBinding(entityParam, 'props.hvac_action', {
            attribute: 'hvac_action',
            transform: 'identity'
        }));

        // Target temp for arc widget (scaled)
        if (capabilities?.supportsTargetTemp) {
            bindings.push(this._createReadBinding(entityParam, 'props.arc_value', {
                attribute: 'temperature',
                transform: 'lambda',
                transformConfig: {
                    lambda: `return (int)(x * 2);` // Scale for arc min/max
                }
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getDefaultWriteBindings(capabilities) {
        const bindings = [];
        const entityParam = 'climate_entity';

        // Set temperature (from arc or +/- buttons)
        bindings.push(this._createWriteBinding('on_value_change', 'climate.set_temperature', entityParam, {
            dynamicPayload: {
                'props.target_temp': 'temperature'
            },
            debounce: true,
            debounceMs: 2000 // Longer debounce for temperature changes
        }));

        // Temperature increment
        bindings.push(this._createWriteBinding('on_temp_increase', 'climate.set_temperature', entityParam, {
            dynamicPayload: {
                'props.target_temp': 'temperature'
            },
            debounce: true,
            debounceMs: 5000
        }));

        // Temperature decrement
        bindings.push(this._createWriteBinding('on_temp_decrease', 'climate.set_temperature', entityParam, {
            dynamicPayload: {
                'props.target_temp': 'temperature'
            },
            debounce: true,
            debounceMs: 5000
        }));

        // Set HVAC mode
        if (capabilities?.hvacModes?.length > 1) {
            bindings.push(this._createWriteBinding('on_mode_change', 'climate.set_hvac_mode', entityParam, {
                dynamicPayload: {
                    'props.hvac_mode': 'hvac_mode'
                },
                debounce: false
            }));
        }

        // Set fan mode
        if (capabilities?.supportsFanMode) {
            bindings.push(this._createWriteBinding('on_fan_mode_change', 'climate.set_fan_mode', entityParam, {
                dynamicPayload: {
                    'props.fan_mode': 'fan_mode'
                },
                debounce: false
            }));
        }

        // Set preset mode
        if (capabilities?.supportsPresetMode) {
            bindings.push(this._createWriteBinding('on_preset_change', 'climate.set_preset_mode', entityParam, {
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
        const hvacAction = attrs.hvac_action;
        
        let icon = 'mdi:thermostat';
        let color = null;
        let text = entity.state;

        // Icon based on action
        switch (hvacAction) {
            case HVAC_ACTIONS.HEATING:
                icon = 'mdi:fire';
                color = '#ff5722';
                break;
            case HVAC_ACTIONS.COOLING:
                icon = 'mdi:snowflake';
                color = '#2196f3';
                break;
            case HVAC_ACTIONS.DRYING:
                icon = 'mdi:water-percent';
                color = '#ff9800';
                break;
            case HVAC_ACTIONS.FAN:
                icon = 'mdi:fan';
                color = '#4caf50';
                break;
            case HVAC_ACTIONS.IDLE:
                icon = 'mdi:thermostat';
                color = '#9e9e9e';
                break;
        }

        // Text with temperature
        if (attrs.current_temperature !== undefined) {
            const unit = attrs.temperature_unit || '°';
            text = `${attrs.current_temperature}${unit}`;
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'climate.set_temperature',
                name: 'Set Temperature',
                description: 'Set target temperature',
                fields: {
                    temperature: { type: 'number', required: true },
                    target_temp_high: { type: 'number' },
                    target_temp_low: { type: 'number' }
                }
            },
            {
                service: 'climate.set_hvac_mode',
                name: 'Set HVAC Mode',
                description: 'Set heating/cooling mode',
                fields: {
                    hvac_mode: { type: 'select', required: true }
                }
            },
            {
                service: 'climate.set_fan_mode',
                name: 'Set Fan Mode',
                description: 'Set fan speed/mode',
                fields: {
                    fan_mode: { type: 'select', required: true }
                }
            },
            {
                service: 'climate.set_preset_mode',
                name: 'Set Preset',
                description: 'Set preset mode (away, eco, etc.)',
                fields: {
                    preset_mode: { type: 'select', required: true }
                }
            },
            {
                service: 'climate.turn_on',
                name: 'Turn On',
                description: 'Turn on the climate device'
            },
            {
                service: 'climate.turn_off',
                name: 'Turn Off',
                description: 'Turn off the climate device'
            }
        ];
    }
}

export default new ClimateAdapter();
