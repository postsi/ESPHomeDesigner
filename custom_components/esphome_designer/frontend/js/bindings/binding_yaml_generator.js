/**
 * @file binding_yaml_generator.js
 * @description Generates ESPHome YAML for bindings.
 * Converts ReadBindings and WriteBindings into ESPHome sensor subscriptions,
 * lambdas, and automation triggers.
 */

import { transformToLambda } from './transforms.js';
import { Logger } from '../utils/logger.js';

/**
 * Binding YAML Generator
 * Generates ESPHome configuration for HA entity bindings
 */
export class BindingYamlGenerator {
    constructor() {
        /** @type {Set<string>} Track registered sensor IDs to avoid duplicates */
        this.registeredSensors = new Set();
        
        /** @type {Map<string, Set<string>>} Map of entity_id -> widget refresh actions */
        this.pendingRefreshes = new Map();
        
        /** @type {string[]} Accumulated sensor lines */
        this.sensorLines = [];
        
        /** @type {string[]} Accumulated text_sensor lines */
        this.textSensorLines = [];
        
        /** @type {string[]} Accumulated binary_sensor lines */
        this.binarySensorLines = [];
    }

    /**
     * Reset the generator state
     */
    reset() {
        this.registeredSensors.clear();
        this.pendingRefreshes.clear();
        this.sensorLines = [];
        this.textSensorLines = [];
        this.binarySensorLines = [];
    }

    /**
     * Generate a safe ESPHome ID from an entity ID
     * @param {string} entityId
     * @returns {string}
     */
    toSafeId(entityId) {
        if (!entityId) return 'unknown_entity';
        let safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        // ESPHome IDs must be <= 63 chars
        if (safeId.length > 63) {
            safeId = safeId.substring(0, 63);
        }
        return safeId;
    }

    /**
     * Determine the sensor type for an entity
     * @param {string} entityId
     * @returns {'sensor' | 'text_sensor' | 'binary_sensor'}
     */
    getSensorType(entityId) {
        if (!entityId) return 'text_sensor';
        const domain = entityId.split('.')[0];
        
        // Binary domains
        if (['binary_sensor', 'switch', 'light', 'fan', 'input_boolean', 'lock', 'cover'].includes(domain)) {
            return 'binary_sensor';
        }
        
        // Text domains
        if (['input_text', 'text', 'weather', 'person', 'zone', 'device_tracker'].includes(domain)) {
            return 'text_sensor';
        }
        
        // Numeric by default
        return 'sensor';
    }

    /**
     * Process read bindings and generate sensor registrations
     * @param {import("../types.js").ReadBinding[]} bindings
     * @param {Object} parameterValues - Resolved parameter values
     * @param {string} widgetId - ID of the widget these bindings belong to
     * @param {boolean} isLvgl - Whether we're generating for LVGL mode
     */
    processReadBindings(bindings, parameterValues, widgetId, isLvgl = true) {
        for (const binding of bindings || []) {
            const entityId = parameterValues[binding.entityParam];
            if (!entityId) continue;
            
            const safeId = this.toSafeId(entityId);
            
            // Register sensor if not already registered
            if (!this.registeredSensors.has(safeId)) {
                this.registeredSensors.add(safeId);
                this._generateSensorRegistration(entityId, safeId, binding);
            }
            
            // Track widget refresh for this entity
            if (isLvgl) {
                if (!this.pendingRefreshes.has(entityId)) {
                    this.pendingRefreshes.set(entityId, new Set());
                }
                this.pendingRefreshes.get(entityId).add(`- lvgl.widget.update:\n    id: ${widgetId}`);
            }
        }
    }

    /**
     * Generate sensor registration YAML
     * @private
     */
    _generateSensorRegistration(entityId, safeId, binding) {
        const sensorType = this.getSensorType(entityId);
        const lines = [];
        
        lines.push(`- platform: homeassistant`);
        lines.push(`  id: ${safeId}`);
        lines.push(`  entity_id: ${entityId}`);
        
        // Add attribute if specified
        if (binding.attribute) {
            lines.push(`  attribute: ${binding.attribute}`);
        }
        
        lines.push(`  internal: true`);
        
        // Add to appropriate sensor type array
        if (sensorType === 'sensor') {
            this.sensorLines.push(...lines);
        } else if (sensorType === 'text_sensor') {
            this.textSensorLines.push(...lines);
        } else {
            this.binarySensorLines.push(...lines);
        }
    }

    /**
     * Generate lambda expression for a read binding
     * @param {import("../types.js").ReadBinding} binding
     * @param {Object} parameterValues
     * @returns {string} Lambda expression
     */
    generateReadLambda(binding, parameterValues) {
        const entityId = parameterValues[binding.entityParam];
        if (!entityId) return '""';
        
        const safeId = this.toSafeId(entityId);
        const sensorType = this.getSensorType(entityId);
        
        // Base expression to get the value
        let expr;
        if (binding.attribute) {
            // For attributes, we need to use the attribute sensor
            expr = `id(${safeId}).state`;
        } else {
            expr = `id(${safeId}).state`;
        }
        
        // Apply transform
        if (binding.transform && binding.transform !== 'identity') {
            expr = transformToLambda(binding.transform, expr, binding.transformConfig || {});
        }
        
        // Handle availability
        const availability = binding.availability || {};
        const placeholder = availability.placeholderText || '--';
        
        if (availability.onUnavailable === 'show_placeholder' || availability.onUnknown === 'show_placeholder') {
            // Wrap in availability check
            if (sensorType === 'sensor') {
                expr = `!lambda |-
  if (isnan(id(${safeId}).state)) return "${placeholder}";
  return ${expr};`;
            } else {
                expr = `!lambda |-
  if (!id(${safeId}).has_state()) return "${placeholder}";
  return ${expr};`;
            }
        } else {
            expr = `!lambda 'return ${expr};'`;
        }
        
        return expr;
    }

    /**
     * Process write bindings and generate automation YAML
     * @param {import("../types.js").WriteBinding[]} bindings
     * @param {Object} parameterValues
     * @param {string} widgetId
     * @returns {Object} Map of event -> YAML action array
     */
    processWriteBindings(bindings, parameterValues, widgetId) {
        const eventActions = {};
        
        for (const binding of bindings || []) {
            const entityId = parameterValues[binding.entityParam];
            if (!entityId) continue;
            
            const action = this._generateServiceCall(binding, entityId, parameterValues);
            
            if (!eventActions[binding.event]) {
                eventActions[binding.event] = [];
            }
            
            // Add debounce wrapper if needed
            if (binding.debounce && binding.debounceMs > 0) {
                eventActions[binding.event].push({
                    'delay': `${binding.debounceMs}ms`
                });
            }
            
            eventActions[binding.event].push(action);
        }
        
        return eventActions;
    }

    /**
     * Generate a service call action
     * @private
     */
    _generateServiceCall(binding, entityId, parameterValues) {
        const [domain, service] = binding.service.split('.');
        
        // Build data object
        const data = {
            entity_id: entityId,
            ...binding.staticPayload
        };
        
        // For dynamic payload, we'll generate lambdas
        const dynamicData = {};
        if (binding.dynamicPayload) {
            for (const [propPath, serviceField] of Object.entries(binding.dynamicPayload)) {
                // This will be resolved at runtime via lambda
                dynamicData[serviceField] = `!lambda 'return ${propPath};'`;
            }
        }
        
        return {
            'homeassistant.service': {
                service: binding.service,
                data: { ...data, ...dynamicData }
            }
        };
    }

    /**
     * Generate on_value triggers with widget refreshes
     * @returns {Object} Map of sensor_id -> on_value actions
     */
    generateRefreshTriggers() {
        const triggers = {};
        
        for (const [entityId, actions] of this.pendingRefreshes) {
            const safeId = this.toSafeId(entityId);
            triggers[safeId] = {
                on_value: Array.from(actions).map(action => {
                    // Parse the action string back to object
                    const lines = action.split('\n');
                    if (lines[0].includes('lvgl.widget.update')) {
                        const idMatch = lines[1]?.match(/id:\s*(\S+)/);
                        return {
                            'lvgl.widget.update': {
                                id: idMatch ? idMatch[1] : 'unknown'
                            }
                        };
                    }
                    return action;
                })
            };
        }
        
        return triggers;
    }

    /**
     * Get all generated sensor lines
     * @returns {{ sensor: string[], text_sensor: string[], binary_sensor: string[] }}
     */
    getSensorLines() {
        return {
            sensor: this.sensorLines,
            text_sensor: this.textSensorLines,
            binary_sensor: this.binarySensorLines
        };
    }

    /**
     * Generate complete YAML sections for bindings
     * @param {Object[]} controls - Array of control instances with their definitions
     * @param {boolean} isLvgl
     * @returns {string[]} YAML lines
     */
    generateBindingYaml(controls, isLvgl = true) {
        this.reset();
        const lines = [];
        
        // Process all controls
        for (const { instance, definition } of controls) {
            const parameterValues = instance.parameterValues || {};
            
            // Get bindings from definition or generate defaults
            const readBindings = definition.readBindings || 
                this._getDefaultReadBindings(definition, parameterValues);
            const writeBindings = definition.writeBindings ||
                this._getDefaultWriteBindings(definition, parameterValues);
            
            // Process bindings
            this.processReadBindings(readBindings, parameterValues, instance.id, isLvgl);
            
            // Write bindings are handled per-widget in the LVGL export
        }
        
        // Generate sensor sections
        const sensors = this.getSensorLines();
        
        if (sensors.sensor.length > 0) {
            lines.push('sensor:');
            lines.push(...sensors.sensor.map(l => '  ' + l));
        }
        
        if (sensors.text_sensor.length > 0) {
            lines.push('text_sensor:');
            lines.push(...sensors.text_sensor.map(l => '  ' + l));
        }
        
        if (sensors.binary_sensor.length > 0) {
            lines.push('binary_sensor:');
            lines.push(...sensors.binary_sensor.map(l => '  ' + l));
        }
        
        return lines;
    }

    /**
     * Get default read bindings using domain adapters
     * @private
     */
    _getDefaultReadBindings(definition, parameterValues) {
        // Find entity parameter
        const entityParam = definition.parameters?.find(p => p.type === 'entity');
        if (!entityParam) return [];
        
        const entityId = parameterValues[entityParam.id];
        if (!entityId) return [];
        
        // Use domain adapter to get default bindings
        const { domainAdapterRegistry } = require('../ha/domain_adapters/index.js');
        const entity = {
            entity_id: entityId,
            state: 'unknown',
            attributes: {}
        };
        
        return domainAdapterRegistry.getDefaultReadBindings(entity);
    }

    /**
     * Get default write bindings using domain adapters
     * @private
     */
    _getDefaultWriteBindings(definition, parameterValues) {
        const entityParam = definition.parameters?.find(p => p.type === 'entity');
        if (!entityParam) return [];
        
        const entityId = parameterValues[entityParam.id];
        if (!entityId) return [];
        
        const { domainAdapterRegistry } = require('../ha/domain_adapters/index.js');
        const entity = {
            entity_id: entityId,
            state: 'unknown',
            attributes: {}
        };
        
        return domainAdapterRegistry.getDefaultWriteBindings(entity);
    }
}

// Export singleton
export const bindingYamlGenerator = new BindingYamlGenerator();
export default bindingYamlGenerator;
