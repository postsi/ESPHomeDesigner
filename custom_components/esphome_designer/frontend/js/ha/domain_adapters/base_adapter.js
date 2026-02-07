/**
 * @file base_adapter.js
 * @description Base class for Home Assistant domain adapters.
 * Domain adapters provide domain-specific logic for extracting capabilities,
 * generating parameters, and creating default bindings for HA entities.
 */

import { generateId } from '../../utils/helpers.js';

/**
 * Base domain adapter class.
 * Extend this class to create adapters for specific HA domains.
 */
export class BaseDomainAdapter {
    /**
     * @param {Object} config - Adapter configuration
     * @param {string} config.domain - HA domain (e.g., "climate", "light")
     * @param {string} config.name - Display name for the domain
     * @param {string} config.icon - Default MDI icon for the domain
     * @param {string[]} [config.aliases] - Alternative domain names
     */
    constructor(config) {
        this.domain = config.domain;
        this.name = config.name;
        this.icon = config.icon;
        this.aliases = config.aliases || [];
    }

    /**
     * Checks if this adapter handles the given entity
     * @param {Object} entity - HA entity object
     * @returns {boolean}
     */
    handles(entity) {
        if (!entity || !entity.entity_id) return false;
        const entityDomain = entity.entity_id.split('.')[0];
        return entityDomain === this.domain || this.aliases.includes(entityDomain);
    }

    /**
     * Extracts capabilities from an entity's attributes and state
     * @param {Object} entity - HA entity object with state and attributes
     * @returns {Object} Capabilities object
     */
    extractCapabilities(entity) {
        return {
            domain: this.domain,
            entityId: entity.entity_id,
            friendlyName: entity.attributes?.friendly_name || entity.entity_id,
            available: entity.state !== 'unavailable',
            supported: true
        };
    }

    /**
     * Gets the default parameters for controls bound to this domain
     * @param {Object} capabilities - Extracted capabilities
     * @returns {import("../../types.js").ControlParameter[]}
     */
    getParameters(capabilities) {
        return [
            {
                id: `${this.domain}_entity`,
                name: `${this.name} Entity`,
                type: 'entity',
                required: true,
                description: `Select a ${this.name.toLowerCase()} entity`,
                domainConstraint: {
                    domains: [this.domain, ...this.aliases]
                }
            }
        ];
    }

    /**
     * Gets default read bindings for this domain
     * @param {Object} capabilities - Extracted capabilities
     * @returns {import("../../types.js").ReadBinding[]}
     */
    getDefaultReadBindings(capabilities) {
        return [
            {
                id: generateId(),
                entityParam: `${this.domain}_entity`,
                targetProperty: 'props.state',
                transform: 'identity'
            }
        ];
    }

    /**
     * Gets default write bindings for this domain
     * @param {Object} capabilities - Extracted capabilities
     * @returns {import("../../types.js").WriteBinding[]}
     */
    getDefaultWriteBindings(capabilities) {
        return [];
    }

    /**
     * Gets the state display configuration
     * @param {Object} entity - HA entity
     * @returns {Object} Display configuration
     */
    getStateDisplay(entity) {
        return {
            text: entity.state,
            icon: this.icon,
            color: null
        };
    }

    /**
     * Gets available services for this domain
     * @returns {Object[]} Array of service definitions
     */
    getServices() {
        return [];
    }

    /**
     * Creates a ReadBinding helper
     * @protected
     */
    _createReadBinding(entityParam, targetProperty, options = {}) {
        return {
            id: generateId(),
            entityParam,
            attribute: options.attribute || null,
            targetProperty,
            transform: options.transform || 'identity',
            transformConfig: options.transformConfig || null,
            availability: options.availability || {
                onUnavailable: 'show_placeholder',
                onUnknown: 'show_placeholder',
                placeholderText: '--'
            }
        };
    }

    /**
     * Creates a WriteBinding helper
     * @protected
     */
    _createWriteBinding(event, service, entityParam, options = {}) {
        return {
            id: generateId(),
            event,
            service,
            entityParam,
            staticPayload: options.staticPayload || {},
            dynamicPayload: options.dynamicPayload || {},
            confirmPrompt: options.confirmPrompt || null,
            debounce: options.debounce !== false,
            debounceMs: options.debounceMs || 500
        };
    }
}
