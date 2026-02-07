/**
 * Home Assistant Fan Widget Plugin
 * Mimics the HA fan card with toggle, speed control, and oscillation
 */

function getFanData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    const features = attrs.supported_features || 0;
    
    return {
        state: entity.state || 'off',
        isOn: entity.state === 'on',
        percentage: attrs.percentage ?? 0,
        presetMode: attrs.preset_mode ?? null,
        presetModes: attrs.preset_modes ?? [],
        oscillating: attrs.oscillating ?? false,
        direction: attrs.direction ?? 'forward',
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Fan',
        supportsSpeed: (features & 1) !== 0,
        supportsOscillate: (features & 2) !== 0,
        supportsDirection: (features & 4) !== 0,
        supportsPresetMode: (features & 8) !== 0,
        speedCount: attrs.speed_count ?? 100
    };
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 140;
    const height = widget.height || 160;
    
    const entityId = widget.entity_id || props.entity_id;
    const fanData = getFanData(entityId);
    
    const isOn = fanData?.isOn ?? props.is_on ?? false;
    const percentage = fanData?.percentage ?? props.percentage ?? 0;
    const friendlyName = fanData?.friendlyName ?? props.title ?? 'Fan';
    const oscillating = fanData?.oscillating ?? false;
    const supportsSpeed = fanData?.supportsSpeed ?? true;
    const supportsOscillate = fanData?.supportsOscillate ?? false;
    
    const onColor = props.on_color || '#4caf50';
    const offColor = props.off_color || '#424242';
    const activeColor = isOn ? onColor : offColor;
    
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
    el.style.gap = '8px';
    
    // Fan icon with animation when on
    const iconArea = document.createElement('div');
    iconArea.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        min-height: 50px;
    `;
    
    const iconSize = Math.min(width - 40, height - 80, 50);
    const icon = document.createElement('div');
    icon.style.cssText = `
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        background: ${isOn ? activeColor + '30' : '#333'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${iconSize * 0.6}px;
        color: ${isOn ? activeColor : '#666'};
        cursor: pointer;
        ${isOn ? `animation: spin ${3 - (percentage / 50)}s linear infinite;` : ''}
    `;
    icon.innerHTML = '🌀';
    
    // Add keyframes for spin animation
    if (!document.getElementById('ha-fan-spin-keyframes')) {
        const style = document.createElement('style');
        style.id = 'ha-fan-spin-keyframes';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    iconArea.appendChild(icon);
    el.appendChild(iconArea);
    
    // Speed display
    if (supportsSpeed) {
        const speedDisplay = document.createElement('div');
        speedDisplay.style.cssText = `
            text-align: center;
            font-size: 20px;
            font-weight: 300;
            color: ${isOn ? '#fff' : '#666'};
        `;
        speedDisplay.textContent = isOn ? `${percentage}%` : 'Off';
        el.appendChild(speedDisplay);
        
        // Speed slider
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            width: 100%;
            height: 6px;
            background: #333;
            border-radius: 3px;
            position: relative;
            overflow: hidden;
        `;
        
        const sliderFill = document.createElement('div');
        sliderFill.style.cssText = `
            width: ${isOn ? percentage : 0}%;
            height: 100%;
            background: ${activeColor};
            border-radius: 3px;
            transition: width 0.2s ease;
        `;
        sliderContainer.appendChild(sliderFill);
        el.appendChild(sliderContainer);
    } else {
        // Just show on/off state
        const stateDisplay = document.createElement('div');
        stateDisplay.style.cssText = `
            text-align: center;
            font-size: 16px;
            font-weight: 500;
            color: ${isOn ? '#fff' : '#666'};
            text-transform: uppercase;
        `;
        stateDisplay.textContent = isOn ? 'On' : 'Off';
        el.appendChild(stateDisplay);
    }
    
    // Oscillate toggle (if supported)
    if (supportsOscillate) {
        const oscillateRow = document.createElement('div');
        oscillateRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 4px;
        `;
        
        const oscillateLabel = document.createElement('div');
        oscillateLabel.style.cssText = `
            font-size: 11px;
            color: #888;
        `;
        oscillateLabel.textContent = 'Oscillate';
        oscillateRow.appendChild(oscillateLabel);
        
        const oscillateToggle = document.createElement('div');
        oscillateToggle.style.cssText = `
            width: 32px;
            height: 18px;
            border-radius: 9px;
            background: ${oscillating ? activeColor : '#444'};
            position: relative;
            cursor: pointer;
        `;
        
        const toggleKnob = document.createElement('div');
        toggleKnob.style.cssText = `
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            position: absolute;
            top: 2px;
            left: ${oscillating ? '16px' : '2px'};
            transition: left 0.2s ease;
        `;
        oscillateToggle.appendChild(toggleKnob);
        oscillateRow.appendChild(oscillateToggle);
        
        el.appendChild(oscillateRow);
    }
    
    // Name
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        text-align: center;
        font-size: 12px;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    nameLabel.textContent = friendlyName;
    el.appendChild(nameLabel);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    
    return {
        obj: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            pad_all: 12,
            layout: { type: 'flex', flex_flow: 'column', flex_align_main: 'space-between', flex_align_cross: 'center' },
            widgets: [
                {
                    btn: {
                        id: `${w.id}_toggle`,
                        width: 50,
                        height: 50,
                        radius: 'circle',
                        bg_color: convertColor(p.off_color || '#424242'),
                        widgets: [
                            {
                                label: {
                                    text: '"🌀"',
                                    align: 'center'
                                }
                            }
                        ]
                    }
                },
                {
                    label: {
                        id: `${w.id}_speed`,
                        text: '"Off"',
                        text_color: convertColor('#666666'),
                        text_font: 'montserrat_20'
                    }
                },
                {
                    bar: {
                        id: `${w.id}_slider`,
                        width: '100%',
                        height: 6,
                        value: 0,
                        min_value: 0,
                        max_value: 100,
                        bg_color: convertColor('#333333'),
                        indicator: { bg_color: convertColor(p.on_color || '#4caf50') }
                    }
                },
                {
                    label: {
                        text: `"${p.title || 'Fan'}"`,
                        text_color: convertColor('#888888'),
                        text_font: 'montserrat_12'
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
        if (w.type !== 'ha_fan') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('fan.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(`${safeId}_percentage`)) {
            seenSensorIds?.add(`${safeId}_percentage`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_percentage`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: percentage`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_fan',
    name: 'HA Fan',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 140,
    height: 160,
    defaults: {
        entity_id: '',
        title: 'Fan',
        on_color: '#4caf50',
        off_color: '#424242',
        is_on: false,
        percentage: 0
    },
    render,
    exportLVGL,
    onExportNumericSensors
};
