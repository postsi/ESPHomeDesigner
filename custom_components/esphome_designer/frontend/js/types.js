/**
 * @file types.js
 * @description Central JSDoc type definitions for ESPHome Designer.
 */

// ============================================================================
// SCHEMA VERSION
// ============================================================================
// Increment MINOR for backwards-compatible additions (new optional fields)
// Increment MAJOR for breaking changes (field renames, removals, type changes)
// ============================================================================

/** @type {number} Current schema version for project files */
export const SCHEMA_VERSION = 2;

/** @type {number} Minimum schema version that can be migrated */
export const MIN_SUPPORTED_SCHEMA_VERSION = 1;

// ============================================================================
// CORE WIDGET TYPES
// ============================================================================

/**
 * @typedef {Object} WidgetConfig
 * @property {string} id - Unique widget identifier
 * @property {string} type - Widget type (text, icon, sensor_text, etc.)
 * @property {number} x - X position in pixels
 * @property {number} y - Y position in pixels
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {string} [entity_id] - Home Assistant entity ID
 * @property {boolean} [hidden] - Whether the widget is hidden from canvas and export
 * @property {boolean} [locked] - Whether the widget is locked from editing
 * @property {string} [parentId] - Parent widget ID for grouping
 * @property {Object} [props] - Widget-specific properties
 * @property {ReadBinding[]} [readBindings] - Bindings for reading HA entity state
 * @property {WriteBinding[]} [writeBindings] - Bindings for writing to HA services
 */

/**
 * @typedef {Object} PageConfig
 * @property {string} id - Unique page identifier
 * @property {string} name - Display name
 * @property {WidgetConfig[]} widgets - Widgets on this page
 * @property {string} [layout] - Grid layout (e.g., "2x3")
 * @property {string} [dark_mode] - Dark mode setting ("inherit", "always", "never")
 * @property {string} [refresh_type] - Refresh mode ("interval", "smart", "manual")
 * @property {number|string} [refresh_time] - Refresh interval
 */

/**
 * @typedef {Object} ProjectPayload
 * @property {number} [schemaVersion] - Schema version for migration support
 * @property {string} deviceName - User-defined device name
 * @property {string} [deviceModel] - Hardware device model ID
 * @property {string} [currentLayoutId] - Current layout identifier
 * @property {PageConfig[]} pages - Pages in the project
 * @property {ControlDefinition[]} [controls] - User-defined reusable controls
 * @property {Object} [deviceSettings] - Hardware-specific settings
 * @property {Object} [customHardware] - Custom hardware configuration
 * @property {string} [renderingMode] - Rendering mode (direct, lvgl, oepl, opendisplay)
 */

// ============================================================================
// HOME ASSISTANT BINDING PRIMITIVES
// ============================================================================

/**
 * Transform function types for ReadBinding
 * @typedef {'identity' | 'round' | 'floor' | 'ceil' | 'percent' | 'bool_to_text' | 'map' | 'lambda'} TransformType
 */

/**
 * Availability policy for handling unknown/unavailable entity states
 * @typedef {Object} AvailabilityPolicy
 * @property {'hide' | 'disable' | 'show_placeholder' | 'show_last'} onUnavailable - Action when entity is unavailable
 * @property {'hide' | 'disable' | 'show_placeholder' | 'show_last'} onUnknown - Action when entity state is unknown
 * @property {string} [placeholderText] - Text to show when using show_placeholder
 * @property {string} [placeholderIcon] - Icon to show when using show_placeholder
 */

/**
 * Read binding - subscribes to HA entity state and maps to widget property
 * @typedef {Object} ReadBinding
 * @property {string} id - Unique binding identifier
 * @property {string} entityParam - Parameter name that provides the entity_id (e.g., "climate_entity")
 * @property {string} [attribute] - Entity attribute to read (omit for state)
 * @property {string} targetProperty - Widget property to update (e.g., "props.value", "props.text")
 * @property {TransformType} [transform] - Transform function to apply
 * @property {Object} [transformConfig] - Configuration for the transform
 * @property {string} [transformConfig.lambda] - Lambda expression for 'lambda' transform
 * @property {Object} [transformConfig.map] - Value mapping for 'map' transform
 * @property {number} [transformConfig.precision] - Decimal precision for numeric transforms
 * @property {string} [transformConfig.trueText] - Text for true value in bool_to_text
 * @property {string} [transformConfig.falseText] - Text for false value in bool_to_text
 * @property {AvailabilityPolicy} [availability] - How to handle unavailable/unknown states
 */

/**
 * Write binding - triggers HA service call on widget event
 * @typedef {Object} WriteBinding
 * @property {string} id - Unique binding identifier
 * @property {string} event - Widget event that triggers the binding (e.g., "on_click", "on_value_change")
 * @property {string} service - HA service to call (e.g., "climate.set_temperature", "light.toggle")
 * @property {string} entityParam - Parameter name that provides the entity_id
 * @property {Object} [staticPayload] - Static service data fields
 * @property {Object} [dynamicPayload] - Dynamic payload mappings (widget prop -> service data field)
 * @property {string} [confirmPrompt] - Confirmation prompt before executing (null = no confirm)
 * @property {boolean} [debounce] - Whether to debounce rapid calls
 * @property {number} [debounceMs] - Debounce delay in milliseconds (default: 500)
 */

// ============================================================================
// CONTROL SYSTEM (Reusable Composite Widgets)
// ============================================================================

/**
 * Parameter types for control definitions
 * @typedef {'entity' | 'string' | 'number' | 'boolean' | 'color' | 'icon' | 'select'} ControlParameterType
 */

/**
 * Domain constraint for entity parameters
 * @typedef {Object} DomainConstraint
 * @property {string[]} domains - Allowed HA domains (e.g., ["climate", "water_heater"])
 * @property {string[]} [requiredFeatures] - Required entity features
 * @property {string[]} [requiredAttributes] - Required entity attributes
 */

/**
 * Parameter definition for a control
 * @typedef {Object} ControlParameter
 * @property {string} id - Unique parameter identifier (used in bindings)
 * @property {string} name - Display name for the parameter
 * @property {ControlParameterType} type - Parameter type
 * @property {any} [defaultValue] - Default value if not provided
 * @property {boolean} [required] - Whether the parameter is required
 * @property {string} [description] - Help text for the parameter
 * @property {DomainConstraint} [domainConstraint] - For 'entity' type: allowed domains
 * @property {string[]} [options] - For 'select' type: available options
 * @property {number} [min] - For 'number' type: minimum value
 * @property {number} [max] - For 'number' type: maximum value
 * @property {number} [step] - For 'number' type: step increment
 */

/**
 * Control definition - a reusable composite widget template
 * @typedef {Object} ControlDefinition
 * @property {string} id - Unique control identifier
 * @property {string} name - Display name
 * @property {string} [description] - Description of the control
 * @property {string} [category] - Category for organization (e.g., "Climate", "Lighting")
 * @property {string} [icon] - MDI icon for the control
 * @property {number} version - Control definition version
 * @property {ControlParameter[]} parameters - Exposed parameters
 * @property {WidgetConfig[]} template - Internal widget tree (with binding references)
 * @property {Object} [defaultSize] - Default dimensions
 * @property {number} [defaultSize.width] - Default width
 * @property {number} [defaultSize.height] - Default height
 * @property {boolean} [scalable] - Whether the control supports scaling
 * @property {string[]} [tags] - Tags for search/filtering
 */

/**
 * Control instance - a placed instance of a control definition
 * @typedef {Object} ControlInstance
 * @property {string} id - Unique instance identifier
 * @property {string} controlId - Reference to the ControlDefinition
 * @property {number} x - X position in pixels
 * @property {number} y - Y position in pixels
 * @property {number} [width] - Override width (if scalable)
 * @property {number} [height] - Override height (if scalable)
 * @property {Object.<string, any>} parameterValues - Bound parameter values
 * @property {boolean} [hidden] - Whether the instance is hidden
 * @property {boolean} [locked] - Whether the instance is locked
 */

// ============================================================================
// DOMAIN ADAPTER TYPES
// ============================================================================

/**
 * Domain adapter - provides domain-specific logic for HA entity types
 * @typedef {Object} DomainAdapter
 * @property {string} domain - HA domain (e.g., "climate", "light")
 * @property {string} name - Display name
 * @property {string} icon - Default icon for the domain
 * @property {function(Object): Object} extractCapabilities - Extract capabilities from entity
 * @property {function(Object): ControlParameter[]} getParameters - Get domain-specific parameters
 * @property {function(Object): ReadBinding[]} getDefaultReadBindings - Get default read bindings
 * @property {function(Object): WriteBinding[]} getDefaultWriteBindings - Get default write bindings
 */

/**
 * @typedef {Object} DeviceProfile
 * @property {string} name - Display name
 * @property {Object} features - Supported features (e-paper, battery, etc.)
 * @property {Object} pins - IO Pin mappings
 * @property {boolean} [isPackageBased] - Whether to use local package generation
 * @property {Object} [resolution] - Display resolution {width, height}
 */

/**
 * @typedef {Object} GenerationContext
 * @property {string[]} lines - Output buffer for YAML lines
 * @property {function(string, number, number, boolean=): string} addFont - Register a font and return its ID
 * @property {function(string): string} getColorConst - Get C++ color constant (e.g. COLOR_WHITE)
 * @property {function(Object): string} getCondProps - Get condition metadata tags
 * @property {function(Object): string|null} getConditionCheck - Get C++ if-statement for conditions
 * @property {function(string[], string, boolean, number, number, number, number): void} addDitherMask - Apply dither mask
 * @property {boolean} isEpaper - Whether target is an e-paper
 * @property {Object} [profile] - Active device profile
 */

/**
 * @typedef {Object} PluginInterface
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Display name
 * @property {string} category - UI category
 * @property {Object} defaults - Default properties
 * @property {function(HTMLElement, WidgetConfig, Object): void} render - Canvas render function
 * @property {function(WidgetConfig, GenerationContext): any} export - YAML export function
 * @property {function(WidgetConfig, Object): void} [collectRequirements] - Requirement tracking hook
 * @property {function(Object): void} [onExportGlobals] - Global definitions hook
 * @property {function(Object): void} [onExportHelpers] - Helper functions hook
 * @property {function(Object): void} [onExportNumericSensors] - Numeric sensors hook
 * @property {function(Object): void} [onExportTextSensors] - Text sensors hook
 * @property {function(Object): void} [onExportBinarySensors] - Binary sensors hook
 * @property {function(Object): void} [onExportSelects] - Selects hook
 */
