/**
 * @file index.js
 * @description Domain Adapter Registry - Central registry for all Home Assistant domain adapters.
 * Provides lookup, registration, and fallback handling for entity types.
 */

import { BaseDomainAdapter } from './base_adapter.js';
import climateAdapter from './climate_adapter.js';
import lightAdapter from './light_adapter.js';
import switchAdapter from './switch_adapter.js';
import coverAdapter from './cover_adapter.js';
import fanAdapter from './fan_adapter.js';
import sensorAdapter from './sensor_adapter.js';
import mediaPlayerAdapter from './media_player_adapter.js';
import lockAdapter from './lock_adapter.js';
import sceneAdapter from './scene_adapter.js';

/**
 * Generic fallback adapter for unsupported domains
 */
class GenericAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: '_generic',
            name: 'Generic Entity',
            icon: 'mdi:help-circle'
        });
    }

    handles(entity) {
        // Handles anything as fallback
        return true;
    }

    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const domain = entity.entity_id?.split('.')[0] || 'unknown';
        
        return {
            ...base,
            domain,
            isGeneric: true,
            hasToggle: ['switch', 'light', 'fan', 'input_boolean'].includes(domain),
            isReadOnly: ['sensor', 'binary_sensor', 'weather', 'sun', 'zone'].includes(domain)
        };
    }

    getParameters(capabilities) {
        return [
            {
                id: 'entity',
                name: 'Entity',
                type: 'entity',
                required: true,
                description: 'Select an entity'
            }
        ];
    }

    getDefaultReadBindings(capabilities) {
        return [
            this._createReadBinding('entity', 'props.state', {
                transform: 'identity'
            })
        ];
    }

    getDefaultWriteBindings(capabilities) {
        // For toggle-able entities, provide basic toggle
        if (capabilities?.hasToggle) {
            const domain = capabilities.domain;
            return [
                this._createWriteBinding('on_click', `${domain}.toggle`, 'entity', {
                    debounce: false
                })
            ];
        }
        return [];
    }
}

const genericAdapter = new GenericAdapter();

/**
 * Domain Adapter Registry
 * Manages registration and lookup of domain adapters
 */
class DomainAdapterRegistry {
    constructor() {
        /** @type {Map<string, BaseDomainAdapter>} */
        this.adapters = new Map();
        
        /** @type {BaseDomainAdapter} */
        this.fallbackAdapter = genericAdapter;
        
        // Register built-in adapters
        this._registerBuiltins();
    }

    /**
     * Register built-in adapters
     * @private
     */
    _registerBuiltins() {
        this.register(climateAdapter);
        this.register(lightAdapter);
        this.register(switchAdapter);
        this.register(coverAdapter);
        this.register(fanAdapter);
        this.register(sensorAdapter);
        this.register(mediaPlayerAdapter);
        this.register(lockAdapter);
        this.register(sceneAdapter);
    }

    /**
     * Register a domain adapter
     * @param {BaseDomainAdapter} adapter - The adapter to register
     */
    register(adapter) {
        if (!(adapter instanceof BaseDomainAdapter)) {
            console.warn('DomainAdapterRegistry: Invalid adapter, must extend BaseDomainAdapter');
            return;
        }
        
        this.adapters.set(adapter.domain, adapter);
        
        // Also register aliases
        for (const alias of adapter.aliases || []) {
            this.adapters.set(alias, adapter);
        }
    }

    /**
     * Unregister a domain adapter
     * @param {string} domain - The domain to unregister
     */
    unregister(domain) {
        const adapter = this.adapters.get(domain);
        if (adapter) {
            this.adapters.delete(domain);
            // Also remove aliases
            for (const alias of adapter.aliases || []) {
                this.adapters.delete(alias);
            }
        }
    }

    /**
     * Get adapter for a domain
     * @param {string} domain - The HA domain (e.g., "climate", "light")
     * @returns {BaseDomainAdapter}
     */
    getByDomain(domain) {
        return this.adapters.get(domain) || this.fallbackAdapter;
    }

    /**
     * Get adapter for an entity
     * @param {Object} entity - HA entity object
     * @returns {BaseDomainAdapter}
     */
    getForEntity(entity) {
        if (!entity || !entity.entity_id) {
            return this.fallbackAdapter;
        }
        
        const domain = entity.entity_id.split('.')[0];
        
        // First try direct domain lookup
        const adapter = this.adapters.get(domain);
        if (adapter) {
            return adapter;
        }
        
        // Then try to find an adapter that handles this entity
        for (const [, adp] of this.adapters) {
            if (adp.handles(entity)) {
                return adp;
            }
        }
        
        return this.fallbackAdapter;
    }

    /**
     * Get all registered adapters
     * @returns {BaseDomainAdapter[]}
     */
    getAll() {
        // Return unique adapters (filter out aliases)
        const seen = new Set();
        const result = [];
        
        for (const [domain, adapter] of this.adapters) {
            if (!seen.has(adapter.domain)) {
                seen.add(adapter.domain);
                result.push(adapter);
            }
        }
        
        return result;
    }

    /**
     * Get all supported domains
     * @returns {string[]}
     */
    getSupportedDomains() {
        const domains = new Set();
        for (const adapter of this.getAll()) {
            domains.add(adapter.domain);
            for (const alias of adapter.aliases || []) {
                domains.add(alias);
            }
        }
        return Array.from(domains).sort();
    }

    /**
     * Check if a domain is supported (has a dedicated adapter)
     * @param {string} domain 
     * @returns {boolean}
     */
    isSupported(domain) {
        return this.adapters.has(domain);
    }

    /**
     * Extract capabilities for an entity
     * @param {Object} entity - HA entity
     * @returns {Object} Capabilities object
     */
    extractCapabilities(entity) {
        const adapter = this.getForEntity(entity);
        return adapter.extractCapabilities(entity);
    }

    /**
     * Get parameters for an entity
     * @param {Object} entity - HA entity
     * @returns {import("../../types.js").ControlParameter[]}
     */
    getParameters(entity) {
        const adapter = this.getForEntity(entity);
        const capabilities = adapter.extractCapabilities(entity);
        return adapter.getParameters(capabilities);
    }

    /**
     * Get default read bindings for an entity
     * @param {Object} entity - HA entity
     * @returns {import("../../types.js").ReadBinding[]}
     */
    getDefaultReadBindings(entity) {
        const adapter = this.getForEntity(entity);
        const capabilities = adapter.extractCapabilities(entity);
        return adapter.getDefaultReadBindings(capabilities);
    }

    /**
     * Get default write bindings for an entity
     * @param {Object} entity - HA entity
     * @returns {import("../../types.js").WriteBinding[]}
     */
    getDefaultWriteBindings(entity) {
        const adapter = this.getForEntity(entity);
        const capabilities = adapter.extractCapabilities(entity);
        return adapter.getDefaultWriteBindings(capabilities);
    }

    /**
     * Get state display for an entity
     * @param {Object} entity - HA entity
     * @returns {Object} Display configuration { text, icon, color }
     */
    getStateDisplay(entity) {
        const adapter = this.getForEntity(entity);
        return adapter.getStateDisplay(entity);
    }

    /**
     * Get available services for an entity
     * @param {Object} entity - HA entity
     * @returns {Object[]} Service definitions
     */
    getServices(entity) {
        const adapter = this.getForEntity(entity);
        return adapter.getServices();
    }
}

// Export singleton instance
export const domainAdapterRegistry = new DomainAdapterRegistry();

// Also export classes for extension
export { BaseDomainAdapter };
export { GenericAdapter };

// Export individual adapters for direct use if needed
export { 
    climateAdapter,
    lightAdapter,
    switchAdapter,
    coverAdapter,
    fanAdapter,
    sensorAdapter,
    mediaPlayerAdapter,
    lockAdapter,
    sceneAdapter
};

export default domainAdapterRegistry;
