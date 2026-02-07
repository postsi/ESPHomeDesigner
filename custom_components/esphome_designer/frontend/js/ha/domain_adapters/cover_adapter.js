/**
 * @file cover_adapter.js
 * @description Domain adapter for Home Assistant cover entities.
 * Handles blinds, shades, garage doors, and other cover devices.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Cover domain feature flags (from HA CoverEntityFeature)
 */
export const COVER_FEATURES = {
    OPEN: 1,
    CLOSE: 2,
    SET_POSITION: 4,
    STOP: 8,
    OPEN_TILT: 16,
    CLOSE_TILT: 32,
    STOP_TILT: 64,
    SET_TILT_POSITION: 128
};

/**
 * Cover device classes
 */
export const COVER_DEVICE_CLASSES = {
    AWNING: 'awning',
    BLIND: 'blind',
    CURTAIN: 'curtain',
    DAMPER: 'damper',
    DOOR: 'door',
    GARAGE: 'garage',
    GATE: 'gate',
    SHADE: 'shade',
    SHUTTER: 'shutter',
    WINDOW: 'window'
};

/**
 * Cover domain adapter
 */
export class CoverAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'cover',
            name: 'Cover',
            icon: 'mdi:window-shutter'
        });
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};
        const supportedFeatures = attrs.supported_features || 0;

        return {
            ...base,
            // Current state
            state: entity.state, // open, closed, opening, closing
            isOpen: entity.state === 'open',
            isClosed: entity.state === 'closed',
            isOpening: entity.state === 'opening',
            isClosing: entity.state === 'closing',
            
            // Position (0 = closed, 100 = open)
            position: attrs.current_position,
            tiltPosition: attrs.current_tilt_position,
            
            // Device class
            deviceClass: attrs.device_class,
            
            // Feature flags
            supportsOpen: !!(supportedFeatures & COVER_FEATURES.OPEN),
            supportsClose: !!(supportedFeatures & COVER_FEATURES.CLOSE),
            supportsSetPosition: !!(supportedFeatures & COVER_FEATURES.SET_POSITION),
            supportsStop: !!(supportedFeatures & COVER_FEATURES.STOP),
            supportsOpenTilt: !!(supportedFeatures & COVER_FEATURES.OPEN_TILT),
            supportsCloseTilt: !!(supportedFeatures & COVER_FEATURES.CLOSE_TILT),
            supportsStopTilt: !!(supportedFeatures & COVER_FEATURES.STOP_TILT),
            supportsSetTiltPosition: !!(supportedFeatures & COVER_FEATURES.SET_TILT_POSITION),
            
            // Derived
            supportsTilt: !!(supportedFeatures & (COVER_FEATURES.OPEN_TILT | COVER_FEATURES.CLOSE_TILT | COVER_FEATURES.SET_TILT_POSITION))
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'cover_entity',
                name: 'Cover Entity',
                type: 'entity',
                required: true,
                description: 'Select a cover entity (blind, shade, garage, etc.)',
                domainConstraint: {
                    domains: ['cover']
                }
            },
            {
                id: 'show_position',
                name: 'Show Position',
                type: 'boolean',
                defaultValue: capabilities?.supportsSetPosition || false,
                description: 'Display position slider'
            },
            {
                id: 'show_stop',
                name: 'Show Stop Button',
                type: 'boolean',
                defaultValue: capabilities?.supportsStop || false,
                description: 'Display stop button'
            }
        ];

        if (capabilities?.supportsTilt) {
            params.push({
                id: 'show_tilt',
                name: 'Show Tilt Control',
                type: 'boolean',
                defaultValue: false,
                description: 'Display tilt position control'
            });
        }

        params.push({
            id: 'open_color',
            name: 'Open Color',
            type: 'color',
            defaultValue: '#4caf50',
            description: 'Color when cover is open'
        });

        params.push({
            id: 'closed_color',
            name: 'Closed Color',
            type: 'color',
            defaultValue: '#424242',
            description: 'Color when cover is closed'
        });

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'cover_entity';

        // State
        bindings.push(this._createReadBinding(entityParam, 'props.state', {
            transform: 'identity'
        }));

        // Position (if supported)
        if (capabilities?.supportsSetPosition) {
            bindings.push(this._createReadBinding(entityParam, 'props.position', {
                attribute: 'current_position',
                transform: 'identity'
            }));
        }

        // Tilt position (if supported)
        if (capabilities?.supportsSetTiltPosition) {
            bindings.push(this._createReadBinding(entityParam, 'props.tilt_position', {
                attribute: 'current_tilt_position',
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
        const entityParam = 'cover_entity';

        // Open
        bindings.push(this._createWriteBinding('on_open', 'cover.open_cover', entityParam, {
            debounce: false
        }));

        // Close
        bindings.push(this._createWriteBinding('on_close', 'cover.close_cover', entityParam, {
            debounce: false
        }));

        // Stop
        if (capabilities?.supportsStop) {
            bindings.push(this._createWriteBinding('on_stop', 'cover.stop_cover', entityParam, {
                debounce: false
            }));
        }

        // Set position
        if (capabilities?.supportsSetPosition) {
            bindings.push(this._createWriteBinding('on_position_change', 'cover.set_cover_position', entityParam, {
                dynamicPayload: {
                    'props.position': 'position'
                },
                debounce: true,
                debounceMs: 500
            }));
        }

        // Tilt controls
        if (capabilities?.supportsOpenTilt) {
            bindings.push(this._createWriteBinding('on_open_tilt', 'cover.open_cover_tilt', entityParam, {
                debounce: false
            }));
        }

        if (capabilities?.supportsCloseTilt) {
            bindings.push(this._createWriteBinding('on_close_tilt', 'cover.close_cover_tilt', entityParam, {
                debounce: false
            }));
        }

        if (capabilities?.supportsSetTiltPosition) {
            bindings.push(this._createWriteBinding('on_tilt_change', 'cover.set_cover_tilt_position', entityParam, {
                dynamicPayload: {
                    'props.tilt_position': 'tilt_position'
                },
                debounce: true,
                debounceMs: 500
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const attrs = entity.attributes || {};
        const deviceClass = attrs.device_class || 'blind';
        
        let icon;
        let color;
        let text = entity.state;

        // Icon based on device class and state
        switch (deviceClass) {
            case COVER_DEVICE_CLASSES.GARAGE:
                icon = entity.state === 'open' ? 'mdi:garage-open' : 'mdi:garage';
                break;
            case COVER_DEVICE_CLASSES.DOOR:
            case COVER_DEVICE_CLASSES.GATE:
                icon = entity.state === 'open' ? 'mdi:door-open' : 'mdi:door-closed';
                break;
            case COVER_DEVICE_CLASSES.WINDOW:
                icon = entity.state === 'open' ? 'mdi:window-open' : 'mdi:window-closed';
                break;
            case COVER_DEVICE_CLASSES.CURTAIN:
                icon = entity.state === 'open' ? 'mdi:curtains-open' : 'mdi:curtains';
                break;
            default:
                icon = entity.state === 'open' ? 'mdi:window-shutter-open' : 'mdi:window-shutter';
        }

        // Color based on state
        switch (entity.state) {
            case 'open':
                color = '#4caf50';
                break;
            case 'opening':
            case 'closing':
                color = '#ff9800';
                break;
            default:
                color = '#424242';
        }

        // Show position if available
        if (attrs.current_position !== undefined) {
            text = `${attrs.current_position}%`;
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            {
                service: 'cover.open_cover',
                name: 'Open',
                description: 'Open the cover'
            },
            {
                service: 'cover.close_cover',
                name: 'Close',
                description: 'Close the cover'
            },
            {
                service: 'cover.stop_cover',
                name: 'Stop',
                description: 'Stop cover movement'
            },
            {
                service: 'cover.set_cover_position',
                name: 'Set Position',
                description: 'Set cover position (0-100)',
                fields: {
                    position: { type: 'number', min: 0, max: 100, required: true }
                }
            },
            {
                service: 'cover.open_cover_tilt',
                name: 'Open Tilt',
                description: 'Open the cover tilt'
            },
            {
                service: 'cover.close_cover_tilt',
                name: 'Close Tilt',
                description: 'Close the cover tilt'
            },
            {
                service: 'cover.set_cover_tilt_position',
                name: 'Set Tilt Position',
                description: 'Set cover tilt position (0-100)',
                fields: {
                    tilt_position: { type: 'number', min: 0, max: 100, required: true }
                }
            }
        ];
    }
}

export default new CoverAdapter();
