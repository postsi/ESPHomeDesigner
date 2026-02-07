/**
 * Home Assistant Button Widget Plugin
 * Mimics the HA button card for scenes, scripts, and button entities
 */

function getButtonData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    const domain = entityId.split('.')[0];
    
    return {
        state: entity.state || 'unknown',
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Button',
        icon: attrs.icon || null,
        domain: domain,
        isRunning: entity.state === 'on' || entity.state === 'running'
    };
}

const DOMAIN_ICONS = {
    scene: '🎨',
    script: '📜',
    button: '🔘',
    input_button: '🔘',
    automation: '⚙️',
    default: '▶'
};

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 120;
    const height = widget.height || 80;
    
    const entityId = widget.entity_id || props.entity_id;
    const buttonData = getButtonData(entityId);
    
    const friendlyName = buttonData?.friendlyName ?? props.title ?? 'Button';
    const domain = buttonData?.domain ?? 'button';
    const isRunning = buttonData?.isRunning ?? false;
    
    const buttonColor = props.button_color || '#6200ea';
    const runningColor = props.running_color || '#4caf50';
    const activeColor = isRunning ? runningColor : buttonColor;
    const icon = DOMAIN_ICONS[domain] || DOMAIN_ICONS.default;
    
    el.innerHTML = '';
    // Note: position is set by canvas CSS (.widget { position: absolute })
    el.style.background = '#1c1c1c';
    el.style.borderRadius = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontFamily = "'Roboto', sans-serif";
    el.style.overflow = 'hidden';
    el.style.boxSizing = 'border-box';
    el.style.padding = '12px';
    el.style.gap = '8px';
    
    // Icon button
    const iconSize = Math.min(width - 30, height - 40, 40);
    const iconBtn = document.createElement('div');
    iconBtn.style.cssText = `
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        background: ${activeColor}30;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        font-size: ${iconSize * 0.5}px;
        color: ${activeColor};
    `;
    iconEl.textContent = icon;
    iconBtn.appendChild(iconEl);
    el.appendChild(iconBtn);
    
    // Name
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        font-size: 12px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        text-align: center;
    `;
    nameLabel.textContent = friendlyName;
    el.appendChild(nameLabel);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    
    return {
        btn: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            layout: { type: 'flex', flex_flow: 'column', flex_align_main: 'center', flex_align_cross: 'center' },
            widgets: [
                {
                    obj: {
                        width: 40,
                        height: 40,
                        radius: 'circle',
                        bg_color: convertColor(p.button_color || '#6200ea'),
                        bg_opa: '30%',
                        widgets: [
                            {
                                label: {
                                    text: '"▶"',
                                    align: 'center',
                                    text_color: convertColor(p.button_color || '#6200ea')
                                }
                            }
                        ]
                    }
                },
                {
                    label: {
                        text: `"${p.title || 'Button'}"`,
                        text_color: convertColor('#ffffff'),
                        text_font: 'montserrat_12'
                    }
                }
            ]
        }
    };
};

export default {
    id: 'ha_button',
    name: 'HA Button',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 120,
    height: 80,
    defaults: {
        entity_id: '',
        title: 'Button',
        button_color: '#6200ea',
        running_color: '#4caf50'
    },
    render,
    exportLVGL
};
