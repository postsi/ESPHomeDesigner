/**
 * Home Assistant Thermostat Widget Plugin
 * Replicates the actual HA thermostat card:
 * - Large circular slider (draggable dial)
 * - Big temperature number in center
 * - Current temp shown as secondary
 * - Dropdown selectors for HVAC mode, preset, etc.
 */

/**
 * Get climate entity data from AppState
 */
function getClimateData(entityId) {
    if (!entityId || !window.AppState?.entityStates) {
        return null;
    }
    
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    
    return {
        state: entity.state || 'off',
        currentTemp: attrs.current_temperature ?? null,
        targetTemp: attrs.temperature ?? null,
        hvacMode: entity.state || 'off',
        hvacModes: attrs.hvac_modes || ['off', 'heat', 'cool'],
        hvacAction: attrs.hvac_action || null,
        minTemp: attrs.min_temp ?? 7,
        maxTemp: attrs.max_temp ?? 35,
        tempStep: attrs.target_temp_step ?? 0.5,
        unit: attrs.unit_of_measurement || '°C',
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Thermostat',
        presetMode: attrs.preset_mode || null,
        presetModes: attrs.preset_modes || [],
        fanMode: attrs.fan_mode || null,
        fanModes: attrs.fan_modes || []
    };
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: cx + (radius * Math.cos(angleInRadians)),
        y: cy + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/**
 * Get color based on HVAC mode/action
 */
function getModeColor(mode, action) {
    if (action === 'heating') return '#ff8c00';
    if (action === 'cooling') return '#2196F3';
    if (action === 'drying') return '#ff9800';
    if (action === 'idle') return '#44739e';
    
    switch (mode) {
        case 'heat': return '#ff8c00';
        case 'cool': return '#2196F3';
        case 'heat_cool': 
        case 'auto': return '#4caf50';
        case 'dry': return '#ff9800';
        case 'fan_only': return '#00bcd4';
        case 'off': 
        default: return '#44739e';
    }
}

/**
 * Render the thermostat widget - matching HA's actual design
 */
const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 160;
    const height = widget.height || 200;
    
    // Get entity data
    const entityId = widget.entity_id || props.entity_id;
    const climateData = getClimateData(entityId);
    
    // Use live data or defaults
    const currentTemp = climateData?.currentTemp ?? props.current_temp ?? 20;
    const targetTemp = climateData?.targetTemp ?? props.target_temp ?? 21;
    const hvacMode = climateData?.hvacMode ?? props.hvac_mode ?? 'off';
    const hvacModes = climateData?.hvacModes ?? ['off', 'heat', 'cool'];
    const hvacAction = climateData?.hvacAction;
    const minTemp = climateData?.minTemp ?? props.min_temp ?? 7;
    const maxTemp = climateData?.maxTemp ?? props.max_temp ?? 35;
    const friendlyName = climateData?.friendlyName ?? props.title ?? 'Thermostat';
    const presetMode = climateData?.presetMode;
    const presetModes = climateData?.presetModes ?? [];
    
    const activeColor = getModeColor(hvacMode, hvacAction);
    const isOff = hvacMode === 'off';
    
    // Clear and setup container - DON'T use cssText as it overwrites width/height!
    // Note: position is set by canvas CSS (.widget { position: absolute })
    // Do NOT override it here or drag/drop will break
    el.innerHTML = '';
    el.style.background = 'var(--ha-card-background, #1c1c1c)';
    el.style.borderRadius = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.fontFamily = "var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)";
    el.style.overflow = 'hidden';
    el.style.boxSizing = 'border-box';
    
    // === TITLE ===
    const title = document.createElement('div');
    title.style.cssText = `
        padding: 8px 12px 0 12px;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color, #fff);
        text-align: center;
    `;
    title.textContent = friendlyName;
    el.appendChild(title);
    
    // === CIRCULAR DIAL SECTION ===
    const dialSection = document.createElement('div');
    dialSection.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        min-height: 100px;
    `;
    
    // Calculate dial size - make it fill available space
    const dialSize = Math.min(width - 24, height - 100);
    
    const dialContainer = document.createElement('div');
    dialContainer.style.cssText = `
        width: ${dialSize}px;
        height: ${dialSize}px;
        position: relative;
    `;
    
    // Create SVG for the circular slider
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 320 320");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    
    const cx = 160;
    const cy = 160;
    const radius = 140;
    const strokeWidth = 24;
    
    // Arc parameters (270 degree arc, open at bottom)
    const startAngle = 135;
    const endAngle = 405; // 135 + 270
    const totalArc = 270;
    
    // Background track
    const bgTrack = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bgTrack.setAttribute("d", describeArc(cx, cy, radius, startAngle, endAngle));
    bgTrack.setAttribute("fill", "none");
    bgTrack.setAttribute("stroke", "rgba(255,255,255,0.1)");
    bgTrack.setAttribute("stroke-width", strokeWidth);
    bgTrack.setAttribute("stroke-linecap", "round");
    svg.appendChild(bgTrack);
    
    // Active arc (shows current value)
    if (!isOff) {
        const tempRange = maxTemp - minTemp;
        const tempPercent = Math.max(0, Math.min(1, (targetTemp - minTemp) / tempRange));
        const valueAngle = startAngle + (tempPercent * totalArc);
        
        if (tempPercent > 0.005) {
            const activeArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
            activeArc.setAttribute("d", describeArc(cx, cy, radius, startAngle, valueAngle));
            activeArc.setAttribute("fill", "none");
            activeArc.setAttribute("stroke", activeColor);
            activeArc.setAttribute("stroke-width", strokeWidth);
            activeArc.setAttribute("stroke-linecap", "round");
            svg.appendChild(activeArc);
            
            // Thumb/handle at the end of the arc
            const thumbPos = polarToCartesian(cx, cy, radius, valueAngle);
            const thumb = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            thumb.setAttribute("cx", thumbPos.x);
            thumb.setAttribute("cy", thumbPos.y);
            thumb.setAttribute("r", strokeWidth / 2 + 4);
            thumb.setAttribute("fill", activeColor);
            thumb.setAttribute("stroke", "#fff");
            thumb.setAttribute("stroke-width", "3");
            thumb.setAttribute("style", "cursor: grab; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));");
            svg.appendChild(thumb);
        }
    }
    
    // Current temperature indicator on the arc (small marker)
    if (currentTemp !== null && !isOff) {
        const currentPercent = Math.max(0, Math.min(1, (currentTemp - minTemp) / (maxTemp - minTemp)));
        const currentAngle = startAngle + (currentPercent * totalArc);
        const markerPos = polarToCartesian(cx, cy, radius, currentAngle);
        
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        marker.setAttribute("cx", markerPos.x);
        marker.setAttribute("cy", markerPos.y);
        marker.setAttribute("r", "4");
        marker.setAttribute("fill", "#fff");
        svg.appendChild(marker);
    }
    
    dialContainer.appendChild(svg);
    
    // Center content (temperature display)
    const centerContent = document.createElement('div');
    centerContent.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
    `;
    
    // HVAC action label (e.g., "Heating", "Cooling", "Idle")
    if (hvacAction && hvacAction !== 'off') {
        const actionLabel = document.createElement('div');
        actionLabel.style.cssText = `
            font-size: 10px;
            color: ${activeColor};
            text-transform: capitalize;
            margin-bottom: 2px;
            font-weight: 500;
        `;
        actionLabel.textContent = hvacAction === 'idle' ? hvacMode : hvacAction;
        centerContent.appendChild(actionLabel);
    } else if (!isOff) {
        const modeLabel = document.createElement('div');
        modeLabel.style.cssText = `
            font-size: 10px;
            color: ${activeColor};
            text-transform: capitalize;
            margin-bottom: 2px;
            font-weight: 500;
        `;
        modeLabel.textContent = hvacMode.replace('_', ' ');
        centerContent.appendChild(modeLabel);
    }
    
    // Target temperature (BIG number)
    const targetDisplay = document.createElement('div');
    targetDisplay.style.cssText = `
        font-size: ${dialSize * 0.32}px;
        font-weight: 400;
        color: ${isOff ? 'rgba(255,255,255,0.5)' : '#fff'};
        line-height: 1;
        letter-spacing: -1px;
    `;
    if (isOff) {
        targetDisplay.textContent = 'OFF';
    } else {
        const tempValue = Math.round(targetTemp * 10) / 10;
        const tempInt = Math.floor(tempValue);
        const tempDec = Math.round((tempValue - tempInt) * 10);
        
        targetDisplay.innerHTML = `${tempInt}<span style="font-size: 0.5em; vertical-align: top;">.${tempDec}°</span>`;
    }
    centerContent.appendChild(targetDisplay);
    
    // Current temperature (secondary)
    if (currentTemp !== null) {
        const currentDisplay = document.createElement('div');
        currentDisplay.style.cssText = `
            font-size: 10px;
            color: rgba(255,255,255,0.6);
            margin-top: 4px;
        `;
        currentDisplay.textContent = `Currently ${Math.round(currentTemp * 10) / 10}°`;
        centerContent.appendChild(currentDisplay);
    }
    
    dialContainer.appendChild(centerContent);
    dialSection.appendChild(dialContainer);
    el.appendChild(dialSection);
    
    // === FEATURE DROPDOWNS ===
    const featuresSection = document.createElement('div');
    featuresSection.style.cssText = `
        padding: 0 8px 8px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;
    
    // HVAC Mode dropdown
    if (hvacModes.length > 0) {
        const modeRow = document.createElement('div');
        modeRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const modeLabel = document.createElement('div');
        modeLabel.style.cssText = `
            font-size: 11px;
            color: rgba(255,255,255,0.7);
            min-width: 45px;
        `;
        modeLabel.textContent = 'Mode';
        modeRow.appendChild(modeLabel);
        
        const modeSelect = document.createElement('select');
        modeSelect.style.cssText = `
            flex: 1;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 11px;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            padding-right: 24px;
        `;
        
        hvacModes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            option.selected = mode === hvacMode;
            option.style.background = '#333';
            modeSelect.appendChild(option);
        });
        
        modeRow.appendChild(modeSelect);
        featuresSection.appendChild(modeRow);
    }
    
    // Preset Mode dropdown (if available)
    if (presetModes.length > 0) {
        const presetRow = document.createElement('div');
        presetRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const presetLabel = document.createElement('div');
        presetLabel.style.cssText = `
            font-size: 11px;
            color: rgba(255,255,255,0.7);
            min-width: 45px;
        `;
        presetLabel.textContent = 'Preset';
        presetRow.appendChild(presetLabel);
        
        const presetSelect = document.createElement('select');
        presetSelect.style.cssText = `
            flex: 1;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 11px;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            padding-right: 24px;
        `;
        
        presetModes.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = preset.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            option.selected = preset === presetMode;
            option.style.background = '#333';
            presetSelect.appendChild(option);
        });
        
        presetRow.appendChild(presetSelect);
        featuresSection.appendChild(presetRow);
    }
    
    el.appendChild(featuresSection);
};

/**
 * Export to LVGL YAML
 */
const exportLVGL = (w, { common, convertColor }) => {
    const p = w.props || {};
    const entityId = w.entity_id || p.entity_id;
    
    if (!entityId) {
        return {
            obj: {
                ...common,
                bg_color: convertColor('#1c1c1c'),
                radius: 12,
                widgets: [
                    {
                        arc: {
                            align: 'center',
                            width: common.width - 48,
                            height: common.width - 48,
                            start_angle: 135,
                            end_angle: 45,
                            value: 50,
                            arc_color: convertColor('rgba(255,255,255,0.1)'),
                            indicator: { arc_color: convertColor('#ff8c00') }
                        }
                    },
                    {
                        label: {
                            align: 'center',
                            text: '"21°"',
                            text_color: convertColor('#ffffff'),
                            text_font: 'montserrat_28'
                        }
                    }
                ]
            }
        };
    }
    
    const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
    
    return {
        obj: {
            ...common,
            bg_color: convertColor('#1c1c1c'),
            radius: 12,
            layout: { type: 'flex', flex_flow: 'column' },
            widgets: [
                // Title
                {
                    label: {
                        width: '100%',
                        text: `"${p.title || 'Thermostat'}"`,
                        text_color: convertColor('#ffffff'),
                        text_font: 'montserrat_16',
                        pad_top: 16,
                        text_align: 'center'
                    }
                },
                // Dial area
                {
                    obj: {
                        width: '100%',
                        flex_grow: 1,
                        bg_opa: 0,
                        widgets: [
                            {
                                arc: {
                                    id: `${w.id}_arc`,
                                    align: 'center',
                                    width: common.width - 48,
                                    height: common.width - 48,
                                    start_angle: 135,
                                    end_angle: 45,
                                    min_value: (p.min_temp || 7) * 10,
                                    max_value: (p.max_temp || 35) * 10,
                                    value: `!lambda "return (int)(id(${safeId}_target).state * 10);"`,
                                    arc_color: convertColor('rgba(255,255,255,0.1)'),
                                    indicator: { arc_color: convertColor('#ff8c00') },
                                    mode: 'normal',
                                    adjustable: true
                                }
                            },
                            {
                                label: {
                                    id: `${w.id}_target`,
                                    align: 'center',
                                    y: -10,
                                    text: `!lambda "return str_sprintf(\"%.1f°\", id(${safeId}_target).state);"`,
                                    text_color: convertColor('#ffffff'),
                                    text_font: 'montserrat_28'
                                }
                            },
                            {
                                label: {
                                    id: `${w.id}_current`,
                                    align: 'center',
                                    y: 25,
                                    text: `!lambda "return str_sprintf(\"Currently %.1f°\", id(${safeId}_temp).state);"`,
                                    text_color: convertColor('rgba(255,255,255,0.6)'),
                                    text_font: 'montserrat_14'
                                }
                            }
                        ]
                    }
                },
                // Mode dropdown
                {
                    dropdown: {
                        id: `${w.id}_mode`,
                        width: common.width - 32,
                        align: 'bottom_mid',
                        y: -16,
                        options: ['Off', 'Heat', 'Cool', 'Auto'],
                        on_change: [{
                            homeassistant: {
                                service: 'climate.set_hvac_mode',
                                data: { entity_id: entityId }
                            }
                        }]
                    }
                }
            ]
        }
    };
};

/**
 * Register sensors for the climate entity
 */
const onExportNumericSensors = (context) => {
    const { widgets, lines, seenEntityIds, seenSensorIds } = context;
    if (!widgets) return;
    
    for (const w of widgets) {
        if (w.type !== 'ha_thermostat') continue;
        
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('climate.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Current temperature sensor
        if (!seenSensorIds?.has(`${safeId}_temp`)) {
            seenSensorIds?.add(`${safeId}_temp`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_temp`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: current_temperature`);
            lines.push(`  internal: true`);
        }
        
        // Target temperature sensor
        if (!seenSensorIds?.has(`${safeId}_target`)) {
            seenSensorIds?.add(`${safeId}_target`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_target`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: temperature`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_thermostat',
    name: 'HA Thermostat',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 160,
    height: 200,
    defaults: {
        entity_id: '',
        title: 'Thermostat',
        min_temp: 7,
        max_temp: 35,
        current_temp: 20,
        target_temp: 21,
        hvac_mode: 'heat'
    },
    render,
    exportLVGL,
    onExportNumericSensors
};
