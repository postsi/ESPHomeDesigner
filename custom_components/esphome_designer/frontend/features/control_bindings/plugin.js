/**
 * Control Bindings Plugin
 * Handles export of control bindings to ESPHome YAML.
 * This plugin integrates the binding system with the YAML export process.
 */

import { controlRegistry } from '../../js/controls/control_registry.js';
import { bindingYamlGenerator } from '../../js/bindings/binding_yaml_generator.js';
import { controlYamlExporter } from '../../js/bindings/control_yaml_exporter.js';
import { domainAdapterRegistry } from '../../js/ha/domain_adapters/index.js';
import { Logger } from '../../js/utils/logger.js';

/**
 * Collect all control instances from widgets
 * Controls are widgets that have readBindings or writeBindings defined
 */
function collectControlInstances(widgets) {
    const controls = [];
    
    for (const widget of widgets || []) {
        // Check if widget has bindings
        if (widget.readBindings || widget.writeBindings) {
            // This is a control-enabled widget
            const definition = controlRegistry.get(widget.controlId) || {
                id: widget.controlId || widget.type,
                name: widget.type,
                parameters: [],
                template: null
            };
            
            controls.push({
                instance: {
                    id: widget.id,
                    controlId: widget.controlId || widget.type,
                    x: widget.x,
                    y: widget.y,
                    width: widget.width || widget.w,
                    height: widget.height || widget.h,
                    parameterValues: widget.parameterValues || {}
                },
                definition,
                widget
            });
        }
        
        // Also check for entity_id which indicates HA binding
        if (widget.entity_id && !widget.readBindings) {
            // Auto-generate bindings based on entity domain
            const entityId = (widget.entity_id || '').trim();
            if (!entityId || !entityId.includes('.')) continue;
            
            const domain = entityId.split('.')[0];
            
            // Get adapter for this domain
            const entity = { entity_id: entityId, state: 'unknown', attributes: {} };
            const adapter = domainAdapterRegistry.getForEntity(entity);
            
            if (adapter) {
                const capabilities = adapter.extractCapabilities(entity);
                const readBindings = adapter.getDefaultReadBindings(capabilities);
                const writeBindings = adapter.getDefaultWriteBindings(capabilities);
                
                // Create a pseudo-control for this widget
                controls.push({
                    instance: {
                        id: widget.id,
                        controlId: `auto_${domain}`,
                        x: widget.x,
                        y: widget.y,
                        width: widget.width || widget.w,
                        height: widget.height || widget.h,
                        parameterValues: {
                            [`${domain}_entity`]: entityId
                        }
                    },
                    definition: {
                        id: `auto_${domain}`,
                        name: `Auto ${domain}`,
                        parameters: adapter.getParameters(capabilities),
                        readBindings,
                        writeBindings
                    },
                    widget
                });
            }
        }
    }
    
    return controls;
}

/**
 * Export hook for numeric sensors
 * Registers HA sensors needed for control bindings
 */
function onExportNumericSensors(context) {
    const { widgets, lines, seenEntityIds, seenSensorIds, isLvgl, pendingTriggers } = context;
    
    const controls = collectControlInstances(widgets);
    
    for (const { instance, definition, widget } of controls) {
        const parameterValues = instance.parameterValues || {};
        
        // Process read bindings
        const readBindings = definition.readBindings || [];
        
        for (const binding of readBindings) {
            const entityId = parameterValues[binding.entityParam];
            if (!entityId) continue;
            
            // Skip non-numeric sensors
            const domain = entityId.split('.')[0];
            const numericDomains = ['sensor', 'number', 'input_number', 'counter'];
            if (!numericDomains.includes(domain) && !entityId.startsWith('sensor.')) continue;
            
            // Skip if already registered
            if (seenEntityIds && seenEntityIds.has(entityId)) continue;
            
            const safeId = bindingYamlGenerator.toSafeId(entityId);
            if (seenSensorIds && seenSensorIds.has(safeId)) continue;
            
            // Register the sensor
            if (seenEntityIds) seenEntityIds.add(entityId);
            if (seenSensorIds) seenSensorIds.add(safeId);
            
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entityId}`);
            if (binding.attribute) {
                lines.push(`  attribute: ${binding.attribute}`);
            }
            lines.push(`  internal: true`);
            
            // Add refresh trigger for LVGL
            if (isLvgl && pendingTriggers) {
                if (!pendingTriggers.has(entityId)) {
                    pendingTriggers.set(entityId, new Set());
                }
                pendingTriggers.get(entityId).add(`- lvgl.widget.update:\n    id: ${widget.id}`);
            }
        }
    }
}

/**
 * Export hook for text sensors
 */
function onExportTextSensors(context) {
    const { widgets, lines, seenEntityIds, seenSensorIds, isLvgl, pendingTriggers } = context;
    
    const controls = collectControlInstances(widgets);
    
    for (const { instance, definition, widget } of controls) {
        const parameterValues = instance.parameterValues || {};
        const readBindings = definition.readBindings || [];
        
        for (const binding of readBindings) {
            const entityId = parameterValues[binding.entityParam];
            if (!entityId) continue;
            
            // Only text-type sensors
            const domain = entityId.split('.')[0];
            const textDomains = ['input_text', 'text', 'weather', 'person', 'zone', 'device_tracker'];
            if (!textDomains.includes(domain)) continue;
            
            if (seenEntityIds && seenEntityIds.has(entityId)) continue;
            
            const safeId = bindingYamlGenerator.toSafeId(entityId);
            if (seenSensorIds && seenSensorIds.has(safeId)) continue;
            
            if (seenEntityIds) seenEntityIds.add(entityId);
            if (seenSensorIds) seenSensorIds.add(safeId);
            
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entityId}`);
            if (binding.attribute) {
                lines.push(`  attribute: ${binding.attribute}`);
            }
            lines.push(`  internal: true`);
            
            if (isLvgl && pendingTriggers) {
                if (!pendingTriggers.has(entityId)) {
                    pendingTriggers.set(entityId, new Set());
                }
                pendingTriggers.get(entityId).add(`- lvgl.widget.update:\n    id: ${widget.id}`);
            }
        }
    }
}

/**
 * Export hook for binary sensors
 */
function onExportBinarySensors(context) {
    const { widgets, lines, seenEntityIds, seenSensorIds, isLvgl, pendingTriggers } = context;
    
    const controls = collectControlInstances(widgets);
    
    for (const { instance, definition, widget } of controls) {
        const parameterValues = instance.parameterValues || {};
        const readBindings = definition.readBindings || [];
        
        for (const binding of readBindings) {
            const entityId = parameterValues[binding.entityParam];
            if (!entityId) continue;
            
            // Only binary-type sensors
            const domain = entityId.split('.')[0];
            const binaryDomains = ['binary_sensor', 'switch', 'light', 'fan', 'input_boolean', 'lock', 'cover'];
            if (!binaryDomains.includes(domain)) continue;
            
            if (seenEntityIds && seenEntityIds.has(entityId)) continue;
            
            const safeId = bindingYamlGenerator.toSafeId(entityId);
            if (seenSensorIds && seenSensorIds.has(safeId)) continue;
            
            if (seenEntityIds) seenEntityIds.add(entityId);
            if (seenSensorIds) seenSensorIds.add(safeId);
            
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  internal: true`);
            
            if (isLvgl && pendingTriggers) {
                if (!pendingTriggers.has(entityId)) {
                    pendingTriggers.set(entityId, new Set());
                }
                pendingTriggers.get(entityId).add(`- lvgl.widget.update:\n    id: ${widget.id}`);
            }
        }
    }
}

/**
 * Export hook for globals (if controls need global variables)
 */
function onExportGlobals(context) {
    const { widgets, lines } = context;
    
    const controls = collectControlInstances(widgets);
    
    // Add any global variables needed for debouncing, etc.
    for (const { instance, definition } of controls) {
        const writeBindings = definition.writeBindings || [];
        
        for (const binding of writeBindings) {
            if (binding.debounce && binding.debounceMs > 0) {
                // Add a debounce timer global if needed
                const timerId = `debounce_${instance.id}_${binding.event}`;
                lines.push(`- id: ${timerId}`);
                lines.push(`  type: uint32_t`);
                lines.push(`  restore_value: false`);
                lines.push(`  initial_value: '0'`);
            }
        }
    }
}

export default {
    id: 'control_bindings',
    name: 'Control Bindings',
    category: 'System',
    
    // This is a system plugin, not a widget
    isSystemPlugin: true,
    
    // Export hooks
    onExportNumericSensors,
    onExportTextSensors,
    onExportBinarySensors,
    onExportGlobals,
    
    // Utility exports for other plugins
    collectControlInstances,
    controlYamlExporter
};
