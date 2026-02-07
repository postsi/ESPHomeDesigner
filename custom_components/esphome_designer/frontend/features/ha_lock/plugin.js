/**
 * Home Assistant Lock Widget Plugin
 * Mimics the HA lock card with lock/unlock button and status
 */

function getLockData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    return {
        state: entity.state || 'unknown',
        isLocked: entity.state === 'locked',
        isUnlocked: entity.state === 'unlocked',
        isLocking: entity.state === 'locking',
        isUnlocking: entity.state === 'unlocking',
        isJammed: entity.state === 'jammed',
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Lock'
    };
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 140;
    const height = widget.height || 120;
    
    const entityId = widget.entity_id || props.entity_id;
    const lockData = getLockData(entityId);
    
    const state = lockData?.state ?? 'locked';
    const isLocked = lockData?.isLocked ?? props.is_locked ?? true;
    const friendlyName = lockData?.friendlyName ?? props.title ?? 'Lock';
    
    const lockedColor = props.locked_color || '#4caf50';
    const unlockedColor = props.unlocked_color || '#f44336';
    const activeColor = isLocked ? lockedColor : unlockedColor;
    
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
    
    // Lock icon button
    const iconSize = Math.min(width - 40, height - 60, 50);
    const iconBtn = document.createElement('button');
    iconBtn.style.cssText = `
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        border: none;
        background: ${activeColor}30;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        font-size: ${iconSize * 0.5}px;
        color: ${activeColor};
    `;
    iconEl.textContent = isLocked ? '🔒' : '🔓';
    iconBtn.appendChild(iconEl);
    el.appendChild(iconBtn);
    
    // State label
    const stateLabel = document.createElement('div');
    stateLabel.style.cssText = `
        font-size: 16px;
        font-weight: 500;
        color: ${activeColor};
        text-transform: capitalize;
    `;
    stateLabel.textContent = state;
    el.appendChild(stateLabel);
    
    // Name
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        font-size: 12px;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
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
            layout: { type: 'flex', flex_flow: 'column', flex_align_main: 'center', flex_align_cross: 'center' },
            widgets: [
                {
                    btn: {
                        id: `${w.id}_toggle`,
                        width: 50,
                        height: 50,
                        radius: 'circle',
                        bg_color: convertColor(p.locked_color || '#4caf50'),
                        bg_opa: '30%',
                        widgets: [
                            {
                                label: {
                                    text: '"🔒"',
                                    align: 'center'
                                }
                            }
                        ]
                    }
                },
                {
                    label: {
                        id: `${w.id}_state`,
                        text: '"Locked"',
                        text_color: convertColor(p.locked_color || '#4caf50'),
                        text_font: 'montserrat_16'
                    }
                },
                {
                    label: {
                        text: `"${p.title || 'Lock'}"`,
                        text_color: convertColor('#888888'),
                        text_font: 'montserrat_12'
                    }
                }
            ]
        }
    };
};

export default {
    id: 'ha_lock',
    name: 'HA Lock',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 140,
    height: 120,
    defaults: {
        entity_id: '',
        title: 'Lock',
        locked_color: '#4caf50',
        unlocked_color: '#f44336',
        is_locked: true
    },
    render,
    exportLVGL
};
