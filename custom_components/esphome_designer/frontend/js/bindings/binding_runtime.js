/**
 * @file binding_runtime.js
 * @description Runtime for evaluating bindings at design time.
 * Provides live preview of entity state bindings in the designer.
 */

import { applyTransform } from './transforms.js';
import { AppState } from '../core/state.js';
import { domainAdapterRegistry } from '../ha/domain_adapters/index.js';
import { Logger } from '../utils/logger.js';

/**
 * Binding Runtime - Evaluates bindings for live preview
 */
export class BindingRuntime {
    constructor() {
        /** @type {Map<string, Function>} Cleanup functions for subscriptions */
        this._subscriptions = new Map();
        
        /** @type {Map<string, any>} Cache of entity states */
        this._stateCache = new Map();
        
        /** @type {Set<string>} Entity IDs we're watching */
        this._watchedEntities = new Set();
        
        /** @type {boolean} Whether the runtime is active */
        this._active = false;
    }

    /**
     * Start the binding runtime
     */
    start() {
        if (this._active) return;
        this._active = true;
        Logger.log('[BindingRuntime] Started');
        
        // Initial state sync
        this._syncEntityStates();
        
        // Set up polling for entity state updates
        this._pollInterval = setInterval(() => {
            this._syncEntityStates();
        }, 5000); // Poll every 5 seconds
    }

    /**
     * Stop the binding runtime
     */
    stop() {
        if (!this._active) return;
        this._active = false;
        
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
        
        this._subscriptions.clear();
        this._stateCache.clear();
        this._watchedEntities.clear();
        
        Logger.log('[BindingRuntime] Stopped');
    }

    /**
     * Sync entity states from AppState
     * @private
     */
    _syncEntityStates() {
        const entityStates = AppState?.entityStates || window.AppState?.entityStates || {};
        
        for (const [entityId, state] of Object.entries(entityStates)) {
            this._stateCache.set(entityId, state);
        }
    }

    /**
     * Get the current state of an entity
     * @param {string} entityId
     * @returns {Object|null}
     */
    getEntityState(entityId) {
        // First check cache
        if (this._stateCache.has(entityId)) {
            return this._stateCache.get(entityId);
        }
        
        // Fall back to AppState
        const entityStates = AppState?.entityStates || window.AppState?.entityStates || {};
        return entityStates[entityId] || null;
    }

    /**
     * Evaluate a read binding and return the transformed value
     * @param {import("../types.js").ReadBinding} binding - The read binding
     * @param {Object} parameterValues - Parameter values for the control
     * @returns {{ value: any, available: boolean, placeholder?: string }}
     */
    evaluateReadBinding(binding, parameterValues = {}) {
        // Get entity ID from parameter
        const entityId = parameterValues[binding.entityParam];
        if (!entityId) {
            return { value: null, available: false, placeholder: 'No entity' };
        }

        // Get entity state
        const entityState = this.getEntityState(entityId);
        if (!entityState) {
            return { value: null, available: false, placeholder: binding.availability?.placeholderText || '--' };
        }

        // Check availability
        if (entityState.state === 'unavailable') {
            const policy = binding.availability?.onUnavailable || 'show_placeholder';
            if (policy === 'show_placeholder') {
                return { 
                    value: null, 
                    available: false, 
                    placeholder: binding.availability?.placeholderText || '--' 
                };
            } else if (policy === 'hide') {
                return { value: null, available: false, hidden: true };
            }
            // 'show_last' - continue with last known value
        }

        if (entityState.state === 'unknown') {
            const policy = binding.availability?.onUnknown || 'show_placeholder';
            if (policy === 'show_placeholder') {
                return { 
                    value: null, 
                    available: false, 
                    placeholder: binding.availability?.placeholderText || '?' 
                };
            } else if (policy === 'hide') {
                return { value: null, available: false, hidden: true };
            }
        }

        // Get the value (state or attribute)
        let value;
        if (binding.attribute) {
            value = entityState.attributes?.[binding.attribute];
        } else {
            value = entityState.state;
        }

        // Apply transform
        if (binding.transform && binding.transform !== 'identity') {
            value = applyTransform(binding.transform, value, binding.transformConfig || {});
        }

        return { value, available: true };
    }

    /**
     * Evaluate all read bindings for a widget/control
     * @param {import("../types.js").ReadBinding[]} bindings
     * @param {Object} parameterValues
     * @returns {Object} Map of targetProperty -> value
     */
    evaluateAllReadBindings(bindings, parameterValues = {}) {
        const results = {};
        
        for (const binding of bindings || []) {
            const result = this.evaluateReadBinding(binding, parameterValues);
            
            // Parse the target property path (e.g., "props.text" -> ["props", "text"])
            const path = binding.targetProperty.split('.');
            
            // Set the value at the path
            let current = results;
            for (let i = 0; i < path.length - 1; i++) {
                if (!current[path[i]]) {
                    current[path[i]] = {};
                }
                current = current[path[i]];
            }
            
            if (result.hidden) {
                current[path[path.length - 1]] = { __hidden: true };
            } else if (!result.available) {
                current[path[path.length - 1]] = result.placeholder;
            } else {
                current[path[path.length - 1]] = result.value;
            }
        }
        
        return results;
    }

    /**
     * Get display information for an entity using domain adapters
     * @param {string} entityId
     * @returns {Object|null} Display info { text, icon, color }
     */
    getEntityDisplay(entityId) {
        const entityState = this.getEntityState(entityId);
        if (!entityState) return null;
        
        const entity = {
            entity_id: entityId,
            state: entityState.state,
            attributes: entityState.attributes || {}
        };
        
        return domainAdapterRegistry.getStateDisplay(entity);
    }

    /**
     * Check if an entity is available
     * @param {string} entityId
     * @returns {boolean}
     */
    isEntityAvailable(entityId) {
        const state = this.getEntityState(entityId);
        return state && state.state !== 'unavailable' && state.state !== 'unknown';
    }

    /**
     * Get capabilities for an entity
     * @param {string} entityId
     * @returns {Object|null}
     */
    getEntityCapabilities(entityId) {
        const entityState = this.getEntityState(entityId);
        if (!entityState) return null;
        
        const entity = {
            entity_id: entityId,
            state: entityState.state,
            attributes: entityState.attributes || {}
        };
        
        return domainAdapterRegistry.extractCapabilities(entity);
    }

    /**
     * Subscribe to entity state changes
     * @param {string} entityId
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(entityId, callback) {
        this._watchedEntities.add(entityId);
        
        const key = `${entityId}_${Date.now()}`;
        this._subscriptions.set(key, callback);
        
        // Immediately call with current state
        const state = this.getEntityState(entityId);
        if (state) {
            callback(state);
        }
        
        return () => {
            this._subscriptions.delete(key);
        };
    }

    /**
     * Notify subscribers of state changes
     * @param {string} entityId
     * @param {Object} state
     * @private
     */
    _notifySubscribers(entityId, state) {
        for (const [key, callback] of this._subscriptions) {
            if (key.startsWith(entityId + '_')) {
                try {
                    callback(state);
                } catch (e) {
                    Logger.error('[BindingRuntime] Subscriber error:', e);
                }
            }
        }
    }

    /**
     * Simulate a write binding action (for preview/testing)
     * @param {import("../types.js").WriteBinding} binding
     * @param {Object} parameterValues
     * @param {Object} [eventData] - Additional data from the triggering event
     * @returns {Object} The service call that would be made
     */
    simulateWriteBinding(binding, parameterValues = {}, eventData = {}) {
        const entityId = parameterValues[binding.entityParam];
        
        // Build the service call payload
        const payload = {
            entity_id: entityId,
            ...binding.staticPayload
        };
        
        // Add dynamic payload values
        if (binding.dynamicPayload) {
            for (const [propPath, serviceField] of Object.entries(binding.dynamicPayload)) {
                // Get value from eventData or parameterValues
                const value = this._getValueFromPath(eventData, propPath) || 
                              this._getValueFromPath(parameterValues, propPath);
                if (value !== undefined) {
                    payload[serviceField] = value;
                }
            }
        }
        
        return {
            service: binding.service,
            data: payload,
            confirm: binding.confirmPrompt,
            debounce: binding.debounce,
            debounceMs: binding.debounceMs
        };
    }

    /**
     * Get a value from an object using a dot-notation path
     * @private
     */
    _getValueFromPath(obj, path) {
        if (!obj || !path) return undefined;
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }
}

// Export singleton instance
export const bindingRuntime = new BindingRuntime();
export default bindingRuntime;
