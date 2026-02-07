/**
 * @file light_adapter.js
 * @description Domain adapter for Home Assistant light entities.
 * Handles lights with brightness, color, and effect support.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Light domain feature flags (from HA LightEntityFeature)
 * @see https://developers.home-assistant.io/docs/core/entity/light
 */
export const LIGHT_FEATURES = {
    EFFECT: 4,
    FLASH: 8,
    TRANSITION: 32
};

/**
 * Light color modes
 */
export const COLOR_MODES = {
    UNKNOWN: 'unknown',
    ONOFF: 'onoff',
    BRIGHTNESS: 'brightness',
    COLOR_TEMP: 'color_temp',
    HS: 'hs',
    XY: 'xy',
    RGB: 'rgb',
    RGBW: 'rgbw',
    RGBWW: 'rgbww',
    WHITE: 'white'
};

/**
 * Light domain adapter
 */
export class LightAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'light',
            name: 'Light',
            icon: 'mdi:lightbulb'
        });
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};
        const supportedFeatures = attrs.supported_features || 0;
        const colorModes = attrs.supported_color_modes || [];

        // Determine capabilities from color modes
        const supportsBrightness = colorModes.some(m => 
            m !== COLOR_MODES.ONOFF && m !== COLOR_MODES.UNKNOWN
        );
        const supportsColorTemp = colorModes.includes(COLOR_MODES.COLOR_TEMP);
        const supportsColor = colorModes.some(m => 
            [COLOR_MODES.HS, COLOR_MODES.XY, COLOR_MODES.RGB, COLOR_MODES.RGBW, COLOR_MODES.RGBWW].includes(m)
        );
        const supportsWhite = colorModes.includes(COLOR_MODES.WHITE) || 
                              colorModes.includes(COLOR_MODES.RGBW) || 
                              colorModes.includes(COLOR_MODES.RGBWW);

        return {
            ...base,
            // Current state
            isOn: entity.state === 'on',
            brightness: attrs.brightness, // 0-255
            brightnessPercent: attrs.brightness !== undefined ? Math.round(attrs.brightness / 255 * 100) : null,
            colorTemp: attrs.color_temp,
            colorTempKelvin: attrs.color_temp_kelvin,
            hsColor: attrs.hs_color,
            rgbColor: attrs.rgb_color,
            xyColor: attrs.xy_color,
            
            // Limits
            minMireds: attrs.min_mireds || 153,
            maxMireds: attrs.max_mireds || 500,
            minColorTempKelvin: attrs.min_color_temp_kelvin || 2000,
            maxColorTempKelvin: attrs.max_color_temp_kelvin || 6500,
            
            // Effects
            effect: attrs.effect,
            effectList: attrs.effect_list || [],
            
            // Color modes
            colorMode: attrs.color_mode,
            supportedColorModes: colorModes,
            
            // Feature flags
            supportsBrightness,
            supportsColorTemp,
            supportsColor,
            supportsWhite,
            supportsEffect: !!(supportedFeatures & LIGHT_FEATURES.EFFECT) || (attrs.effect_list?.length > 0),
            supportsFlash: !!(supportedFeatures & LIGHT_FEATURES.FLASH),
            supportsTransition: !!(supportedFeatures & LIGHT_FEATURES.TRANSITION)
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'light_entity',
                name: 'Light Entity',
                type: 'entity',
                required: true,
                description: 'Select a light entity',
                domainConstraint: {
                    domains: ['light']
                }
            },
            {
                id: 'show_brightness',
                name: 'Show Brightness',
                type: 'boolean',
                defaultValue: capabilities?.supportsBrightness || false,
                description: 'Display brightness slider'
            }
        ];

        if (capabilities?.supportsColorTemp) {
            params.push({
                id: 'show_color_temp',
                name: 'Show Color Temperature',
                type: 'boolean',
                defaultValue: false,
                description: 'Display color temperature slider'
            });
        }

        if (capabilities?.supportsColor) {
            params.push({
                id: 'show_color_picker',
                name: 'Show Color Picker',
                type: 'boolean',
                defaultValue: false,
                description: 'Display color picker'
            });
        }

        if (capabilities?.supportsEffect && capabilities.effectList?.length > 0) {
            params.push({
                id: 'show_effects',
                name: 'Show Effects',
                type: 'boolean',
                defaultValue: false,
                description: 'Display effect selector'
            });
        }

        params.push({
            id: 'on_color',
            name: 'On Color',
            type: 'color',
            defaultValue: '#ffc107',
            description: 'Color when light is on'
        });

        params.push({
            id: 'off_color',
            name: 'Off Color',
            type: 'color',
            defaultValue: '#424242',
            description: 'Color when light is off'
        });

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'light_entity';

        // On/Off state
        bindings.push(this._createReadBinding(entityParam, 'props.is_on', {
            transform: 'bool_to_text',
            transformConfig: {
                trueText: 'on',
                falseText: 'off'
            }
        }));

        // Brightness (if supported)
        if (capabilities?.supportsBrightness) {
            bindings.push(this._createReadBinding(entityParam, 'props.brightness', {
                attribute: 'brightness',
                transform: 'percent',
                transformConfig: {
                    max: 255
                }
            }));
        }

        // Color temperature (if supported)
        if (capabilities?.supportsColorTemp) {
            bindings.push(this._createReadBinding(entityParam, 'props.color_temp', {
                attribute: 'color_temp',
                transform: 'identity'
            }));
        }

        // Effect (if supported)
        if (capabilities?.supportsEffect) {
            bindings.push(this._createReadBinding(entityParam, 'props.effect', {
                attribute: 'effect',
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
        const entityParam = 'light_entity';

        // Toggle
        bindings.push(this._createWriteBinding('on_click', 'light.toggle', entityParam, {
            debounce: false
        }));

        // Turn on
        bindings.push(this._createWriteBinding('on_turn_on', 'light.turn_on', entityParam, {
            debounce: false
        }));

        // Turn off
        bindings.push(this._createWriteBinding('on_turn_off', 'light.turn_off', entityParam, {
            debounce: false
        }));

        // Set brightness
        if (capabilities?.supportsBrightness) {
            bindings.push(this._createWriteBinding('on_brightness_change', 'light.turn_on', entityParam, {
                dynamicPayload: {
                    'props.brightness': 'brightness_pct'
                },
                debounce: true,
                debounceMs: 300
            }));
        }

        // Set color temperature
        if (capabilities?.supportsColorTemp) {
            bindings.push(this._createWriteBinding('on_color_temp_change', 'light.turn_on', entityParam, {
                dynamicPayload: {
                    'props.color_temp': 'color_temp'
                },
                debounce: true,
                debounceMs: 300
            }));
        }

        // Set color (RGB)
        if (capabilities?.supportsColor) {
            bindings.push(this._createWriteBinding('on_color_change', 'light.turn_on', entityParam, {
                dynamicPayload: {
                    'props.rgb_color': 'rgb_color'
                },
                debounce: true,
                debounceMs: 300
            }));
        }

        // Set effect
        if (capabilities?.supportsEffect) {
            bindings.push(this._createWriteBinding('on_effect_change', 'light.turn_on', entityParam, {
                dynamicPayload: {
                    'props.effect': 'effect'
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
        
        let icon = isOn ? 'mdi:lightbulb' : 'mdi:lightbulb-outline';
        let color = isOn ? '#ffc107' : '#424242';
        let text = isOn ? 'On' : 'Off';

        // Show brightness if on and available
        if (isOn && attrs.brightness !== undefined) {
            const pct = Math.round(attrs.brightness / 255 * 100);
            text = `${pct}%`;
        }

        // Adjust color based on actual light color
        if (isOn && attrs.rgb_color) {
            const [r, g, b] = attrs.rgb_color;
            color = `rgb(${r}, ${g}, ${b})`;
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'light.turn_on',
                name: 'Turn On',
                description: 'Turn on the light',
                fields: {
                    brightness: { type: 'number', min: 0, max: 255 },
                    brightness_pct: { type: 'number', min: 0, max: 100 },
                    color_temp: { type: 'number' },
                    color_temp_kelvin: { type: 'number' },
                    rgb_color: { type: 'array' },
                    hs_color: { type: 'array' },
                    effect: { type: 'string' },
                    transition: { type: 'number' }
                }
            },
            {
                service: 'light.turn_off',
                name: 'Turn Off',
                description: 'Turn off the light',
                fields: {
                    transition: { type: 'number' }
                }
            },
            {
                service: 'light.toggle',
                name: 'Toggle',
                description: 'Toggle the light on/off'
            }
        ];
    }
}

export default new LightAdapter();
