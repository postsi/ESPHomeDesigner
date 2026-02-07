/**
 * Home Assistant Cover Widget Plugin
 * Mimics the HA cover card with open/stop/close buttons and position slider
 */

function getCoverData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    const features = attrs.supported_features || 0;
    
    return {
        state: entity.state || 'closed',
        isOpen: entity.state === 'open',
        isClosed: entity.state === 'closed',
        isOpening: entity.state === 'opening',
        isClosing: entity.state === 'closing',
        position: attrs.current_position ?? null,
        tiltPosition: attrs.current_tilt_position ?? null,
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Cover',
        deviceClass: attrs.device_class || 'blind',
        supportsOpen: (features & 1) !== 0,
        supportsClose: (features & 2) !== 0,
        supportsStop: (features & 8) !== 0,
        supportsPosition: (features & 4) !== 0,
        supportsTilt: (features & 128) !== 0
    };
}

function getIconForDeviceClass(deviceClass, state) {
    const icons = {
        blind: { open: '▓', closed: '░', default: '▒' },
        curtain: { open: '◫', closed: '▮', default: '▯' },
        door: { open: '🚪', closed: '🚪', default: '🚪' },
        garage: { open: '⬆', closed: '⬇', default: '⬛' },
        gate: { open: '⬜', closed: '⬛', default: '▣' },
        shade: { open: '☀', closed: '🌙', default: '◐' },
        shutter: { open: '▓', closed: '░', default: '▒' },
        window: { open: '⬜', closed: '⬛', default: '▣' }
    };
    const classIcons = icons[deviceClass] || icons.blind;
    return classIcons[state] || classIcons.default;
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 160;
    const height = widget.height || 140;
    
    const entityId = widget.entity_id || props.entity_id;
    const coverData = getCoverData(entityId);
    
    const state = coverData?.state ?? 'closed';
    const position = coverData?.position ?? props.position ?? 0;
    const friendlyName = coverData?.friendlyName ?? props.title ?? 'Cover';
    const deviceClass = coverData?.deviceClass ?? props.device_class ?? 'blind';
    const supportsPosition = coverData?.supportsPosition ?? true;
    const supportsStop = coverData?.supportsStop ?? true;
    
    const accentColor = props.accent_color || '#2196f3';
    
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
    el.style.gap = '10px';
    
    // Header with name and state
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${state === 'open' ? accentColor + '30' : '#333'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: ${state === 'open' ? accentColor : '#888'};
    `;
    iconEl.textContent = getIconForDeviceClass(deviceClass, state);
    header.appendChild(iconEl);
    
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `flex: 1; min-width: 0;`;
    
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    nameLabel.textContent = friendlyName;
    textContainer.appendChild(nameLabel);
    
    const stateLabel = document.createElement('div');
    stateLabel.style.cssText = `
        font-size: 11px;
        color: #888;
        text-transform: capitalize;
    `;
    stateLabel.textContent = state;
    textContainer.appendChild(stateLabel);
    
    header.appendChild(textContainer);
    el.appendChild(header);
    
    // Position slider (if supported)
    if (supportsPosition) {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const posLabel = document.createElement('div');
        posLabel.style.cssText = `
            font-size: 11px;
            color: #888;
            width: 30px;
            text-align: right;
        `;
        posLabel.textContent = `${position}%`;
        sliderContainer.appendChild(posLabel);
        
        const sliderTrack = document.createElement('div');
        sliderTrack.style.cssText = `
            flex: 1;
            height: 6px;
            background: #333;
            border-radius: 3px;
            position: relative;
            overflow: hidden;
        `;
        
        const sliderFill = document.createElement('div');
        sliderFill.style.cssText = `
            width: ${position}%;
            height: 100%;
            background: ${accentColor};
            border-radius: 3px;
        `;
        sliderTrack.appendChild(sliderFill);
        sliderContainer.appendChild(sliderTrack);
        
        el.appendChild(sliderContainer);
    }
    
    // Control buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: center;
    `;
    
    const buttonStyle = `
        flex: 1;
        max-width: 50px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: #333;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
    `;
    
    const openBtn = document.createElement('button');
    openBtn.style.cssText = buttonStyle;
    openBtn.innerHTML = '▲';
    openBtn.title = 'Open';
    buttonRow.appendChild(openBtn);
    
    if (supportsStop) {
        const stopBtn = document.createElement('button');
        stopBtn.style.cssText = buttonStyle;
        stopBtn.innerHTML = '■';
        stopBtn.title = 'Stop';
        buttonRow.appendChild(stopBtn);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = buttonStyle;
    closeBtn.innerHTML = '▼';
    closeBtn.title = 'Close';
    buttonRow.appendChild(closeBtn);
    
    el.appendChild(buttonRow);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    
    return {
        obj: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            pad_all: 12,
            layout: { type: 'flex', flex_flow: 'column', flex_align_main: 'space-between' },
            widgets: [
                // Header
                {
                    obj: {
                        width: '100%',
                        height: 'content',
                        bg_opa: 'transp',
                        layout: { type: 'flex', flex_flow: 'row', flex_align_cross: 'center' },
                        pad_column: 10,
                        widgets: [
                            {
                                obj: {
                                    width: 32,
                                    height: 32,
                                    radius: 'circle',
                                    bg_color: convertColor('#333333')
                                }
                            },
                            {
                                label: {
                                    id: `${w.id}_name`,
                                    text: `"${p.title || 'Cover'}"`,
                                    text_color: convertColor('#ffffff'),
                                    text_font: 'montserrat_14'
                                }
                            }
                        ]
                    }
                },
                // Position bar
                {
                    bar: {
                        id: `${w.id}_position`,
                        width: '100%',
                        height: 6,
                        value: 0,
                        min_value: 0,
                        max_value: 100,
                        bg_color: convertColor('#333333'),
                        indicator: { bg_color: convertColor(p.accent_color || '#2196f3') }
                    }
                },
                // Button row
                {
                    buttonmatrix: {
                        id: `${w.id}_buttons`,
                        width: '100%',
                        height: 40,
                        rows: [
                            { buttons: [
                                { id: 'open', text: '▲' },
                                { id: 'stop', text: '■' },
                                { id: 'close', text: '▼' }
                            ]}
                        ],
                        items: {
                            bg_color: convertColor('#333333'),
                            text_color: convertColor('#ffffff')
                        }
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
        if (w.type !== 'ha_cover') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('cover.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(`${safeId}_position`)) {
            seenSensorIds?.add(`${safeId}_position`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_position`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: current_position`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_cover',
    name: 'HA Cover',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 160,
    height: 140,
    defaults: {
        entity_id: '',
        title: 'Cover',
        accent_color: '#2196f3',
        device_class: 'blind',
        position: 0
    },
    render,
    exportLVGL,
    onExportNumericSensors
};
