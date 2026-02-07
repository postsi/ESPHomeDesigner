/**
 * @file builtin_controls.js
 * @description Built-in control definitions for common Home Assistant entity types.
 * These are pre-configured, production-ready controls that users can add to their designs.
 */

/**
 * @type {import("../types.js").ControlDefinition[]}
 */
export const BUILTIN_CONTROLS = [
    // ============================================
    // CLIMATE CONTROLS
    // ============================================
    {
        id: 'climate_thermostat',
        name: 'Thermostat',
        description: 'Full-featured thermostat control with live HA data',
        category: 'Climate',
        icon: 'mdi:thermostat',
        version: 1,
        parameters: [
            {
                id: 'climate_entity',
                name: 'Climate Entity',
                type: 'entity',
                required: true,
                description: 'Select a climate/thermostat entity',
                domainConstraint: { domains: ['climate', 'water_heater'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Thermostat'
            },
            {
                id: 'accent_color',
                name: 'Accent Color',
                type: 'color',
                defaultValue: '#ff5722'
            },
            {
                id: 'bg_color',
                name: 'Background Color',
                type: 'color',
                defaultValue: '#1a1a2e'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_thermostat', 
                    id: 'thermostat',
                    props: {
                        accent_color: '{{accent_color}}',
                        bg_color: '{{bg_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 160, height: 200 },
        scalable: true,
        tags: ['climate', 'thermostat', 'temperature', 'hvac']
    },


    // ============================================
    // LIGHT CONTROLS
    // ============================================
    {
        id: 'light_card',
        name: 'Light Card',
        description: 'HA-style light card with brightness control',
        category: 'Light',
        icon: 'mdi:lightbulb',
        version: 1,
        parameters: [
            {
                id: 'light_entity',
                name: 'Light Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['light'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Light'
            },
            {
                id: 'on_color',
                name: 'On Color',
                type: 'color',
                defaultValue: '#ffc107'
            },
            {
                id: 'off_color',
                name: 'Off Color',
                type: 'color',
                defaultValue: '#424242'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_light', 
                    id: 'light',
                    props: {
                        on_color: '{{on_color}}',
                        off_color: '{{off_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 140, height: 180 },
        scalable: true,
        tags: ['light', 'brightness', 'toggle']
    },

    // ============================================
    // SWITCH CONTROLS
    // ============================================
    {
        id: 'switch_card',
        name: 'Switch Card',
        description: 'HA-style switch card with toggle',
        category: 'Switch',
        icon: 'mdi:toggle-switch',
        version: 1,
        parameters: [
            {
                id: 'switch_entity',
                name: 'Switch Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['switch', 'input_boolean'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Switch'
            },
            {
                id: 'on_color',
                name: 'On Color',
                type: 'color',
                defaultValue: '#4caf50'
            },
            {
                id: 'off_color',
                name: 'Off Color',
                type: 'color',
                defaultValue: '#9e9e9e'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_switch', 
                    id: 'switch',
                    props: {
                        on_color: '{{on_color}}',
                        off_color: '{{off_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 140, height: 60 },
        scalable: true,
        tags: ['switch', 'toggle', 'binary']
    },

    // ============================================
    // COVER CONTROLS
    // ============================================
    {
        id: 'cover_card',
        name: 'Cover Card',
        description: 'HA-style cover card with position and controls',
        category: 'Cover',
        icon: 'mdi:window-shutter',
        version: 1,
        parameters: [
            {
                id: 'cover_entity',
                name: 'Cover Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['cover'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Cover'
            },
            {
                id: 'accent_color',
                name: 'Accent Color',
                type: 'color',
                defaultValue: '#2196f3'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_cover', 
                    id: 'cover',
                    props: {
                        accent_color: '{{accent_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 160, height: 140 },
        scalable: true,
        tags: ['cover', 'blinds', 'garage', 'position']
    },

    // ============================================
    // FAN CONTROLS
    // ============================================
    {
        id: 'fan_card',
        name: 'Fan Card',
        description: 'HA-style fan card with speed control',
        category: 'Fan',
        icon: 'mdi:fan',
        version: 1,
        parameters: [
            {
                id: 'fan_entity',
                name: 'Fan Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['fan'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Fan'
            },
            {
                id: 'on_color',
                name: 'On Color',
                type: 'color',
                defaultValue: '#4caf50'
            },
            {
                id: 'off_color',
                name: 'Off Color',
                type: 'color',
                defaultValue: '#424242'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_fan', 
                    id: 'fan',
                    props: {
                        on_color: '{{on_color}}',
                        off_color: '{{off_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 140, height: 160 },
        scalable: true,
        tags: ['fan', 'speed', 'toggle']
    },

    // ============================================
    // SENSOR DISPLAYS
    // ============================================
    {
        id: 'sensor_card',
        name: 'Sensor Card',
        description: 'HA-style sensor card with icon and value',
        category: 'Sensor',
        icon: 'mdi:eye',
        version: 1,
        parameters: [
            {
                id: 'sensor_entity',
                name: 'Sensor Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['sensor', 'binary_sensor'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Sensor'
            },
            {
                id: 'unit',
                name: 'Unit',
                type: 'string',
                defaultValue: ''
            },
            {
                id: 'decimals',
                name: 'Decimal Places',
                type: 'number',
                defaultValue: 1,
                min: 0,
                max: 5
            },
            {
                id: 'accent_color',
                name: 'Accent Color',
                type: 'color',
                defaultValue: '#2196f3'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_sensor', 
                    id: 'sensor',
                    props: {
                        title: '{{title}}',
                        unit: '{{unit}}',
                        decimals: '{{decimals}}',
                        accent_color: '{{accent_color}}'
                    }
                }
            ]
        },
        defaultSize: { width: 120, height: 100 },
        scalable: true,
        tags: ['sensor', 'display', 'value']
    },

    // ============================================
    // MEDIA PLAYER CONTROLS
    // ============================================
    {
        id: 'media_player_card',
        name: 'Media Player Card',
        description: 'HA-style media player card with controls and volume',
        category: 'Media',
        icon: 'mdi:play-circle',
        version: 1,
        parameters: [
            {
                id: 'media_player_entity',
                name: 'Media Player Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['media_player'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Media Player'
            },
            {
                id: 'accent_color',
                name: 'Accent Color',
                type: 'color',
                defaultValue: '#1db954'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_media_player', 
                    id: 'media_player',
                    props: {
                        accent_color: '{{accent_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 200, height: 180 },
        scalable: true,
        tags: ['media', 'player', 'volume']
    },

    // ============================================
    // LOCK CONTROLS
    // ============================================
    {
        id: 'lock_card',
        name: 'Lock Card',
        description: 'HA-style lock card with status display',
        category: 'Lock',
        icon: 'mdi:lock',
        version: 1,
        parameters: [
            {
                id: 'lock_entity',
                name: 'Lock Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['lock'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Lock'
            },
            {
                id: 'locked_color',
                name: 'Locked Color',
                type: 'color',
                defaultValue: '#4caf50'
            },
            {
                id: 'unlocked_color',
                name: 'Unlocked Color',
                type: 'color',
                defaultValue: '#f44336'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_lock', 
                    id: 'lock',
                    props: {
                        locked_color: '{{locked_color}}',
                        unlocked_color: '{{unlocked_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 140, height: 120 },
        scalable: true,
        tags: ['lock', 'security']
    },

    // ============================================
    // SCENE/SCRIPT CONTROLS
    // ============================================
    {
        id: 'scene_card',
        name: 'Scene Card',
        description: 'HA-style button to activate a scene',
        category: 'Scene',
        icon: 'mdi:palette',
        version: 1,
        parameters: [
            {
                id: 'scene_entity',
                name: 'Scene Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['scene'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Scene'
            },
            {
                id: 'button_color',
                name: 'Button Color',
                type: 'color',
                defaultValue: '#6200ea'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_button', 
                    id: 'scene_btn',
                    props: {
                        button_color: '{{button_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 120, height: 80 },
        scalable: true,
        tags: ['scene', 'automation']
    },

    {
        id: 'script_card',
        name: 'Script Card',
        description: 'HA-style button to run a script',
        category: 'Script',
        icon: 'mdi:script-text',
        version: 1,
        parameters: [
            {
                id: 'script_entity',
                name: 'Script Entity',
                type: 'entity',
                required: true,
                domainConstraint: { domains: ['script'] }
            },
            {
                id: 'title',
                name: 'Title',
                type: 'string',
                defaultValue: 'Script'
            },
            {
                id: 'button_color',
                name: 'Button Color',
                type: 'color',
                defaultValue: '#ff5722'
            },
            {
                id: 'running_color',
                name: 'Running Color',
                type: 'color',
                defaultValue: '#4caf50'
            }
        ],
        template: {
            type: 'composite',
            layout: 'single',
            widgets: [
                { 
                    type: 'ha_button', 
                    id: 'script_btn',
                    props: {
                        button_color: '{{button_color}}',
                        running_color: '{{running_color}}',
                        title: '{{title}}'
                    }
                }
            ]
        },
        defaultSize: { width: 120, height: 80 },
        scalable: true,
        tags: ['script', 'automation']
    }
];

/**
 * Get all built-in controls
 * @returns {import("../types.js").ControlDefinition[]}
 */
export function getBuiltinControls() {
    return BUILTIN_CONTROLS;
}

/**
 * Get built-in controls by category
 * @param {string} category
 * @returns {import("../types.js").ControlDefinition[]}
 */
export function getBuiltinControlsByCategory(category) {
    return BUILTIN_CONTROLS.filter(c => c.category === category);
}

/**
 * Get a built-in control by ID
 * @param {string} id
 * @returns {import("../types.js").ControlDefinition | undefined}
 */
export function getBuiltinControlById(id) {
    return BUILTIN_CONTROLS.find(c => c.id === id);
}

/**
 * Get all unique categories from built-in controls
 * @returns {string[]}
 */
export function getBuiltinControlCategories() {
    const categories = new Set(BUILTIN_CONTROLS.map(c => c.category));
    return Array.from(categories).sort();
}

export default BUILTIN_CONTROLS;
