/**
 * @file control_registry.js
 * @description Central registry for control definitions.
 * Manages both built-in and user-defined controls.
 */

import { BUILTIN_CONTROLS } from './builtin_controls.js';
import { AppState } from '../core/state.js';

/**
 * Control Registry - Manages all available control definitions
 */
class ControlRegistry {
    constructor() {
        /** @type {Map<string, import("../types.js").ControlDefinition>} */
        this._builtins = new Map();
        
        // Register built-in controls
        for (const control of BUILTIN_CONTROLS) {
            this._builtins.set(control.id, control);
        }
    }

    /**
     * Get a control definition by ID
     * @param {string} id - Control ID
     * @returns {import("../types.js").ControlDefinition | undefined}
     */
    get(id) {
        // Check built-ins first
        if (this._builtins.has(id)) {
            return this._builtins.get(id);
        }
        
        // Check project-level custom controls
        const projectControls = AppState?.controls || [];
        return projectControls.find(c => c.id === id);
    }

    /**
     * Get all available control definitions
     * @returns {import("../types.js").ControlDefinition[]}
     */
    getAll() {
        const all = [...this._builtins.values()];
        const projectControls = AppState?.controls || [];
        return [...all, ...projectControls];
    }

    /**
     * Get controls by category
     * @param {string} category
     * @returns {import("../types.js").ControlDefinition[]}
     */
    getByCategory(category) {
        return this.getAll().filter(c => c.category === category);
    }

    /**
     * Get controls by tag
     * @param {string} tag
     * @returns {import("../types.js").ControlDefinition[]}
     */
    getByTag(tag) {
        return this.getAll().filter(c => c.tags?.includes(tag));
    }

    /**
     * Get all unique categories
     * @returns {string[]}
     */
    getCategories() {
        const categories = new Set(this.getAll().map(c => c.category));
        return Array.from(categories).sort();
    }

    /**
     * Get all unique tags
     * @returns {string[]}
     */
    getTags() {
        const tags = new Set();
        for (const control of this.getAll()) {
            for (const tag of control.tags || []) {
                tags.add(tag);
            }
        }
        return Array.from(tags).sort();
    }

    /**
     * Check if a control ID is a built-in
     * @param {string} id
     * @returns {boolean}
     */
    isBuiltin(id) {
        return this._builtins.has(id);
    }

    /**
     * Search controls by name or description
     * @param {string} query
     * @returns {import("../types.js").ControlDefinition[]}
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(c => 
            c.name.toLowerCase().includes(lowerQuery) ||
            c.description?.toLowerCase().includes(lowerQuery) ||
            c.tags?.some(t => t.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Get controls compatible with a domain
     * @param {string} domain - HA domain (e.g., 'climate', 'light')
     * @returns {import("../types.js").ControlDefinition[]}
     */
    getForDomain(domain) {
        return this.getAll().filter(control => {
            // Check if any parameter has a domain constraint matching this domain
            for (const param of control.parameters || []) {
                if (param.domainConstraint?.domains?.includes(domain)) {
                    return true;
                }
            }
            // Also check tags
            return control.tags?.includes(domain);
        });
    }

    /**
     * Register a custom control definition (project-level)
     * @param {import("../types.js").ControlDefinition} definition
     */
    registerCustom(definition) {
        if (!definition.id) {
            throw new Error('Control definition must have an id');
        }
        if (this._builtins.has(definition.id)) {
            throw new Error(`Cannot override built-in control: ${definition.id}`);
        }
        
        // Add to AppState controls
        AppState.addControl(definition);
    }

    /**
     * Update a custom control definition
     * @param {string} id
     * @param {Partial<import("../types.js").ControlDefinition>} updates
     */
    updateCustom(id, updates) {
        if (this._builtins.has(id)) {
            throw new Error(`Cannot modify built-in control: ${id}`);
        }
        AppState.updateControl(id, updates);
    }

    /**
     * Delete a custom control definition
     * @param {string} id
     */
    deleteCustom(id) {
        if (this._builtins.has(id)) {
            throw new Error(`Cannot delete built-in control: ${id}`);
        }
        AppState.deleteControl(id);
    }

    /**
     * Export a control definition to JSON
     * @param {string} id
     * @returns {string}
     */
    exportToJson(id) {
        const control = this.get(id);
        if (!control) {
            throw new Error(`Control not found: ${id}`);
        }
        return JSON.stringify(control, null, 2);
    }

    /**
     * Import a control definition from JSON
     * @param {string} json
     * @returns {import("../types.js").ControlDefinition}
     */
    importFromJson(json) {
        const definition = JSON.parse(json);
        
        // Validate required fields
        if (!definition.id || !definition.name || !definition.parameters) {
            throw new Error('Invalid control definition: missing required fields');
        }
        
        // Generate new ID to avoid conflicts
        definition.id = `imported_${definition.id}_${Date.now()}`;
        
        this.registerCustom(definition);
        return definition;
    }
}

// Export singleton instance
export const controlRegistry = new ControlRegistry();
export default controlRegistry;
