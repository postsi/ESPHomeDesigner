/**
 * @file index.js
 * @description Controls module - Exports all control-related functionality.
 */

export { ControlFactory } from './control_factory.js';
export { controlRegistry } from './control_registry.js';
export { 
    BUILTIN_CONTROLS,
    getBuiltinControls,
    getBuiltinControlById,
    getBuiltinControlsByCategory,
    getBuiltinControlCategories
} from './builtin_controls.js';
