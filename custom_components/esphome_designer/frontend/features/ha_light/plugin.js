/**
 * Home Assistant Light Widget Plugin
 * Mimics the HA light card with toggle, brightness slider, and color support
 */

function getLightData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    return {
        state: entity.state || 'off',
        isOn: entity.state === 'on',
        brightness: attrs.brightness ?? 0, // 0-255
        brightnessPercent: Math.round((attrs.brightness ?? 0) / 255 * 100),
        colorTemp: attrs.color_temp ?? null,
        minMireds: attrs.min_mireds ?? 153,
        maxMireds: attrs.max_mireds ?? 500,
        rgbColor: attrs.rgb_color ?? null, // [r, g, b] array
        hsColor: attrs.hs_color ?? null, // [hue, saturation] array
        xyColor: attrs.xy_color ?? null, // [x, y] array
        colorMode: attrs.color_mode ?? null, // 'color_temp', 'hs', 'rgb', 'xy', etc.
        supportsBrightness: (attrs.supported_color_modes || []).some(m => m !== 'onoff'),
        supportsColorTemp: (attrs.supported_color_modes || []).includes('color_temp'),
        supportsColor: (attrs.supported_color_modes || []).some(m => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m)),
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Light'
    };
}

/**
 * Convert color temperature in mireds to RGB
 */
function miredsToRgb(mireds) {
    // Convert mireds to Kelvin
    const kelvin = 1000000 / mireds;
    const temp = kelvin / 100;
    
    let r, g, b;
    
    if (temp <= 66) {
        r = 255;
        g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
    } else {
        r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
        g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    }
    
    if (temp >= 66) {
        b = 255;
    } else if (temp <= 19) {
        b = 0;
    } else {
        b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }
    
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Get the display color for the light based on its current state
 */
function getLightColor(lightData, fallbackOnColor) {
    if (!lightData?.isOn) return null;
    
    // If we have RGB color data, use it
    if (lightData.rgbColor && Array.isArray(lightData.rgbColor) && lightData.rgbColor.length >= 3) {
        const [r, g, b] = lightData.rgbColor;
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // If we have HS color, convert to RGB
    if (lightData.hsColor && Array.isArray(lightData.hsColor) && lightData.hsColor.length >= 2) {
        const [h, s] = lightData.hsColor;
        // Convert HSV to RGB (assuming V=100 since brightness is separate)
        const hNorm = h / 360;
        const sNorm = s / 100;
        
        const i = Math.floor(hNorm * 6);
        const f = hNorm * 6 - i;
        const p = 1 - sNorm;
        const q = 1 - f * sNorm;
        const t = 1 - (1 - f) * sNorm;
        
        let r, g, b;
        switch (i % 6) {
            case 0: r = 1; g = t; b = p; break;
            case 1: r = q; g = 1; b = p; break;
            case 2: r = p; g = 1; b = t; break;
            case 3: r = p; g = q; b = 1; break;
            case 4: r = t; g = p; b = 1; break;
            case 5: r = 1; g = p; b = q; break;
        }
        
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    
    // If we have color temperature, convert to approximate RGB
    if (lightData.colorTemp && lightData.colorMode === 'color_temp') {
        return miredsToRgb(lightData.colorTemp);
    }
    
    // Fall back to the configured on color
    return fallbackOnColor;
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 140;
    const height = widget.height || 180;
    
    const entityId = widget.entity_id || props.entity_id;
    const lightData = getLightData(entityId);
    
    const isOn = lightData?.isOn ?? props.is_on ?? false;
    const brightness = lightData?.brightnessPercent ?? props.brightness ?? 100;
    const friendlyName = lightData?.friendlyName ?? props.title ?? 'Light';
    const supportsBrightness = lightData?.supportsBrightness ?? true;
    const supportsColor = lightData?.supportsColor ?? false;
    const supportsColorTemp = lightData?.supportsColorTemp ?? false;
    
    const onColor = props.on_color || '#ffc107';
    const offColor = props.off_color || '#424242';
    
    // Get the actual light color from HA state, or fall back to configured color
    const actualColor = getLightColor(lightData, onColor);
    const activeColor = isOn ? (actualColor || onColor) : offColor;
    
    el.innerHTML = '';
    // Note: position is set by canvas CSS (.widget { position: absolute })
    // Do NOT override it here or drag/drop will break
    el.style.background = '#1c1c1c';
    el.style.borderRadius = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.fontFamily = "'Roboto', sans-serif";
    el.style.overflow = 'hidden';
    el.style.boxSizing = 'border-box';
    el.style.padding = '12px';
    
    // Icon area
    const iconArea = document.createElement('div');
    iconArea.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60px;
    `;
    
    // Light bulb icon (circle with glow when on, showing actual color)
    const iconSize = Math.min(width - 40, height - 100, 60);
    const icon = document.createElement('div');
    icon.style.cssText = `
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        background: ${isOn ? activeColor : '#333'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${iconSize * 0.5}px;
        box-shadow: ${isOn ? `0 0 ${iconSize/2}px ${activeColor}40` : 'none'};
        transition: all 0.3s ease;
        cursor: pointer;
    `;
    icon.innerHTML = '💡';
    iconArea.appendChild(icon);
    el.appendChild(iconArea);
    
    // Brightness display (if on and supports brightness)
    if (supportsBrightness) {
        const brightnessDisplay = document.createElement('div');
        brightnessDisplay.style.cssText = `
            text-align: center;
            font-size: 24px;
            font-weight: 300;
            color: ${isOn ? '#fff' : '#666'};
            margin: 8px 0;
        `;
        brightnessDisplay.textContent = isOn ? `${brightness}%` : 'Off';
        el.appendChild(brightnessDisplay);
        
        // Brightness slider
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            width: 100%;
            height: 6px;
            background: #333;
            border-radius: 3px;
            margin: 8px 0;
            position: relative;
            overflow: hidden;
        `;
        
        const sliderFill = document.createElement('div');
        sliderFill.style.cssText = `
            width: ${isOn ? brightness : 0}%;
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
            font-size: 18px;
            font-weight: 500;
            color: ${isOn ? '#fff' : '#666'};
            margin: 8px 0;
            text-transform: uppercase;
        `;
        stateDisplay.textContent = isOn ? 'On' : 'Off';
        el.appendChild(stateDisplay);
    }
    
    // Color/Color Temp indicator (if supported and on)
    if (isOn && (supportsColor || supportsColorTemp)) {
        const colorInfo = document.createElement('div');
        colorInfo.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 4px 0;
        `;
        
        // Color swatch
        const colorSwatch = document.createElement('div');
        colorSwatch.style.cssText = `
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${actualColor || activeColor};
            border: 2px solid #444;
        `;
        colorInfo.appendChild(colorSwatch);
        
        // Color mode label
        const colorLabel = document.createElement('span');
        colorLabel.style.cssText = `
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        `;
        if (lightData?.colorMode === 'color_temp') {
            // Show color temp in Kelvin
            const kelvin = lightData.colorTemp ? Math.round(1000000 / lightData.colorTemp) : null;
            colorLabel.textContent = kelvin ? `${kelvin}K` : 'Color Temp';
        } else if (lightData?.rgbColor) {
            colorLabel.textContent = 'RGB';
        } else if (lightData?.hsColor) {
            colorLabel.textContent = 'Color';
        } else {
            colorLabel.textContent = supportsColor ? 'Color' : 'Temp';
        }
        colorInfo.appendChild(colorLabel);
        
        el.appendChild(colorInfo);
    }
    
    // Name
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        text-align: center;
        font-size: 12px;
        color: #888;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    nameLabel.textContent = friendlyName;
    el.appendChild(nameLabel);
};

const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    const entityId = w.entity_id || p.entity_id;
    
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
                        width: 60,
                        height: 60,
                        radius: 'circle',
                        bg_color: convertColor(p.off_color || '#424242')
                    }
                },
                {
                    label: {
                        id: `${w.id}_brightness`,
                        text: '"Off"',
                        text_color: convertColor('#666666'),
                        text_font: 'montserrat_24'
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
                        indicator: { bg_color: convertColor(p.on_color || '#ffc107') }
                    }
                },
                {
                    label: {
                        text: `"${p.title || 'Light'}"`,
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
        if (w.type !== 'ha_light') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('light.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(`${safeId}_brightness`)) {
            seenSensorIds?.add(`${safeId}_brightness`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_brightness`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: brightness`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_light',
    name: 'HA Light',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 140,
    height: 180,
    defaults: {
        entity_id: '',
        title: 'Light',
        on_color: '#ffc107',
        off_color: '#424242',
        is_on: false,
        brightness: 100
    },
    render,
    exportLVGL,
    onExportNumericSensors
};
