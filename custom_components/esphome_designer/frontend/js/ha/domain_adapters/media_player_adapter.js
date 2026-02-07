/**
 * @file media_player_adapter.js
 * @description Domain adapter for Home Assistant media_player entities.
 * Handles TVs, speakers, streaming devices, etc.
 */

import { BaseDomainAdapter } from './base_adapter.js';

/**
 * Media player feature flags (from HA MediaPlayerEntityFeature)
 */
export const MEDIA_PLAYER_FEATURES = {
    PAUSE: 1,
    SEEK: 2,
    VOLUME_SET: 4,
    VOLUME_MUTE: 8,
    PREVIOUS_TRACK: 16,
    NEXT_TRACK: 32,
    TURN_ON: 128,
    TURN_OFF: 256,
    PLAY_MEDIA: 512,
    VOLUME_STEP: 1024,
    SELECT_SOURCE: 2048,
    STOP: 4096,
    CLEAR_PLAYLIST: 8192,
    PLAY: 16384,
    SHUFFLE_SET: 32768,
    SELECT_SOUND_MODE: 65536,
    BROWSE_MEDIA: 131072,
    REPEAT_SET: 262144,
    GROUPING: 524288,
    MEDIA_ANNOUNCE: 1048576,
    MEDIA_ENQUEUE: 2097152
};

/**
 * Media player states
 */
export const MEDIA_PLAYER_STATES = {
    OFF: 'off',
    ON: 'on',
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    STANDBY: 'standby',
    BUFFERING: 'buffering'
};

/**
 * Media player domain adapter
 */
export class MediaPlayerAdapter extends BaseDomainAdapter {
    constructor() {
        super({
            domain: 'media_player',
            name: 'Media Player',
            icon: 'mdi:play-circle'
        });
    }

    /**
     * @override
     */
    extractCapabilities(entity) {
        const base = super.extractCapabilities(entity);
        const attrs = entity.attributes || {};
        const supportedFeatures = attrs.supported_features || 0;

        return {
            ...base,
            // Current state
            state: entity.state,
            isPlaying: entity.state === MEDIA_PLAYER_STATES.PLAYING,
            isPaused: entity.state === MEDIA_PLAYER_STATES.PAUSED,
            isOff: entity.state === MEDIA_PLAYER_STATES.OFF,
            isIdle: entity.state === MEDIA_PLAYER_STATES.IDLE,
            
            // Volume
            volumeLevel: attrs.volume_level, // 0-1
            volumePercent: attrs.volume_level !== undefined ? Math.round(attrs.volume_level * 100) : null,
            isMuted: attrs.is_volume_muted,
            
            // Media info
            mediaTitle: attrs.media_title,
            mediaArtist: attrs.media_artist,
            mediaAlbum: attrs.media_album_name,
            mediaContentType: attrs.media_content_type,
            mediaDuration: attrs.media_duration,
            mediaPosition: attrs.media_position,
            mediaImageUrl: attrs.entity_picture,
            
            // Source
            source: attrs.source,
            sourceList: attrs.source_list || [],
            
            // Sound mode
            soundMode: attrs.sound_mode,
            soundModeList: attrs.sound_mode_list || [],
            
            // Shuffle/Repeat
            shuffle: attrs.shuffle,
            repeat: attrs.repeat, // 'off', 'one', 'all'
            
            // Feature flags
            supportsPause: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.PAUSE),
            supportsPlay: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.PLAY),
            supportsStop: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.STOP),
            supportsSeek: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.SEEK),
            supportsVolumeSet: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.VOLUME_SET),
            supportsVolumeMute: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.VOLUME_MUTE),
            supportsVolumeStep: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.VOLUME_STEP),
            supportsPreviousTrack: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.PREVIOUS_TRACK),
            supportsNextTrack: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.NEXT_TRACK),
            supportsTurnOn: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.TURN_ON),
            supportsTurnOff: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.TURN_OFF),
            supportsSelectSource: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.SELECT_SOURCE),
            supportsSelectSoundMode: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.SELECT_SOUND_MODE),
            supportsShuffle: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.SHUFFLE_SET),
            supportsRepeat: !!(supportedFeatures & MEDIA_PLAYER_FEATURES.REPEAT_SET)
        };
    }

    /**
     * @override
     */
    getParameters(capabilities) {
        const params = [
            {
                id: 'media_player_entity',
                name: 'Media Player Entity',
                type: 'entity',
                required: true,
                description: 'Select a media player entity',
                domainConstraint: {
                    domains: ['media_player']
                }
            },
            {
                id: 'show_media_info',
                name: 'Show Media Info',
                type: 'boolean',
                defaultValue: true,
                description: 'Display current media title/artist'
            },
            {
                id: 'show_artwork',
                name: 'Show Artwork',
                type: 'boolean',
                defaultValue: false,
                description: 'Display album/media artwork'
            },
            {
                id: 'show_volume',
                name: 'Show Volume',
                type: 'boolean',
                defaultValue: capabilities?.supportsVolumeSet || false,
                description: 'Display volume slider'
            },
            {
                id: 'show_progress',
                name: 'Show Progress',
                type: 'boolean',
                defaultValue: capabilities?.supportsSeek || false,
                description: 'Display playback progress bar'
            }
        ];

        if (capabilities?.supportsSelectSource && capabilities.sourceList?.length > 0) {
            params.push({
                id: 'show_source',
                name: 'Show Source Selector',
                type: 'boolean',
                defaultValue: false,
                description: 'Display source/input selector'
            });
        }

        params.push({
            id: 'accent_color',
            name: 'Accent Color',
            type: 'color',
            defaultValue: '#1db954',
            description: 'Color for playback controls'
        });

        return params;
    }

    /**
     * @override
     */
    getDefaultReadBindings(capabilities) {
        const bindings = [];
        const entityParam = 'media_player_entity';

        // State
        bindings.push(this._createReadBinding(entityParam, 'props.state', {
            transform: 'identity'
        }));

        // Media title
        bindings.push(this._createReadBinding(entityParam, 'props.media_title', {
            attribute: 'media_title',
            transform: 'identity',
            availability: {
                onUnavailable: 'hide',
                onUnknown: 'hide'
            }
        }));

        // Media artist
        bindings.push(this._createReadBinding(entityParam, 'props.media_artist', {
            attribute: 'media_artist',
            transform: 'identity',
            availability: {
                onUnavailable: 'hide',
                onUnknown: 'hide'
            }
        }));

        // Volume
        if (capabilities?.supportsVolumeSet) {
            bindings.push(this._createReadBinding(entityParam, 'props.volume', {
                attribute: 'volume_level',
                transform: 'percent',
                transformConfig: { max: 1 }
            }));
        }

        // Muted
        if (capabilities?.supportsVolumeMute) {
            bindings.push(this._createReadBinding(entityParam, 'props.is_muted', {
                attribute: 'is_volume_muted',
                transform: 'identity'
            }));
        }

        // Source
        if (capabilities?.supportsSelectSource) {
            bindings.push(this._createReadBinding(entityParam, 'props.source', {
                attribute: 'source',
                transform: 'identity'
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getDefaultWriteBindings(capabilities) {
        const bindings = [];
        const entityParam = 'media_player_entity';

        // Play/Pause toggle
        bindings.push(this._createWriteBinding('on_play_pause', 'media_player.media_play_pause', entityParam, {
            debounce: false
        }));

        // Play
        if (capabilities?.supportsPlay) {
            bindings.push(this._createWriteBinding('on_play', 'media_player.media_play', entityParam, {
                debounce: false
            }));
        }

        // Pause
        if (capabilities?.supportsPause) {
            bindings.push(this._createWriteBinding('on_pause', 'media_player.media_pause', entityParam, {
                debounce: false
            }));
        }

        // Stop
        if (capabilities?.supportsStop) {
            bindings.push(this._createWriteBinding('on_stop', 'media_player.media_stop', entityParam, {
                debounce: false
            }));
        }

        // Previous track
        if (capabilities?.supportsPreviousTrack) {
            bindings.push(this._createWriteBinding('on_previous', 'media_player.media_previous_track', entityParam, {
                debounce: false
            }));
        }

        // Next track
        if (capabilities?.supportsNextTrack) {
            bindings.push(this._createWriteBinding('on_next', 'media_player.media_next_track', entityParam, {
                debounce: false
            }));
        }

        // Volume set
        if (capabilities?.supportsVolumeSet) {
            bindings.push(this._createWriteBinding('on_volume_change', 'media_player.volume_set', entityParam, {
                dynamicPayload: {
                    'props.volume': 'volume_level'
                },
                debounce: true,
                debounceMs: 200
            }));
        }

        // Volume mute
        if (capabilities?.supportsVolumeMute) {
            bindings.push(this._createWriteBinding('on_mute_toggle', 'media_player.volume_mute', entityParam, {
                dynamicPayload: {
                    'props.is_muted': 'is_volume_muted'
                },
                debounce: false
            }));
        }

        // Volume up/down
        if (capabilities?.supportsVolumeStep) {
            bindings.push(this._createWriteBinding('on_volume_up', 'media_player.volume_up', entityParam, {
                debounce: false
            }));
            bindings.push(this._createWriteBinding('on_volume_down', 'media_player.volume_down', entityParam, {
                debounce: false
            }));
        }

        // Source select
        if (capabilities?.supportsSelectSource) {
            bindings.push(this._createWriteBinding('on_source_change', 'media_player.select_source', entityParam, {
                dynamicPayload: {
                    'props.source': 'source'
                },
                debounce: false
            }));
        }

        // Turn on/off
        if (capabilities?.supportsTurnOn) {
            bindings.push(this._createWriteBinding('on_turn_on', 'media_player.turn_on', entityParam, {
                debounce: false
            }));
        }
        if (capabilities?.supportsTurnOff) {
            bindings.push(this._createWriteBinding('on_turn_off', 'media_player.turn_off', entityParam, {
                debounce: false
            }));
        }

        return bindings;
    }

    /**
     * @override
     */
    getStateDisplay(entity) {
        const attrs = entity.attributes || {};
        
        let icon;
        let color = '#9e9e9e';
        let text = entity.state;

        switch (entity.state) {
            case MEDIA_PLAYER_STATES.PLAYING:
                icon = 'mdi:play';
                color = '#1db954';
                text = attrs.media_title || 'Playing';
                break;
            case MEDIA_PLAYER_STATES.PAUSED:
                icon = 'mdi:pause';
                color = '#ff9800';
                text = 'Paused';
                break;
            case MEDIA_PLAYER_STATES.IDLE:
                icon = 'mdi:stop';
                text = 'Idle';
                break;
            case MEDIA_PLAYER_STATES.OFF:
            case MEDIA_PLAYER_STATES.STANDBY:
                icon = 'mdi:power-standby';
                color = '#424242';
                text = 'Off';
                break;
            case MEDIA_PLAYER_STATES.BUFFERING:
                icon = 'mdi:loading';
                color = '#2196f3';
                text = 'Buffering';
                break;
            default:
                icon = 'mdi:play-circle-outline';
        }

        return { text, icon, color };
    }

    /**
     * @override
     */
    getServices() {
        return [
            { service: 'media_player.turn_on', name: 'Turn On' },
            { service: 'media_player.turn_off', name: 'Turn Off' },
            { service: 'media_player.media_play', name: 'Play' },
            { service: 'media_player.media_pause', name: 'Pause' },
            { service: 'media_player.media_play_pause', name: 'Play/Pause' },
            { service: 'media_player.media_stop', name: 'Stop' },
            { service: 'media_player.media_next_track', name: 'Next Track' },
            { service: 'media_player.media_previous_track', name: 'Previous Track' },
            {
                service: 'media_player.volume_set',
                name: 'Set Volume',
                fields: { volume_level: { type: 'number', min: 0, max: 1, required: true } }
            },
            { service: 'media_player.volume_up', name: 'Volume Up' },
            { service: 'media_player.volume_down', name: 'Volume Down' },
            {
                service: 'media_player.volume_mute',
                name: 'Mute',
                fields: { is_volume_muted: { type: 'boolean', required: true } }
            },
            {
                service: 'media_player.select_source',
                name: 'Select Source',
                fields: { source: { type: 'string', required: true } }
            }
        ];
    }
}

export default new MediaPlayerAdapter();
