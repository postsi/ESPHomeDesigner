/**
 * @file control_factory.js
 * @description Factory for creating and managing reusable control instances.
 * Controls are parameterized composite widgets that bind to Home Assistant entities.
 */

import { generateId } from '../utils/helpers.js';
import { domainAdapterRegistry } from '../ha/domain_adapters/index.js';

/**
 * Control Factory - Creates control instances from definitions
 */
export class ControlFactory {
    /**
     * Creates a new control instance from a control definition
     * @param {import("../types.js").ControlDefinition} definition - The control definition
     * @param {Object} [options] - Creation options
     * @param {number} [options.x=50] - X position
     * @param {number} [options.y=50] - Y position
     * @param {Object} [options.parameterValues] - Initial parameter values
     * @returns {import("../types.js").ControlInstance}
     */
    static createInstance(definition, options = {}) {
        const { x = 50, y = 50, parameterValues = {} } = options;

        // Build default parameter values from definition
        const defaultValues = {};
        for (const param of definition.parameters || []) {
            if (param.defaultValue !== undefined) {
                defaultValues[param.id] = param.defaultValue;
            }
        }

        return {
            id: generateId(),
            controlId: definition.id,
            x,
            y,
            width: definition.defaultSize?.width || 200,
            height: definition.defaultSize?.height || 100,
            parameterValues: { ...defaultValues, ...parameterValues },
            hidden: false,
            locked: false
        };
    }

    /**
     * Creates a control definition from an entity using domain adapters
     * @param {Object} entity - Home Assistant entity
     * @param {Object} [options] - Options for control creation
     * @returns {import("../types.js").ControlDefinition}
     */
    static createDefinitionFromEntity(entity, options = {}) {
        const adapter = domainAdapterRegistry.getForEntity(entity);
        const capabilities = adapter.extractCapabilities(entity);
        const parameters = adapter.getParameters(capabilities);
        
        const domain = entity.entity_id.split('.')[0];
        const entityName = entity.attributes?.friendly_name || entity.entity_id.split('.')[1];

        return {
            id: `auto_${domain}_${generateId()}`,
            name: `${entityName} Control`,
            description: `Auto-generated control for ${entity.entity_id}`,
            category: adapter.name,
            icon: adapter.icon,
            version: 1,
            parameters,
            template: ControlFactory._generateTemplateForDomain(domain, capabilities),
            defaultSize: ControlFactory._getDefaultSizeForDomain(domain),
            scalable: true,
            tags: [domain, 'auto-generated']
        };
    }

    /**
     * Generates a template structure for a domain
     * @private
     */
    static _generateTemplateForDomain(domain, capabilities) {
        // Base template structure - widgets will be generated based on domain
        const templates = {
            climate: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_arc',
                        id: 'temp_arc',
                        props: {
                            min: capabilities?.minTemp || 7,
                            max: capabilities?.maxTemp || 35,
                            thickness: 15,
                            color: '{{accent_color}}'
                        },
                        bindings: ['current_temp', 'target_temp']
                    },
                    {
                        type: 'lvgl_label',
                        id: 'temp_label',
                        props: {
                            text: '{{current_temp}}°',
                            align: 'center'
                        }
                    },
                    {
                        type: 'lvgl_label',
                        id: 'mode_label',
                        props: {
                            text: '{{hvac_mode}}',
                            align: 'center'
                        }
                    }
                ]
            },
            light: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_button',
                        id: 'toggle_btn',
                        props: {
                            text: '{{name}}',
                            bg_color: '{{is_on ? on_color : off_color}}'
                        },
                        events: ['on_click']
                    },
                    {
                        type: 'lvgl_slider',
                        id: 'brightness_slider',
                        condition: '{{show_brightness}}',
                        props: {
                            min: 0,
                            max: 100,
                            value: '{{brightness}}'
                        },
                        events: ['on_brightness_change']
                    }
                ]
            },
            switch: {
                type: 'composite',
                layout: 'horizontal',
                widgets: [
                    {
                        type: 'lvgl_switch',
                        id: 'toggle_switch',
                        props: {
                            checked: '{{is_on}}'
                        },
                        events: ['on_click']
                    },
                    {
                        type: 'lvgl_label',
                        id: 'state_label',
                        condition: '{{show_label}}',
                        props: {
                            text: '{{state_text}}'
                        }
                    }
                ]
            },
            cover: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_buttonmatrix',
                        id: 'control_buttons',
                        props: {
                            buttons: ['▲|open', '■|stop', '▼|close']
                        },
                        events: ['on_open', 'on_stop', 'on_close']
                    },
                    {
                        type: 'lvgl_slider',
                        id: 'position_slider',
                        condition: '{{show_position}}',
                        props: {
                            min: 0,
                            max: 100,
                            value: '{{position}}'
                        },
                        events: ['on_position_change']
                    }
                ]
            },
            fan: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_button',
                        id: 'toggle_btn',
                        props: {
                            text: '{{name}}',
                            bg_color: '{{is_on ? on_color : off_color}}'
                        },
                        events: ['on_click']
                    },
                    {
                        type: 'lvgl_slider',
                        id: 'speed_slider',
                        condition: '{{show_speed}}',
                        props: {
                            min: 0,
                            max: 100,
                            value: '{{percentage}}'
                        },
                        events: ['on_speed_change']
                    }
                ]
            },
            sensor: {
                type: 'composite',
                layout: 'horizontal',
                widgets: [
                    {
                        type: 'lvgl_label',
                        id: 'value_label',
                        props: {
                            text: '{{value}}{{show_unit ? " " + unit : ""}}',
                            text_color: '{{value_color}}'
                        }
                    }
                ]
            },
            media_player: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_label',
                        id: 'title_label',
                        condition: '{{show_media_info}}',
                        props: {
                            text: '{{media_title || "No media"}}',
                            long_mode: 'scroll'
                        }
                    },
                    {
                        type: 'lvgl_buttonmatrix',
                        id: 'playback_controls',
                        props: {
                            buttons: ['⏮|prev', '⏯|play_pause', '⏭|next']
                        },
                        events: ['on_previous', 'on_play_pause', 'on_next']
                    },
                    {
                        type: 'lvgl_slider',
                        id: 'volume_slider',
                        condition: '{{show_volume}}',
                        props: {
                            min: 0,
                            max: 100,
                            value: '{{volume}}'
                        },
                        events: ['on_volume_change']
                    }
                ]
            },
            lock: {
                type: 'composite',
                layout: 'vertical',
                widgets: [
                    {
                        type: 'lvgl_button',
                        id: 'lock_btn',
                        props: {
                            text: '{{state_text}}',
                            bg_color: '{{is_locked ? locked_color : unlocked_color}}'
                        },
                        events: ['on_click']
                    }
                ]
            },
            scene: {
                type: 'composite',
                layout: 'single',
                widgets: [
                    {
                        type: 'lvgl_button',
                        id: 'activate_btn',
                        props: {
                            text: '{{button_text || name}}',
                            bg_color: '{{button_color}}'
                        },
                        events: ['on_click']
                    }
                ]
            }
        };

        return templates[domain] || templates.sensor;
    }

    /**
     * Gets default size for a domain
     * @private
     */
    static _getDefaultSizeForDomain(domain) {
        const sizes = {
            climate: { width: 200, height: 200 },
            light: { width: 150, height: 100 },
            switch: { width: 120, height: 50 },
            cover: { width: 150, height: 150 },
            fan: { width: 150, height: 100 },
            sensor: { width: 100, height: 40 },
            media_player: { width: 250, height: 150 },
            lock: { width: 120, height: 60 },
            scene: { width: 120, height: 50 }
        };
        return sizes[domain] || { width: 150, height: 80 };
    }

    /**
     * Expands a control instance into actual widgets
     * @param {import("../types.js").ControlInstance} instance - The control instance
     * @param {import("../types.js").ControlDefinition} definition - The control definition
     * @returns {Object[]} Array of widget configurations
     */
    static expandToWidgets(instance, definition) {
        const template = definition.template;
        if (!template || !template.widgets) {
            // No template - create a simple placeholder widget
            return [{
                id: `${instance.id}_placeholder`,
                type: 'lvgl_label',
                x: instance.x,
                y: instance.y,
                width: instance.width || 100,
                height: instance.height || 40,
                parentId: instance.id,
                props: {
                    text: definition.name || 'Control',
                    text_color: '#FFFFFF',
                    bg_color: '#333333'
                }
            }];
        }

        const widgets = [];
        const params = instance.parameterValues || {};

        // Calculate layout positions based on control size
        const controlWidth = instance.width || definition.defaultSize?.width || 200;
        const controlHeight = instance.height || definition.defaultSize?.height || 100;
        
        let offsetX = 0;
        let offsetY = 0;
        const spacing = 8;
        const widgetCount = template.widgets.filter(w => {
            if (!w.condition) return true;
            return ControlFactory._evaluateExpression(w.condition, params);
        }).length;

        for (const widgetTemplate of template.widgets) {
            // Check condition
            if (widgetTemplate.condition) {
                const conditionResult = ControlFactory._evaluateExpression(widgetTemplate.condition, params);
                if (!conditionResult) continue;
            }

            // Calculate widget dimensions based on layout
            let widgetWidth, widgetHeight;
            if (template.layout === 'stack') {
                // Stack layout - all widgets same size as control
                widgetWidth = controlWidth;
                widgetHeight = controlHeight;
            } else if (template.layout === 'vertical') {
                widgetWidth = controlWidth;
                widgetHeight = Math.floor((controlHeight - (spacing * (widgetCount - 1))) / widgetCount);
            } else if (template.layout === 'horizontal') {
                widgetWidth = Math.floor((controlWidth - (spacing * (widgetCount - 1))) / widgetCount);
                widgetHeight = controlHeight;
            } else {
                widgetWidth = widgetTemplate.width || controlWidth;
                widgetHeight = widgetTemplate.height || 40;
            }

            // Create widget from template with proper defaults
            const widget = {
                id: `${instance.id}_${widgetTemplate.id}`,
                type: widgetTemplate.type,
                x: instance.x + offsetX,
                y: instance.y + offsetY,
                width: widgetWidth,
                height: widgetHeight,
                parentId: instance.id,
                props: ControlFactory._getDefaultPropsForType(widgetTemplate.type)
            };

            // Resolve template expressions in props
            for (const [key, value] of Object.entries(widgetTemplate.props || {})) {
                widget.props[key] = ControlFactory._resolveTemplateValue(value, params);
            }

            // Pass entity_id from control parameters to widget
            // Look for any parameter that ends with '_entity' or is named 'entity_id'
            for (const [paramKey, paramValue] of Object.entries(params)) {
                if ((paramKey.endsWith('_entity') || paramKey === 'entity_id') && paramValue) {
                    widget.entity_id = paramValue;
                    break;
                }
            }

            widgets.push(widget);

            // Update offset for next widget (skip for stack layout)
            if (template.layout === 'vertical') {
                offsetY += widgetHeight + spacing;
            } else if (template.layout === 'horizontal') {
                offsetX += widgetWidth + spacing;
            }
            // Stack layout keeps all widgets at same position (layered)
        }

        return widgets;
    }

    /**
     * Gets default props for a widget type
     * @private
     */
    static _getDefaultPropsForType(type) {
        const defaults = {
            lvgl_label: {
                text: 'Label',
                color: '#FFFFFF'
            },
            lvgl_button: {
                text: 'Button',
                bg_color: '#424242'
            },
            lvgl_arc: {
                min: 0,
                max: 100,
                value: 50,
                color: '#0078D4',
                thickness: 10
            },
            lvgl_slider: {
                min: 0,
                max: 100,
                value: 50
            },
            lvgl_switch: {
                checked: false
            },
            lvgl_bar: {
                min: 0,
                max: 100,
                value: 50
            }
        };
        return { ...(defaults[type] || {}) };
    }

    /**
     * Resolves a template value with parameter substitution
     * @private
     */
    static _resolveTemplateValue(value, params) {
        if (typeof value !== 'string') return value;
        
        // Handle simple {{param}} substitution
        const simpleMatch = value.match(/^\{\{(\w+)\}\}$/);
        if (simpleMatch) {
            return params[simpleMatch[1]];
        }

        // Handle template strings with multiple substitutions
        return value.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
            return ControlFactory._evaluateExpression(expr, params);
        });
    }

    /**
     * Evaluates a simple expression with parameters
     * @private
     */
    static _evaluateExpression(expr, params) {
        // Simple parameter lookup
        if (params.hasOwnProperty(expr.trim())) {
            return params[expr.trim()];
        }

        // Handle ternary expressions: condition ? trueVal : falseVal
        const ternaryMatch = expr.match(/^(\w+)\s*\?\s*([^:]+)\s*:\s*(.+)$/);
        if (ternaryMatch) {
            const [, condition, trueVal, falseVal] = ternaryMatch;
            const conditionResult = params[condition.trim()];
            return conditionResult ? ControlFactory._resolveTemplateValue(trueVal.trim(), params) 
                                   : ControlFactory._resolveTemplateValue(falseVal.trim(), params);
        }

        // Handle concatenation with ||
        const orMatch = expr.match(/^(\w+)\s*\|\|\s*(.+)$/);
        if (orMatch) {
            const [, param, fallback] = orMatch;
            return params[param.trim()] || ControlFactory._resolveTemplateValue(fallback.trim(), params);
        }

        return expr;
    }

    /**
     * Validates a control instance against its definition
     * @param {import("../types.js").ControlInstance} instance
     * @param {import("../types.js").ControlDefinition} definition
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validate(instance, definition) {
        const errors = [];

        // Check required parameters
        for (const param of definition.parameters || []) {
            if (param.required && !instance.parameterValues?.[param.id]) {
                errors.push(`Missing required parameter: ${param.name}`);
            }
        }

        // Validate parameter types
        for (const param of definition.parameters || []) {
            const value = instance.parameterValues?.[param.id];
            if (value === undefined) continue;

            switch (param.type) {
                case 'number':
                    if (typeof value !== 'number') {
                        errors.push(`Parameter ${param.name} must be a number`);
                    } else {
                        if (param.min !== undefined && value < param.min) {
                            errors.push(`Parameter ${param.name} must be >= ${param.min}`);
                        }
                        if (param.max !== undefined && value > param.max) {
                            errors.push(`Parameter ${param.name} must be <= ${param.max}`);
                        }
                    }
                    break;
                case 'entity':
                    if (typeof value !== 'string' || !value.includes('.')) {
                        errors.push(`Parameter ${param.name} must be a valid entity ID`);
                    }
                    break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default ControlFactory;
