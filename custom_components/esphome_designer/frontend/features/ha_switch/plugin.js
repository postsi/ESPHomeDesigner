/**
 * Home Assistant Switch Widget Plugin
 * Mimics the HA entity row / tile card style for switches and toggles
 */

function getSwitchData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    return {
        state: entity.state || 'off',
        isOn: entity.state === 'on',
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Switch',
        icon: attrs.icon || null,
        deviceClass: attrs.device_class || null
    };
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 140;
    const height = widget.height || 60;
    
    const entityId = widget.entity_id || props.entity_id;
    const switchData = getSwitchData(entityId);
    
    const isOn = switchData?.isOn ?? props.is_on ?? false;
    const friendlyName = switchData?.friendlyName ?? props.title ?? 'Switch';
    
    const onColor = props.on_color || '#4caf50';
    const offColor = props.off_color || '#9e9e9e';
    const activeColor = isOn ? onColor : offColor;
    
    el.innerHTML = '';
    // Note: position is set by canvas CSS (.widget { position: absolute })
    el.style.background = '#1c1c1c';
    el.style.borderRadius = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'row';
    el.style.alignItems = 'center';
    el.style.fontFamily = "'Roboto', sans-serif";
    el.style.overflow = 'hidden';
    el.style.boxSizing = 'border-box';
    el.style.padding = '12px';
    el.style.gap = '12px';
    
    // Icon
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${isOn ? activeColor + '30' : '#333'};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        font-size: 18px;
        color: ${isOn ? activeColor : '#666'};
    `;
    iconEl.textContent = '⚡';
    iconContainer.appendChild(iconEl);
    el.appendChild(iconContainer);
    
    // Name and state
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    `;
    
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
    stateLabel.textContent = isOn ? 'On' : 'Off';
    textContainer.appendChild(stateLabel);
    
    el.appendChild(textContainer);
    
    // Toggle switch
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
        width: 44px;
        height: 24px;
        border-radius: 12px;
        background: ${isOn ? activeColor : '#444'};
        position: relative;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.2s ease;
    `;
    
    const toggleKnob = document.createElement('div');
    toggleKnob.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 2px;
        left: ${isOn ? '22px' : '2px'};
        transition: left 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    toggleContainer.appendChild(toggleKnob);
    el.appendChild(toggleContainer);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    
    return {
        obj: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            pad_all: 12,
            layout: { type: 'flex', flex_flow: 'row', flex_align_main: 'space-between', flex_align_cross: 'center' },
            widgets: [
                {
                    obj: {
                        width: 36,
                        height: 36,
                        radius: 'circle',
                        bg_color: convertColor('#333333'),
                        widgets: [
                            {
                                label: {
                                    text: '"⚡"',
                                    align: 'center',
                                    text_color: convertColor('#666666')
                                }
                            }
                        ]
                    }
                },
                {
                    obj: {
                        flex_grow: 1,
                        height: 'content',
                        bg_opa: 'transp',
                        layout: { type: 'flex', flex_flow: 'column' },
                        widgets: [
                            {
                                label: {
                                    id: `${w.id}_name`,
                                    text: `"${p.title || 'Switch'}"`,
                                    text_color: convertColor('#ffffff'),
                                    text_font: 'montserrat_14'
                                }
                            },
                            {
                                label: {
                                    id: `${w.id}_state`,
                                    text: '"Off"',
                                    text_color: convertColor('#888888'),
                                    text_font: 'montserrat_12'
                                }
                            }
                        ]
                    }
                },
                {
                    switch: {
                        id: `${w.id}_toggle`,
                        width: 44,
                        height: 24,
                        checked: false,
                        indicator: { bg_color: convertColor(p.on_color || '#4caf50') },
                        knob: { bg_color: convertColor('#ffffff') }
                    }
                }
            ]
        }
    };
};

export default {
    id: 'ha_switch',
    name: 'HA Switch',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 140,
    height: 60,
    defaults: {
        entity_id: '',
        title: 'Switch',
        on_color: '#4caf50',
        off_color: '#9e9e9e',
        is_on: false
    },
    render,
    exportLVGL
};
