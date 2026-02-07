/**
 * Home Assistant Media Player Widget Plugin
 * Mimics the HA media player card with artwork, controls, and volume
 */

function getMediaPlayerData(entityId) {
    if (!entityId || !window.AppState?.entityStates) return null;
    const entity = window.AppState.entityStates[entityId];
    if (!entity) return null;
    
    const attrs = entity.attributes || {};
    const features = attrs.supported_features || 0;
    
    return {
        state: entity.state || 'off',
        isPlaying: entity.state === 'playing',
        isPaused: entity.state === 'paused',
        isIdle: entity.state === 'idle',
        isOff: entity.state === 'off',
        mediaTitle: attrs.media_title ?? null,
        mediaArtist: attrs.media_artist ?? null,
        mediaAlbum: attrs.media_album_name ?? null,
        mediaDuration: attrs.media_duration ?? null,
        mediaPosition: attrs.media_position ?? null,
        volumeLevel: attrs.volume_level ?? 0.5,
        isMuted: attrs.is_volume_muted ?? false,
        source: attrs.source ?? null,
        sourceList: attrs.source_list ?? [],
        entityPicture: attrs.entity_picture ?? null,
        friendlyName: attrs.friendly_name || entityId?.split('.')[1] || 'Media Player',
        supportsPause: (features & 1) !== 0,
        supportsSeek: (features & 2) !== 0,
        supportsVolumeSet: (features & 4) !== 0,
        supportsVolumeMute: (features & 8) !== 0,
        supportsPrevious: (features & 16) !== 0,
        supportsNext: (features & 32) !== 0,
        supportsTurnOn: (features & 128) !== 0,
        supportsTurnOff: (features & 256) !== 0,
        supportsPlayMedia: (features & 512) !== 0,
        supportsVolumeStep: (features & 1024) !== 0,
        supportsSelectSource: (features & 2048) !== 0,
        supportsStop: (features & 4096) !== 0,
        supportsPlay: (features & 16384) !== 0
    };
}

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const width = widget.width || 200;
    const height = widget.height || 180;
    
    const entityId = widget.entity_id || props.entity_id;
    const mediaData = getMediaPlayerData(entityId);
    
    const state = mediaData?.state ?? 'idle';
    const isPlaying = mediaData?.isPlaying ?? false;
    const isPaused = mediaData?.isPaused ?? false;
    const mediaTitle = mediaData?.mediaTitle ?? props.media_title ?? '';
    const mediaArtist = mediaData?.mediaArtist ?? props.media_artist ?? '';
    const volumeLevel = mediaData?.volumeLevel ?? props.volume ?? 0.5;
    const friendlyName = mediaData?.friendlyName ?? props.title ?? 'Media Player';
    
    const accentColor = props.accent_color || '#1db954';
    const isActive = isPlaying || isPaused;
    
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
    
    // Header with name
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${isActive ? accentColor + '30' : '#333'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: ${isActive ? accentColor : '#666'};
    `;
    iconEl.textContent = '🎵';
    header.appendChild(iconEl);
    
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
        flex: 1;
        font-size: 12px;
        font-weight: 500;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    nameLabel.textContent = friendlyName;
    header.appendChild(nameLabel);
    
    el.appendChild(header);
    
    // Media info
    const mediaInfo = document.createElement('div');
    mediaInfo.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 40px;
    `;
    
    if (mediaTitle) {
        const titleEl = document.createElement('div');
        titleEl.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        titleEl.textContent = mediaTitle;
        mediaInfo.appendChild(titleEl);
    }
    
    if (mediaArtist) {
        const artistEl = document.createElement('div');
        artistEl.style.cssText = `
            font-size: 12px;
            color: #888;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        artistEl.textContent = mediaArtist;
        mediaInfo.appendChild(artistEl);
    }
    
    if (!mediaTitle && !mediaArtist) {
        const stateEl = document.createElement('div');
        stateEl.style.cssText = `
            font-size: 14px;
            color: #666;
            text-transform: capitalize;
        `;
        stateEl.textContent = state;
        mediaInfo.appendChild(stateEl);
    }
    
    el.appendChild(mediaInfo);
    
    // Playback controls
    const controls = document.createElement('div');
    controls.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    `;
    
    const buttonStyle = `
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background: #333;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const prevBtn = document.createElement('button');
    prevBtn.style.cssText = buttonStyle;
    prevBtn.innerHTML = '⏮';
    prevBtn.title = 'Previous';
    controls.appendChild(prevBtn);
    
    const playBtn = document.createElement('button');
    playBtn.style.cssText = buttonStyle + `
        width: 44px;
        height: 44px;
        font-size: 18px;
        background: ${accentColor};
    `;
    playBtn.innerHTML = isPlaying ? '⏸' : '▶';
    playBtn.title = isPlaying ? 'Pause' : 'Play';
    controls.appendChild(playBtn);
    
    const nextBtn = document.createElement('button');
    nextBtn.style.cssText = buttonStyle;
    nextBtn.innerHTML = '⏭';
    nextBtn.title = 'Next';
    controls.appendChild(nextBtn);
    
    el.appendChild(controls);
    
    // Volume slider
    const volumeRow = document.createElement('div');
    volumeRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    const volumeIcon = document.createElement('div');
    volumeIcon.style.cssText = `
        font-size: 12px;
        color: #666;
    `;
    volumeIcon.textContent = '🔊';
    volumeRow.appendChild(volumeIcon);
    
    const volumeTrack = document.createElement('div');
    volumeTrack.style.cssText = `
        flex: 1;
        height: 4px;
        background: #333;
        border-radius: 2px;
        position: relative;
        overflow: hidden;
    `;
    
    const volumeFill = document.createElement('div');
    volumeFill.style.cssText = `
        width: ${volumeLevel * 100}%;
        height: 100%;
        background: ${accentColor};
        border-radius: 2px;
    `;
    volumeTrack.appendChild(volumeFill);
    volumeRow.appendChild(volumeTrack);
    
    const volumeLabel = document.createElement('div');
    volumeLabel.style.cssText = `
        font-size: 10px;
        color: #666;
        width: 28px;
        text-align: right;
    `;
    volumeLabel.textContent = `${Math.round(volumeLevel * 100)}%`;
    volumeRow.appendChild(volumeLabel);
    
    el.appendChild(volumeRow);
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
                        pad_column: 8,
                        widgets: [
                            {
                                obj: {
                                    width: 28,
                                    height: 28,
                                    radius: 'circle',
                                    bg_color: convertColor('#333333')
                                }
                            },
                            {
                                label: {
                                    text: `"${p.title || 'Media Player'}"`,
                                    text_color: convertColor('#888888'),
                                    text_font: 'montserrat_12'
                                }
                            }
                        ]
                    }
                },
                // Media info
                {
                    obj: {
                        width: '100%',
                        height: 'content',
                        bg_opa: 'transp',
                        layout: { type: 'flex', flex_flow: 'column' },
                        widgets: [
                            {
                                label: {
                                    id: `${w.id}_title`,
                                    text: '"No media"',
                                    text_color: convertColor('#ffffff'),
                                    text_font: 'montserrat_14'
                                }
                            },
                            {
                                label: {
                                    id: `${w.id}_artist`,
                                    text: '""',
                                    text_color: convertColor('#888888'),
                                    text_font: 'montserrat_12'
                                }
                            }
                        ]
                    }
                },
                // Controls
                {
                    buttonmatrix: {
                        id: `${w.id}_controls`,
                        width: '100%',
                        height: 44,
                        rows: [
                            { buttons: [
                                { id: 'prev', text: '⏮' },
                                { id: 'play', text: '▶' },
                                { id: 'next', text: '⏭' }
                            ]}
                        ],
                        items: {
                            bg_color: convertColor('#333333'),
                            text_color: convertColor('#ffffff')
                        }
                    }
                },
                // Volume
                {
                    slider: {
                        id: `${w.id}_volume`,
                        width: '100%',
                        height: 20,
                        value: 50,
                        min_value: 0,
                        max_value: 100,
                        bg_color: convertColor('#333333'),
                        indicator: { bg_color: convertColor(p.accent_color || '#1db954') },
                        knob: { bg_color: convertColor('#ffffff') }
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
        if (w.type !== 'ha_media_player') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('media_player.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!seenSensorIds?.has(`${safeId}_volume`)) {
            seenSensorIds?.add(`${safeId}_volume`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_volume`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: volume_level`);
            lines.push(`  internal: true`);
        }
    }
};

const onExportTextSensors = (context) => {
    const { widgets, lines, seenSensorIds } = context;
    if (!widgets) return;
    
    for (const w of widgets) {
        if (w.type !== 'ha_media_player') continue;
        const entityId = (w.entity_id || w.props?.entity_id || '').trim();
        if (!entityId || !entityId.startsWith('media_player.')) continue;
        
        const safeId = entityId.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Media title
        if (!seenSensorIds?.has(`${safeId}_title`)) {
            seenSensorIds?.add(`${safeId}_title`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_title`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: media_title`);
            lines.push(`  internal: true`);
        }
        
        // Media artist
        if (!seenSensorIds?.has(`${safeId}_artist`)) {
            seenSensorIds?.add(`${safeId}_artist`);
            lines.push(`- platform: homeassistant`);
            lines.push(`  id: ${safeId}_artist`);
            lines.push(`  entity_id: ${entityId}`);
            lines.push(`  attribute: media_artist`);
            lines.push(`  internal: true`);
        }
    }
};

export default {
    id: 'ha_media_player',
    name: 'HA Media Player',
    category: 'Home Assistant',
    supportedModes: ['lvgl'],
    width: 200,
    height: 180,
    defaults: {
        entity_id: '',
        title: 'Media Player',
        accent_color: '#1db954',
        media_title: '',
        media_artist: '',
        volume: 0.5
    },
    render,
    exportLVGL,
    onExportNumericSensors,
    onExportTextSensors
};
