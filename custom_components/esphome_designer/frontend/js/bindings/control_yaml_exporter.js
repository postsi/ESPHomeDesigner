/**
 * @file control_yaml_exporter.js
 * @description Exports controls with bindings to ESPHome YAML.
 * Generates complete LVGL widget configurations with HA entity bindings.
 */

import { ControlFactory } from '../controls/control_factory.js';
import { controlRegistry } from '../controls/control_registry.js';
import { bindingYamlGenerator } from './binding_yaml_generator.js';
import { transformToLambda } from './transforms.js';
import { domainAdapterRegistry } from '../ha/domain_adapters/index.js';
import { Logger } from '../utils/logger.js';
import { convertColor, convertAlign, getLVGLFont } from '../io/yaml_export_lvgl.js';

/**
 * Control YAML Exporter
 * Generates ESPHome YAML for controls with HA bindings
 */
export class ControlYamlExporter {
    constructor() {
        this.yamlGenerator = bindingYamlGenerator;
    }

    /**
     * Export a control instance to LVGL YAML
     * @param {import("../types.js").ControlInstance} instance
     * @param {import("../types.js").ControlDefinition} definition
     * @param {Object} profile - Device profile
     * @returns {Object[]} Array of LVGL widget objects
     */
    exportControlToLvgl(instance, definition, profile) {
        const parameterValues = instance.parameterValues || {};
        const widgets = [];
        
        // Get entity info for bindings
        const entityParam = definition.parameters?.find(p => p.type === 'entity');
        const entityId = entityParam ? parameterValues[entityParam.id] : null;
        
        // Get domain adapter for this entity
        let adapter = null;
        let capabilities = null;
        if (entityId) {
            const entity = { entity_id: entityId, state: 'unknown', attributes: {} };
            adapter = domainAdapterRegistry.getForEntity(entity);
            capabilities = adapter?.extractCapabilities(entity);
        }
        
        // Expand template to widgets
        const templateWidgets = ControlFactory.expandToWidgets(instance, definition);
        
        // Convert each template widget to LVGL
        for (const widget of templateWidgets) {
            const lvglWidget = this._convertWidgetToLvgl(widget, parameterValues, entityId, adapter, capabilities, profile);
            if (lvglWidget) {
                widgets.push(lvglWidget);
            }
        }
        
        // If no template widgets, generate based on control type
        if (widgets.length === 0 && entityId) {
            const defaultWidget = this._generateDefaultWidget(instance, definition, entityId, adapter, capabilities, profile);
            if (defaultWidget) {
                widgets.push(defaultWidget);
            }
        }
        
        return widgets;
    }

    /**
     * Convert a template widget to LVGL format
     * @private
     */
    _convertWidgetToLvgl(widget, parameterValues, entityId, adapter, capabilities, profile) {
        const safeEntityId = entityId ? entityId.replace(/[^a-zA-Z0-9_]/g, '_') : null;
        
        // Common properties
        const common = {
            id: widget.id,
            x: Math.round(widget.x || 0),
            y: Math.round(widget.y || 0),
            width: Math.round(widget.width || 100),
            height: Math.round(widget.height || 40)
        };
        
        const props = widget.props || {};
        
        switch (widget.type) {
            case 'lvgl_label':
                return this._exportLabel(widget, common, props, parameterValues, safeEntityId);
            
            case 'lvgl_button':
                return this._exportButton(widget, common, props, parameterValues, entityId, safeEntityId);
            
            case 'lvgl_switch':
                return this._exportSwitch(widget, common, props, parameterValues, entityId, safeEntityId);
            
            case 'lvgl_slider':
                return this._exportSlider(widget, common, props, parameterValues, entityId, safeEntityId, capabilities);
            
            case 'lvgl_arc':
                return this._exportArc(widget, common, props, parameterValues, safeEntityId, capabilities);
            
            case 'lvgl_bar':
                return this._exportBar(widget, common, props, parameterValues, safeEntityId);
            
            default:
                Logger.warn(`[ControlYamlExporter] Unknown widget type: ${widget.type}`);
                return null;
        }
    }

    /**
     * Export a label widget
     * @private
     */
    _exportLabel(widget, common, props, parameterValues, safeEntityId) {
        const text = this._resolveText(props.text, parameterValues, safeEntityId);
        
        return {
            label: {
                ...common,
                text,
                text_color: convertColor(props.text_color || props.color),
                text_align: convertAlign(props.align),
                long_mode: props.long_mode || 'wrap'
            }
        };
    }

    /**
     * Export a button widget
     * @private
     */
    _exportButton(widget, common, props, parameterValues, entityId, safeEntityId) {
        const text = this._resolveText(props.text, parameterValues, safeEntityId);
        const bgColor = this._resolveColor(props.bg_color, parameterValues, safeEntityId);
        
        const button = {
            button: {
                ...common,
                bg_color: bgColor,
                border_width: props.border_width || 2,
                border_color: convertColor(props.border_color || props.color),
                radius: props.radius || 5,
                widgets: [
                    {
                        label: {
                            align: 'center',
                            text,
                            text_color: convertColor(props.text_color || props.color)
                        }
                    }
                ]
            }
        };
        
        // Add click action if entity is bound
        if (entityId) {
            button.button.on_click = this._generateClickAction(entityId);
        }
        
        return button;
    }

    /**
     * Export a switch widget
     * @private
     */
    _exportSwitch(widget, common, props, parameterValues, entityId, safeEntityId) {
        const switchWidget = {
            switch: {
                ...common,
                bg_color: convertColor(props.off_color || '#9e9e9e'),
                indicator: {
                    bg_color: convertColor(props.on_color || '#4caf50')
                }
            }
        };
        
        // Bind checked state to entity
        if (safeEntityId) {
            switchWidget.switch.checked = `!lambda 'return id(${safeEntityId}).state;'`;
        }
        
        // Add toggle action
        if (entityId) {
            const domain = entityId.split('.')[0];
            switchWidget.switch.on_click = [
                {
                    'homeassistant.service': {
                        service: `${domain}.toggle`,
                        data: { entity_id: entityId }
                    }
                }
            ];
        }
        
        return switchWidget;
    }

    /**
     * Export a slider widget
     * @private
     */
    _exportSlider(widget, common, props, parameterValues, entityId, safeEntityId, capabilities) {
        const min = props.min ?? capabilities?.minTemp ?? 0;
        const max = props.max ?? capabilities?.maxTemp ?? 100;
        
        const slider = {
            slider: {
                ...common,
                min_value: min,
                max_value: max,
                indicator: {
                    bg_color: convertColor(props.color || '#2196f3')
                },
                knob: {
                    bg_color: convertColor(props.knob_color || props.color || '#2196f3')
                }
            }
        };
        
        // Bind value to entity
        if (safeEntityId) {
            slider.slider.value = `!lambda 'return id(${safeEntityId}).state;'`;
        }
        
        // Add value change action
        if (entityId) {
            const domain = entityId.split('.')[0];
            let service = `${domain}.set_value`;
            let dataField = 'value';
            
            // Domain-specific service mapping
            if (domain === 'light') {
                service = 'light.turn_on';
                dataField = 'brightness_pct';
            } else if (domain === 'climate') {
                service = 'climate.set_temperature';
                dataField = 'temperature';
            } else if (domain === 'cover') {
                service = 'cover.set_cover_position';
                dataField = 'position';
            } else if (domain === 'fan') {
                service = 'fan.set_percentage';
                dataField = 'percentage';
            }
            
            slider.slider.on_value = [
                {
                    'homeassistant.service': {
                        service,
                        data: {
                            entity_id: entityId,
                            [dataField]: '!lambda "return (int)x;"'
                        }
                    }
                }
            ];
        }
        
        return slider;
    }

    /**
     * Export an arc widget
     * @private
     */
    _exportArc(widget, common, props, parameterValues, safeEntityId, capabilities) {
        const min = props.min ?? capabilities?.minTemp ?? 0;
        const max = props.max ?? capabilities?.maxTemp ?? 100;
        
        const arc = {
            arc: {
                ...common,
                min_value: min,
                max_value: max,
                arc_width: props.thickness || 15,
                arc_color: convertColor(props.bg_arc_color || '#333333'),
                indicator: {
                    arc_color: convertColor(props.color || '#ff5722')
                }
            }
        };
        
        // Bind value to entity
        if (safeEntityId) {
            arc.arc.value = `!lambda 'return id(${safeEntityId}).state;'`;
        }
        
        return arc;
    }

    /**
     * Export a bar widget
     * @private
     */
    _exportBar(widget, common, props, parameterValues, safeEntityId) {
        const bar = {
            bar: {
                ...common,
                min_value: props.min || 0,
                max_value: props.max || 100,
                bg_color: convertColor(props.bg_color || '#333333'),
                indicator: {
                    bg_color: convertColor(props.color || '#2196f3')
                }
            }
        };
        
        if (safeEntityId) {
            bar.bar.value = `!lambda 'return id(${safeEntityId}).state;'`;
        }
        
        return bar;
    }

    /**
     * Resolve text with template substitution
     * @private
     */
    _resolveText(text, parameterValues, safeEntityId) {
        if (!text) return '""';
        
        // Check for parameter references
        if (typeof text === 'string' && text.includes('{{')) {
            // For entity state reference
            if (text.includes('{{state}}') && safeEntityId) {
                return `!lambda 'return str_sprintf("%.1f", id(${safeEntityId}).state);'`;
            }
            
            // For other parameter references, resolve them
            let resolved = text;
            for (const [key, value] of Object.entries(parameterValues)) {
                resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
            }
            return `"${resolved}"`;
        }
        
        // Static text
        return `"${text}"`;
    }

    /**
     * Resolve color with state-based logic
     * @private
     */
    _resolveColor(color, parameterValues, safeEntityId) {
        if (!color) return convertColor('#ffffff');
        
        // Check for conditional color
        if (typeof color === 'string' && color.includes('?')) {
            // Parse ternary: {{is_on ? on_color : off_color}}
            const match = color.match(/\{\{(\w+)\s*\?\s*(\w+)\s*:\s*(\w+)\}\}/);
            if (match && safeEntityId) {
                const [, condition, trueColor, falseColor] = match;
                const onColor = convertColor(parameterValues[trueColor] || '#4caf50');
                const offColor = convertColor(parameterValues[falseColor] || '#424242');
                return `!lambda 'return id(${safeEntityId}).state ? ${onColor} : ${offColor};'`;
            }
        }
        
        // Check for parameter reference
        if (typeof color === 'string' && color.startsWith('{{') && color.endsWith('}}')) {
            const paramName = color.slice(2, -2).trim();
            return convertColor(parameterValues[paramName] || '#ffffff');
        }
        
        return convertColor(color);
    }

    /**
     * Generate click action for an entity
     * @private
     */
    _generateClickAction(entityId) {
        const domain = entityId.split('.')[0];
        
        // Domain-specific actions
        const toggleDomains = ['switch', 'light', 'fan', 'input_boolean'];
        const pressDomains = ['button', 'input_button'];
        const sceneDomains = ['scene'];
        const scriptDomains = ['script'];
        
        if (toggleDomains.includes(domain)) {
            return [
                {
                    'homeassistant.service': {
                        service: 'homeassistant.toggle',
                        data: { entity_id: entityId }
                    }
                }
            ];
        }
        
        if (pressDomains.includes(domain)) {
            return [
                {
                    'homeassistant.service': {
                        service: 'button.press',
                        data: { entity_id: entityId }
                    }
                }
            ];
        }
        
        if (sceneDomains.includes(domain)) {
            return [
                {
                    'homeassistant.service': {
                        service: 'scene.turn_on',
                        data: { entity_id: entityId }
                    }
                }
            ];
        }
        
        if (scriptDomains.includes(domain)) {
            return [
                {
                    'homeassistant.service': {
                        service: 'script.turn_on',
                        data: { entity_id: entityId }
                    }
                }
            ];
        }
        
        // Default to toggle
        return [
            {
                'homeassistant.service': {
                    service: 'homeassistant.toggle',
                    data: { entity_id: entityId }
                }
            }
        ];
    }

    /**
     * Generate a default widget for a control without a template
     * @private
     */
    _generateDefaultWidget(instance, definition, entityId, adapter, capabilities, profile) {
        if (!entityId) return null;
        
        const domain = entityId.split('.')[0];
        const safeEntityId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Generate based on domain
        switch (domain) {
            case 'light':
            case 'switch':
            case 'fan':
            case 'input_boolean':
                return {
                    button: {
                        id: instance.id,
                        x: instance.x,
                        y: instance.y,
                        width: instance.width || 100,
                        height: instance.height || 50,
                        bg_color: `!lambda 'return id(${safeEntityId}).state ? lv_color_hex(0x4CAF50) : lv_color_hex(0x424242);'`,
                        widgets: [
                            {
                                label: {
                                    align: 'center',
                                    text: `"${definition.name || domain}"`,
                                    text_color: '"0xFFFFFF"'
                                }
                            }
                        ],
                        on_click: this._generateClickAction(entityId)
                    }
                };
            
            case 'sensor':
                return {
                    label: {
                        id: instance.id,
                        x: instance.x,
                        y: instance.y,
                        width: instance.width || 100,
                        height: instance.height || 40,
                        text: `!lambda 'return str_sprintf("%.1f", id(${safeEntityId}).state);'`,
                        text_color: '"0xFFFFFF"'
                    }
                };
            
            default:
                return {
                    label: {
                        id: instance.id,
                        x: instance.x,
                        y: instance.y,
                        width: instance.width || 100,
                        height: instance.height || 40,
                        text: `!lambda 'return to_string(id(${safeEntityId}).state);'`,
                        text_color: '"0xFFFFFF"'
                    }
                };
        }
    }

    /**
     * Generate sensor registrations for all controls
     * @param {Object[]} controls - Array of { instance, definition }
     * @returns {string[]} YAML lines for sensor section
     */
    generateSensorRegistrations(controls) {
        this.yamlGenerator.reset();
        
        for (const { instance, definition } of controls) {
            const parameterValues = instance.parameterValues || {};
            
            // Find entity parameters and register sensors
            for (const param of definition.parameters || []) {
                if (param.type === 'entity') {
                    const entityId = parameterValues[param.id];
                    if (entityId) {
                        this.yamlGenerator.processReadBindings(
                            [{ entityParam: param.id, targetProperty: 'state' }],
                            parameterValues,
                            instance.id,
                            true
                        );
                    }
                }
            }
        }
        
        return this.yamlGenerator.generateBindingYaml(controls, true);
    }
}

// Export singleton
export const controlYamlExporter = new ControlYamlExporter();
export default controlYamlExporter;
