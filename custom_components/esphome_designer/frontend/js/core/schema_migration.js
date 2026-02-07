/**
 * @file schema_migration.js
 * @description Handles migration of project data between schema versions.
 */

import { SCHEMA_VERSION, MIN_SUPPORTED_SCHEMA_VERSION } from '../types.js';
import { Logger } from '../utils/logger.js';
import { generateId } from '../utils/helpers.js';

/**
 * Migration functions indexed by target version.
 * Each function takes the project data and returns the migrated data.
 * @type {Object.<number, function(Object): Object>}
 */
const migrations = {
    /**
     * Migration to version 2: Add schema versioning and control foundations
     * - Adds schemaVersion field
     * - Ensures all pages have id fields
     * - Initializes empty controls array
     * - Normalizes widget structure
     */
    2: (data) => {
        Logger.log('[SchemaMigration] Migrating to schema version 2');
        
        const migrated = { ...data };
        
        // Ensure pages have IDs
        if (migrated.pages && Array.isArray(migrated.pages)) {
            migrated.pages = migrated.pages.map((page, index) => {
                if (!page.id) {
                    return {
                        ...page,
                        id: `page_${Date.now()}_${index}`
                    };
                }
                return page;
            });
        }
        
        // Initialize controls array if not present
        if (!migrated.controls) {
            migrated.controls = [];
        }
        
        // Normalize widgets - ensure consistent structure
        if (migrated.pages) {
            migrated.pages.forEach(page => {
                if (page.widgets && Array.isArray(page.widgets)) {
                    page.widgets = page.widgets.map(widget => normalizeWidget(widget));
                }
            });
        }
        
        migrated.schemaVersion = 2;
        return migrated;
    }
};

/**
 * Normalizes a widget to ensure consistent structure
 * @param {Object} widget - The widget to normalize
 * @returns {Object} Normalized widget
 */
function normalizeWidget(widget) {
    const normalized = { ...widget };
    
    // Ensure ID exists
    if (!normalized.id) {
        normalized.id = generateId();
    }
    
    // Normalize dimensions (support both width/height and w/h)
    if (normalized.w !== undefined && normalized.width === undefined) {
        normalized.width = normalized.w;
    }
    if (normalized.h !== undefined && normalized.height === undefined) {
        normalized.height = normalized.h;
    }
    
    // Ensure props object exists
    if (!normalized.props) {
        normalized.props = {};
    }
    
    // Initialize binding arrays if not present (optional, for future use)
    // We don't add these by default to keep the data clean
    // They will be added when the user creates bindings
    
    return normalized;
}

/**
 * Detects the schema version of project data
 * @param {Object} data - Project data
 * @returns {number} Detected schema version
 */
export function detectSchemaVersion(data) {
    // Explicit version field
    if (data.schemaVersion !== undefined) {
        return data.schemaVersion;
    }
    
    // Version 1 indicators (legacy format)
    // - No schemaVersion field
    // - Has pages array
    // - Pages may lack id fields
    if (data.pages && Array.isArray(data.pages)) {
        return 1;
    }
    
    // Unknown format - assume version 1
    return 1;
}

/**
 * Checks if project data needs migration
 * @param {Object} data - Project data
 * @returns {boolean} True if migration is needed
 */
export function needsMigration(data) {
    const version = detectSchemaVersion(data);
    return version < SCHEMA_VERSION;
}

/**
 * Checks if project data can be migrated
 * @param {Object} data - Project data
 * @returns {{canMigrate: boolean, reason?: string}} Migration status
 */
export function canMigrate(data) {
    const version = detectSchemaVersion(data);
    
    if (version > SCHEMA_VERSION) {
        return {
            canMigrate: false,
            reason: `Project was created with a newer version (${version}). Please update ESPHome Designer.`
        };
    }
    
    if (version < MIN_SUPPORTED_SCHEMA_VERSION) {
        return {
            canMigrate: false,
            reason: `Project version (${version}) is too old and cannot be migrated.`
        };
    }
    
    return { canMigrate: true };
}

/**
 * Migrates project data to the current schema version
 * @param {Object} data - Project data to migrate
 * @returns {{data: Object, migrated: boolean, fromVersion: number, toVersion: number}}
 */
export function migrateProject(data) {
    const fromVersion = detectSchemaVersion(data);
    
    // Check if migration is possible
    const { canMigrate: canDo, reason } = canMigrate(data);
    if (!canDo) {
        throw new Error(reason);
    }
    
    // No migration needed
    if (fromVersion >= SCHEMA_VERSION) {
        return {
            data,
            migrated: false,
            fromVersion,
            toVersion: fromVersion
        };
    }
    
    // Apply migrations sequentially
    let migrated = { ...data };
    let currentVersion = fromVersion;
    
    while (currentVersion < SCHEMA_VERSION) {
        const targetVersion = currentVersion + 1;
        const migrationFn = migrations[targetVersion];
        
        if (!migrationFn) {
            throw new Error(`Missing migration function for version ${targetVersion}`);
        }
        
        Logger.log(`[SchemaMigration] Applying migration ${currentVersion} -> ${targetVersion}`);
        migrated = migrationFn(migrated);
        currentVersion = targetVersion;
    }
    
    Logger.log(`[SchemaMigration] Migration complete: ${fromVersion} -> ${SCHEMA_VERSION}`);
    
    return {
        data: migrated,
        migrated: true,
        fromVersion,
        toVersion: SCHEMA_VERSION
    };
}

/**
 * Stamps the current schema version on project data
 * @param {Object} data - Project data
 * @returns {Object} Data with schema version
 */
export function stampSchemaVersion(data) {
    return {
        ...data,
        schemaVersion: SCHEMA_VERSION
    };
}

/**
 * Gets the current schema version
 * @returns {number} Current schema version
 */
export function getCurrentSchemaVersion() {
    return SCHEMA_VERSION;
}
