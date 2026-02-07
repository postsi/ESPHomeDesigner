/**
 * @file sensor_adapter.js
 * @description Domain adapter for Home Assistant sensor entities.
 * Handles read-only sensors including temperature, humidity, power, etc.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Common sensor device classes and their icons/units
 */
export const SENSOR_DEVICE_CLASSES = {
    temperature: { icon: 'mdi:thermometer', unit: '°C' },
    humidity: { icon: 'mdi:water-percent', unit: '%' },
    pressure: { icon: 'mdi:gauge', unit: 'hPa' },
    illuminance: { icon: 'mdi:brightness-5', unit: 'lx' },
    power: { icon: 'mdi:flash', unit: 'W' },
    energy: { icon: 'mdi:lightning-bolt', unit: 'kWh' },
    voltage: { icon: 'mdi:sine-wave', unit: 'V' },
    current: { icon: 'mdi:current-ac', unit: 'A' },
    battery: { icon: 'mdi:battery', unit: '%' },
    carbon_dioxide: { icon: 'mdi:molecule-co2', unit: 'ppm' },
    carbon_monoxide: { icon: 'mdi:molecule-co', unit: 'ppm' },
    pm25: { icon: 'mdi:blur', unit: 'µg/m³' },
    pm10: { icon: 'mdi:blur', unit: 'µg/m³' },
    signal_strength: { icon: 'mdi:wifi', unit: 'dBm' },
    timestamp: { icon: 'mdi:clock', unit: '' },
    duration: { icon: 'mdi:timer', unit: 's' },
    distance: { icon: 'mdi:ruler', unit: 'm' },
    speed: { icon: 'mdi:speedometer', unit: 'm/s' },
    weight: { icon: 'mdi:scale', unit: 'kg' },
    monetary: { icon: 'mdi:currency-usd', unit: '' },
    data_rate: { icon: 'mdi:download', unit: 'MB/s' },
    data_size: { icon: 'mdi:database', unit: 'GB' }
};

/**
 * Sensor domain adapter
 */
export class SensorAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'sensor',
            name: 'Sensor',
            icon: 'mdi:eye',
            aliases: ['binary_sensor']
        });
    }

    /**
     * @override
     */
    handles(entity) {
        if (!entity || !entity.entity_id) return false;
        const entityDomain = entity.entity_id.split('.')[0];
        return entityDomain === 'sensor' || entityDomain === 'binary_sensor';
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};
        const entityDomain = entity.entity_id.split('.')[0];
        const isBinary = entityDomain === 'binary_sensor';

        const deviceClass = attrs.device_class;
        const deviceClassInfo = SENSOR_DEVICE_CLASSES[deviceClass] || {};

        return {
            ...base,
            // Value
            state: entity.state,
            numericValue: isBinary ? null : parseFloat(entity.state),
            isNumeric: !isBinary && !isNaN(parseFloat(entity.state)),
            isBinary,
            
            // Binary sensor specific
            isOn: isBinary ? entity.state === 'on' : null,
            
            // Metadata
            deviceClass,
            stateClass: attrs.state_class, // measurement, total, total_increasing
            unitOfMeasurement: attrs.unit_of_measurement || deviceClassInfo.unit || '',
            
            // Display
            icon: attrs.icon || deviceClassInfo.icon || (isBinary ? 'mdi:checkbox-blank-circle' : 'mdi:eye'),
            
            // Statistics (if available)
            lastReset: attrs.last_reset,
            
            // For graphing
            isGraphable: attrs.state_class === 'measurement' || attrs.state_class === 'total'
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'sensor_entity',
                name: 'Sensor Entity',
                type: 'entity',
                required: true,
                description: 'Select a sensor entity',
                domainConstraint: {
                    domains: ['sensor', 'binary_sensor']
                }
            },
            {
                id: 'show_unit',
                name: 'Show Unit',
                type: 'boolean',
                defaultValue: true,
                description: 'Display unit of measurement'
            },
            {
                id: 'show_icon',
                name: 'Show Icon',
                type: 'boolean',
                defaultValue: true,
                description: 'Display sensor icon'
            },
            {
                id: 'decimal_places',
                name: 'Decimal Places',
                type: 'number',
                defaultValue: 1,
                min: 0,
                max: 5,
                step: 1,
                description: 'Number of decimal places for numeric values'
            }
        ];

        // Add graph option for measurement sensors
        if (capabilities?.isGraphable) {
            params.push({
                id: 'show_graph',
                name: 'Show Mini Graph',
                type: 'boolean',
                defaultValue: false,
                description: 'Display a mini sparkline graph'
            });
        }

        // Color options
        params.push({
            id: 'value_color',
            name: 'Value Color',
            type: 'color',
            defaultValue: '#ffffff',
            description: 'Color for the sensor value'
        });

        // For binary sensors
        if (capabilities?.isBinary) {
            params.push({
                id: 'on_color',
                name: 'On Color',
                type: 'color',
                defaultValue: '#4caf50',
                description: 'Color when binary sensor is on'
            });
            params.push({
                id: 'off_color',
                name: 'Off Color',
                type: 'color',
                defaultValue: '#424242',
                description: 'Color when binary sensor is off'
            });
        }

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'sensor_entity';

        // Main value
        if (capabilities?.isBinary) {
            bindings.push(this._createReadBinding(entityParam, 'props.is_on', {
                transform: 'map',
                transformConfig: {
                    map: { 'on': true, 'off': false }
                }
            }));
        } else if (capabilities?.isNumeric) {
            bindings.push(this._createReadBinding(entityParam, 'props.value', {
                transform: 'round',
                transformConfig: {
                    precision: 1
                }
            }));
        } else {
            bindings.push(this._createReadBinding(entityParam, 'props.value', {
                transform: 'identity'
            }));
        }

        // Unit of measurement
        bindings.push(this._createReadBinding(entityParam, 'props.unit', {
            attribute: 'unit_of_measurement',
            transform: 'identity'
        }));

        return bindings;
    }

    /**
     * @override
     * Sensors are read-only, so no write bindings
     */
    getDefaultWriteBindings(capabilities) {
        return [];
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const attrs = entity.attributes || {};
        const entityDomain = entity.entity_id.split('.')[0];
        const isBinary = entityDomain === 'binary_sensor';
        const deviceClass = attrs.device_class;
        const deviceClassInfo = SENSOR_DEVICE_CLASSES[deviceClass] || {};

        let icon = attrs.icon || deviceClassInfo.icon || 'mdi:eye';
        let color = null;
        let text = entity.state;

        if (isBinary) {
            const isOn = entity.state === 'on';
            color = isOn ? '#4caf50' : '#424242';
            text = isOn ? 'On' : 'Off';
            icon = isOn ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline';
            
            // Device class specific icons for binary sensors
            if (deviceClass === 'motion') {
                icon = isOn ? 'mdi:motion-sensor' : 'mdi:motion-sensor-off';
            } else if (deviceClass === 'door') {
                icon = isOn ? 'mdi:door-open' : 'mdi:door-closed';
            } else if (deviceClass === 'window') {
                icon = isOn ? 'mdi:window-open' : 'mdi:window-closed';
            } else if (deviceClass === 'occupancy') {
                icon = isOn ? 'mdi:home-account' : 'mdi:home-outline';
            }
        } else {
            // Numeric sensor - format value with unit
            const unit = attrs.unit_of_measurement || deviceClassInfo.unit || '';
            if (!isNaN(parseFloat(entity.state))) {
                const value = parseFloat(entity.state);
                text = `${value.toFixed(1)}${unit ? ' ' + unit : ''}`;
            }

            // Color based on battery level
            if (deviceClass === 'battery') {
                const level = parseFloat(entity.state);
                if (level <= 20) {
                    color = '#f44336';
                    icon = 'mdi:battery-low';
                } else if (level <= 50) {
                    color = '#ff9800';
                    icon = 'mdi:battery-medium';
                } else {
                    color = '#4caf50';
                    icon = 'mdi:battery-high';
                }
            }
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        // Sensors are read-only
        return [];
    }
}

export default new SensorAdapter();
