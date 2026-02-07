/**
 * Home Assistant Sensor Widget Plugin
 * Mimics the HA entity card / sensor tile with icon, value, and unit
 */

const DEVICE_CLASS_ICONS = {
    temperature: '🌡️',
    humidity: '💧',
    pressure: '🔘',
    illuminance: '☀️',
    battery: '🔋',
    power: '⚡',
    energy: '⚡',
    voltage: '🔌',
    current: '⚡',
    gas: '🔥',
    co2: '💨',
    co: '💨',
    pm25: '🌫️',
    pm10: '🌫️',
    motion: '🚶',
    door: '🚪',
    window: '🪟',
    occupancy: '👤',
    moisture: '💧',
    smoke: '🔥',
    safety: '⚠️',
    connectivity: '📶',
    signal_strength: '📶',
    timestamp: '🕐',
    duration: '⏱️',
    speed: '💨',
    distance: '📏',
    weight: '⚖️',
    monetary: '💰',
    data_size: '💾',
    data_rate: '📊',
    default: '📊'
};

const DEVICE_CLASS_COLORS = {
    temperature: '#ff5722',
    humidity: '#2196f3',
    pressure: '#9c27b0',
    illuminance: '#ffc107',
    battery: '#4caf50',
    power: '#ff9800',
    energy: '#ff9800',
    voltage: '#e91e63',
    current: '#e91e63',
    gas: '#795548',
    co2: '#607d8b',
    motion: '#00bcd4',
    door: '#3f51b5',
    window: '#3f51b5',
    occupancy: '#009688',
    default: '#2196f3'
};

function getSensorData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    return {
        state: entity.state || 'unknown',
        unit: attrs.unit_of_measurement ?? '',
        deviceClass: attrs.device_class ?? null,
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Sensor',
        icon: attrs.icon ?? null,
        stateClass: attrs.state_class ?? null
    };
}

function formatValue(value, unit, decimals = 1) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toFixed(decimals);
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 120;
    const height = widget.height || 100;
    
    const entityId = widget.entity_id || props.entity_id;
    const sensorData = getSensorData(entityId);
    
    const state = sensorData?.state ?? props.value ?? '--';
    const unit = sensorData?.unit ?? props.unit ?? '';
    const deviceClass = sensorData?.deviceClass ?? props.device_class ?? 'default';
    const friendlyName = sensorData?.friendlyName ?? props.title ?? 'Sensor';
    const decimals = props.decimals ?? 1;
    
    const icon = DEVICE_CLASS_ICONS[deviceClass] || DEVICE_CLASS_ICONS.default;
    const accentColor = props.accent_color || DEVICE_CLASS_COLORS[deviceClass] || DEVICE_CLASS_COLORS.default;
    
    const formattedValue = formatValue(state, unit, decimals);
    
    el.innerHTML = '';
    // Note: position is set by canvas CSS (.widget { position: absolute })
    el.style.background = '#1c1c1c';
    el.style.borderRadius = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.fontFamily = "'Roboto', sans-serif";
    el.style.overflow = 'hidden';
    el.style.boxSizing = 'border-box';
    el.style.padding = '12px';
    el.style.gap = '6px';
    
    // Icon
    const iconArea = document.createElement('div');
    iconArea.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${accentColor}30;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
    `;
    iconEl.textContent = icon;
    iconArea.appendChild(iconEl);
    
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        font-size: 12px;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
    `;
    nameLabel.textContent = friendlyName;
    iconArea.appendChild(nameLabel);
    
    el.appendChild(iconArea);
    
    // Value display
    const valueArea = document.createElement('div');
    valueArea.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const valueContainer = document.createElement('div');
    valueContainer.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 4px;
    `;
    
    const valueEl = document.createElement('span');
    const fontSize = Math.min(width / 4, height / 3, 28);
    valueEl.style.cssText = `
        font-size: ${fontSize}px;
        font-weight: 400;
        color: #fff;
    `;
    valueEl.textContent = formattedValue;
    valueContainer.appendChild(valueEl);
    
    if (unit) {
        const unitEl = document.createElement('span');
        unitEl.style.cssText = `
            font-size: ${fontSize * 0.5}px;
            color: #888;
        `;
        unitEl.textContent = unit;
        valueContainer.appendChild(unitEl);
    }
    
    valueArea.appendChild(valueContainer);
    el.appendChild(valueArea);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    const deviceClass = p.device_class || 'default';
    const accentColor = p.accent_color || DEVICE_CLASS_COLORS[deviceClass] || DEVICE_CLASS_COLORS.default;
    
    return {
        obj: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            pad_all: 12,
            layout: { type: 'flex', flex_flow: 'column', flex_align_main: 'space-between' },
            widgets: [
                // Header with icon and name
                {
                    obj: {
                        width: '100%',
                        height: 'content',
                        bg_opa: 'transp',
                        layout: { type: 'flex', flex_flow: 'row', flex_align_cross: 'center' },
                        pad_column: 8,
                        widgets: [
                            {
                                obj: {
                                    width: 32,
                                    height: 32,
                                    radius: 'circle',
                                    bg_color: convertColor(accentColor),
                                    bg_opa: '30%'
                                }
                            },
                            {
                                label: {
                                    text: `"${p.title || 'Sensor'}"`,
                                    text_color: convertColor('#888888'),
                                    text_font: 'montserrat_12'
                                }
                            }
                        ]
                    }
                },
                // Value display
                {
                    obj: {
                        width: '100%',
                        flex_grow: 1,
                        bg_opa: 'transp',
                        layout: { type: 'flex', flex_flow: 'row', flex_align_main: 'center', flex_align_cross: 'center' },
                        widgets: [
                            {
                                label: {
                                    id: `${w.id}_value`,
                                    text: '"--"',
                                    text_color: convertColor('#ffffff'),
                                    text_font: 'montserrat_28'
                                }
                            },
                            {
                                label: {
                                    text: `"${p.unit || ''}"`,
                                    text_color: convertColor('#888888'),
                                    text_font: 'montserrat_14'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
};

const onExportNumericSensors = (context) => {
    const { widgets, lines, seenSensorIds } = context;
    if (!widgets) return;
    
    for (const w of widgets) {
        if (w.type !== 'ha_sensor') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId) continue;
        
        // Only numeric sensors (sensor.*)
        if (!entityId.startsWith('sensor.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(safeId)) {
            seenSensorIds?.add(safeId);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  internal: true`);
        }
    }
};

const onExportTextSensors = (context) => {
    const { widgets, lines, seenSensorIds } = context;
    if (!widgets) return;
    
    for (const w of widgets) {
        if (w.type !== 'ha_sensor') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId) continue;
        
        // Binary sensors as text
        if (!entityId.startsWith('binary_sensor.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(safeId)) {
            seenSensorIds?.add(safeId);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_sensor',
    name: 'HA Sensor',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 120,
    height: 100,
    defaults: {
        entity_id: '',
        title: 'Sensor',
        unit: '',
        device_class: 'default',
        accent_color: '',
        value: '--',
        decimals: 1
    },
    render,
    exportLVGL,
    onExportNumericSensors,
    onExportTextSensors
};
