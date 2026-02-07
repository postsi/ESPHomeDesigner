/**
 * @file transforms.js
 * @description Transform functions for binding value transformations.
 * These transforms are used both at design-time (preview) and exported to ESPHome lambdas.
 */

/**
 * Transform registry - maps transform names to their implementations
 * @type {Map<string, { apply: Function, toLambda: Function, description: string }>}
 */
const transforms = new Map();

/**
 * Register a transform
 * @param {string} name - Transform name
 * @param {Object} transform - Transform implementation
 */
export function registerTransform(name, transform) {
    transforms.set(name, transform);
}

/**
 * Get a transform by name
 * @param {string} name
 * @returns {Object|undefined}
 */
export function getTransform(name) {
    return transforms.get(name);
}

/**
 * Get all registered transform names
 * @returns {string[]}
 */
export function getTransformNames() {
    return Array.from(transforms.keys());
}

/**
 * Apply a transform to a value
 * @param {string} transformName - Name of the transform
 * @param {any} value - Value to transform
 * @param {Object} [config] - Transform configuration
 * @returns {any} Transformed value
 */
export function applyTransform(transformName, value, config = {}) {
    const transform = transforms.get(transformName);
    if (!transform) {
        console.warn(`Unknown transform: ${transformName}`);
        return value;
    }
    return transform.apply(value, config);
}

/**
 * Generate ESPHome lambda code for a transform
 * @param {string} transformName - Name of the transform
 * @param {string} inputExpr - Input expression (e.g., "x" or "id(sensor).state")
 * @param {Object} [config] - Transform configuration
 * @returns {string} Lambda expression
 */
export function transformToLambda(transformName, inputExpr, config = {}) {
    const transform = transforms.get(transformName);
    if (!transform) {
        return inputExpr;
    }
    return transform.toLambda(inputExpr, config);
}

// ============================================
// BUILT-IN TRANSFORMS
// ============================================

// Identity - pass through unchanged
registerTransform('identity', {
    description: 'Pass value through unchanged',
    apply: (value) => value,
    toLambda: (input) => input
});

// Round - round numeric value to specified precision
registerTransform('round', {
    description: 'Round to specified decimal places',
    apply: (value, config) => {
        const precision = config.precision ?? 0;
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return Number(num.toFixed(precision));
    },
    toLambda: (input, config) => {
        const precision = config.precision ?? 0;
        if (precision === 0) {
            return `(int)(${input})`;
        }
        const multiplier = Math.pow(10, precision);
        return `(round(${input} * ${multiplier}) / ${multiplier})`;
    }
});

// Percent - convert value to percentage (0-100)
registerTransform('percent', {
    description: 'Convert to percentage (0-100)',
    apply: (value, config) => {
        const max = config.max ?? 255;
        const num = parseFloat(value);
        if (isNaN(num)) return 0;
        return Math.round((num / max) * 100);
    },
    toLambda: (input, config) => {
        const max = config.max ?? 255;
        return `(int)((${input} / ${max}.0f) * 100)`;
    }
});

// Scale - linear scaling from one range to another
registerTransform('scale', {
    description: 'Scale value from one range to another',
    apply: (value, config) => {
        const { inMin = 0, inMax = 100, outMin = 0, outMax = 100 } = config;
        const num = parseFloat(value);
        if (isNaN(num)) return outMin;
        return ((num - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    },
    toLambda: (input, config) => {
        const { inMin = 0, inMax = 100, outMin = 0, outMax = 100 } = config;
        return `((${input} - ${inMin}) / (${inMax} - ${inMin}).0f) * (${outMax} - ${outMin}) + ${outMin}`;
    }
});

// Map - map specific values to other values
registerTransform('map', {
    description: 'Map specific values to other values',
    apply: (value, config) => {
        const map = config.map || {};
        const strValue = String(value);
        if (map.hasOwnProperty(strValue)) {
            return map[strValue];
        }
        return config.default !== undefined ? config.default : value;
    },
    toLambda: (input, config) => {
        const map = config.map || {};
        const entries = Object.entries(map);
        if (entries.length === 0) return input;
        
        // Generate nested ternary
        let result = config.default !== undefined ? 
            (typeof config.default === 'string' ? `"${config.default}"` : config.default) : 
            input;
        
        for (const [key, val] of entries.reverse()) {
            const keyExpr = typeof key === 'string' ? `"${key}"` : key;
            const valExpr = typeof val === 'string' ? `"${val}"` : val;
            result = `(${input} == ${keyExpr} ? ${valExpr} : ${result})`;
        }
        return result;
    }
});

// Bool to text - convert boolean to text
registerTransform('bool_to_text', {
    description: 'Convert boolean to text',
    apply: (value, config) => {
        const { trueText = 'On', falseText = 'Off' } = config;
        return value === true || value === 'on' || value === 'true' ? trueText : falseText;
    },
    toLambda: (input, config) => {
        const { trueText = 'On', falseText = 'Off' } = config;
        return `(${input} ? "${trueText}" : "${falseText}")`;
    }
});

// Format - format a number with unit
registerTransform('format', {
    description: 'Format number with unit and precision',
    apply: (value, config) => {
        const { precision = 1, unit = '', prefix = '' } = config;
        const num = parseFloat(value);
        if (isNaN(num)) return `${prefix}--${unit}`;
        return `${prefix}${num.toFixed(precision)}${unit}`;
    },
    toLambda: (input, config) => {
        const { precision = 1, unit = '', prefix = '' } = config;
        // ESPHome uses printf-style formatting
        return `!lambda 'return str_sprintf("${prefix}%.${precision}f${unit}", ${input});'`;
    }
});

// Clamp - clamp value to range
registerTransform('clamp', {
    description: 'Clamp value to min/max range',
    apply: (value, config) => {
        const { min = 0, max = 100 } = config;
        const num = parseFloat(value);
        if (isNaN(num)) return min;
        return Math.max(min, Math.min(max, num));
    },
    toLambda: (input, config) => {
        const { min = 0, max = 100 } = config;
        return `clamp((float)${input}, ${min}.0f, ${max}.0f)`;
    }
});

// Threshold - convert to boolean based on threshold
registerTransform('threshold', {
    description: 'Convert to boolean based on threshold',
    apply: (value, config) => {
        const { threshold = 50, above = true } = config;
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        return above ? num >= threshold : num <= threshold;
    },
    toLambda: (input, config) => {
        const { threshold = 50, above = true } = config;
        return above ? `(${input} >= ${threshold})` : `(${input} <= ${threshold})`;
    }
});

// Invert - invert a percentage (100 - value)
registerTransform('invert', {
    description: 'Invert percentage (100 - value)',
    apply: (value, config) => {
        const { max = 100 } = config;
        const num = parseFloat(value);
        if (isNaN(num)) return max;
        return max - num;
    },
    toLambda: (input, config) => {
        const { max = 100 } = config;
        return `(${max} - ${input})`;
    }
});

// Stringify - convert to string representation
registerTransform('stringify', {
    description: 'Convert value to string',
    apply: (value) => String(value),
    toLambda: (input) => `str_sprintf("%s", ${input})`
});

// Temperature unit conversion
registerTransform('celsius_to_fahrenheit', {
    description: 'Convert Celsius to Fahrenheit',
    apply: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return (num * 9/5) + 32;
    },
    toLambda: (input) => `((${input} * 9.0f / 5.0f) + 32.0f)`
});

registerTransform('fahrenheit_to_celsius', {
    description: 'Convert Fahrenheit to Celsius',
    apply: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return (num - 32) * 5/9;
    },
    toLambda: (input) => `((${input} - 32.0f) * 5.0f / 9.0f)`
});

// Custom lambda - pass through a custom lambda expression
registerTransform('lambda', {
    description: 'Custom lambda expression',
    apply: (value, config) => {
        // At design time, we can't execute arbitrary lambdas
        // Return the value unchanged or use a simple eval if safe
        return value;
    },
    toLambda: (input, config) => {
        const lambda = config.lambda || 'return x;';
        // Replace 'x' with the actual input expression
        return `!lambda '${lambda.replace(/\bx\b/g, input)}'`;
    }
});

// Color transform - convert state to color
registerTransform('state_to_color', {
    description: 'Map state to color',
    apply: (value, config) => {
        const { colors = {} } = config;
        const strValue = String(value).toLowerCase();
        return colors[strValue] || config.default || '#888888';
    },
    toLambda: (input, config) => {
        // This is typically handled differently in ESPHome
        // Return a placeholder that the YAML generator will handle
        return `__STATE_COLOR__:${JSON.stringify(config)}`;
    }
});

// Icon transform - convert state to MDI icon code
registerTransform('state_to_icon', {
    description: 'Map state to MDI icon',
    apply: (value, config) => {
        const { icons = {} } = config;
        const strValue = String(value).toLowerCase();
        return icons[strValue] || config.default || 'F02D6'; // mdi:help
    },
    toLambda: (input, config) => {
        // Icons are typically static in ESPHome LVGL
        return `__STATE_ICON__:${JSON.stringify(config)}`;
    }
});

export default {
    registerTransform,
    getTransform,
    getTransformNames,
    applyTransform,
    transformToLambda
};
