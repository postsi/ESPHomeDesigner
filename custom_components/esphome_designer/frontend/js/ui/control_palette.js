/**
 * @file control_palette.js
 * @description UI component for browsing and adding reusable controls.
 * Displays built-in and custom controls organized by category.
 */

import { controlRegistry } from '../controls/control_registry.js';
import { ControlFactory } from '../controls/control_factory.js';
import { AppState } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { Logger } from '../utils/logger.js';

/**
 * Icons for control categories
 */
const CATEGORY_ICONS = {
    Climate: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2a2 2 0 00-2 2v10.1a4 4 0 104 0V4a2 2 0 00-2-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    Light: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.21 4.16-3 5.2V17a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2.8c-1.79-1.04-3-2.98-3-5.2a6 6 0 016-6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    Switch: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="8" width="16" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="12" r="2" fill="currentColor"/></svg>',
    Cover: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4" y1="8" x2="20" y2="8" stroke="currentColor" stroke-width="1"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1"/></svg>',
    Fan: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 2c-1.5 0-3 1.5-3 3.5 0 2.5 2 3.5 3 3.5s3-1 3-3.5C15 3.5 13.5 2 12 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    Sensor: '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/></svg>',
    Media: '<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="10,8 16,12 10,16" fill="currentColor"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    Lock: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V7a4 4 0 018 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    Scene: '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="2" fill="currentColor"/><circle cx="16" cy="10" r="2" fill="currentColor"/><circle cx="12" cy="16" r="2" fill="currentColor"/></svg>',
    Script: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M10 12l-2 2 2 2M14 12l2 2-2 2" stroke="currentColor" stroke-width="2"/></svg>',
    Custom: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};

/**
 * Renders the control palette
 * @param {string} containerId - ID of the container element
 */
export async function renderControlPalette(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        Logger.warn('[ControlPalette] Container not found:', containerId);
        return;
    }

    container.innerHTML = '';
    container.className = 'control-palette';

    // Create search bar
    const searchBar = document.createElement('div');
    searchBar.className = 'control-search';
    searchBar.innerHTML = `
        <input type="text" placeholder="Search controls..." class="control-search-input">
        <svg class="control-search-icon" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>
        </svg>
    `;
    container.appendChild(searchBar);

    const searchInput = searchBar.querySelector('.control-search-input');
    searchInput.addEventListener('input', (e) => {
        filterControls(container, e.target.value);
    });

    // Create categories container
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'control-categories';
    container.appendChild(categoriesContainer);

    // Get all categories
    const categories = controlRegistry.getCategories();

    for (const category of categories) {
        const controls = controlRegistry.getByCategory(category);
        if (controls.length === 0) continue;

        const categoryEl = createCategoryElement(category, controls);
        categoriesContainer.appendChild(categoryEl);
    }

    // Add "Create Custom" button at the bottom
    const createCustomBtn = document.createElement('button');
    createCustomBtn.className = 'control-create-custom-btn';
    createCustomBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        Create Custom Control
    `;
    createCustomBtn.addEventListener('click', () => {
        openControlEditor();
    });
    container.appendChild(createCustomBtn);
}

/**
 * Creates a category element with its controls
 * @param {string} category
 * @param {import("../types.js").ControlDefinition[]} controls
 * @returns {HTMLElement}
 */
function createCategoryElement(category, controls) {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'control-category expanded';
    categoryEl.dataset.category = category;

    const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.Custom;

    const header = document.createElement('div');
    header.className = 'control-category-header';
    header.innerHTML = `
        <span class="category-expand-icon">›</span>
        ${icon}
        <span class="category-name">${category}</span>
        <span class="category-count">${controls.length}</span>
    `;
    header.addEventListener('click', () => {
        categoryEl.classList.toggle('expanded');
    });

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'control-category-items';

    for (const control of controls) {
        const controlEl = createControlElement(control);
        itemsContainer.appendChild(controlEl);
    }

    categoryEl.appendChild(header);
    categoryEl.appendChild(itemsContainer);

    return categoryEl;
}

/**
 * Creates a control element
 * @param {import("../types.js").ControlDefinition} control
 * @returns {HTMLElement}
 */
function createControlElement(control) {
    const el = document.createElement('div');
    el.className = 'control-item';
    el.draggable = true;
    el.dataset.controlId = control.id;

    const isBuiltin = controlRegistry.isBuiltin(control.id);

    el.innerHTML = `
        <div class="control-item-icon">
            ${getControlIcon(control)}
        </div>
        <div class="control-item-info">
            <span class="control-item-name">${control.name}</span>
            <span class="control-item-desc">${control.description || ''}</span>
        </div>
        ${!isBuiltin ? '<span class="control-item-badge">Custom</span>' : ''}
    `;

    el.title = control.description || `Add ${control.name} to canvas`;

    // Drag and drop
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/control-id', control.id);
        e.dataTransfer.effectAllowed = 'copy';
        el.classList.add('dragging');
    });

    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
    });

    // Click to add
    el.addEventListener('click', () => {
        addControlToCanvas(control);
    });

    // Context menu for custom controls
    if (!isBuiltin) {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showControlContextMenu(e, control);
        });
    }

    return el;
}

/**
 * Gets an icon for a control
 * @param {import("../types.js").ControlDefinition} control
 * @returns {string} SVG HTML
 */
function getControlIcon(control) {
    // Try to use MDI icon if specified
    if (control.icon && control.icon.startsWith('mdi:')) {
        const iconName = control.icon.replace('mdi:', '');
        return `<span class="mdi-icon" data-icon="${iconName}"></span>`;
    }
    
    // Fallback to category icon
    return CATEGORY_ICONS[control.category] || CATEGORY_ICONS.Custom;
}

/**
 * Filters controls based on search query
 * @param {HTMLElement} container
 * @param {string} query
 */
function filterControls(container, query) {
    const items = container.querySelectorAll('.control-item');
    const categories = container.querySelectorAll('.control-category');
    const lowerQuery = query.toLowerCase();

    if (!query) {
        // Show all
        items.forEach(item => item.style.display = '');
        categories.forEach(cat => cat.style.display = '');
        return;
    }

    // Filter items
    items.forEach(item => {
        const control = controlRegistry.get(item.dataset.controlId);
        if (!control) return;

        const matches = 
            control.name.toLowerCase().includes(lowerQuery) ||
            control.description?.toLowerCase().includes(lowerQuery) ||
            control.tags?.some(t => t.toLowerCase().includes(lowerQuery));

        item.style.display = matches ? '' : 'none';
    });

    // Hide empty categories
    categories.forEach(cat => {
        const visibleItems = cat.querySelectorAll('.control-item:not([style*="display: none"])');
        cat.style.display = visibleItems.length > 0 ? '' : 'none';
    });
}

/**
 * Adds a control to the canvas
 * @param {import("../types.js").ControlDefinition} control
 */
function addControlToCanvas(control) {
    Logger.log('[ControlPalette] Adding control:', control.id);

    // Create instance at a default position
    const instance = ControlFactory.createInstance(control, {
        x: 100,
        y: 100
    });

    // Expand control to widgets
    const widgets = ControlFactory.expandToWidgets(instance, control);
    
    Logger.log('[ControlPalette] Expanding control to widgets:', widgets.length);

    // Add widgets to current page
    for (const widget of widgets) {
        AppState.addWidget(widget);
    }

    // Select all widgets in the control
    if (widgets.length > 0) {
        const widgetIds = widgets.map(w => w.id);
        AppState.selectWidgets(widgetIds);
    }

    // Emit event
    emit(EVENTS.CONTROL_ADDED, { control, instance, widgets });

    // Show toast
    import('../utils/dom.js').then(dom => {
        dom.showToast(`Added ${control.name}`, 'success');
    });
}

/**
 * Shows context menu for custom controls
 * @param {MouseEvent} e
 * @param {import("../types.js").ControlDefinition} control
 */
function showControlContextMenu(e, control) {
    // Remove existing menu
    const existing = document.querySelector('.control-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'control-context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.innerHTML = `
        <div class="context-menu-item" data-action="edit">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Edit
        </div>
        <div class="context-menu-item" data-action="duplicate">
            <svg viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Duplicate
        </div>
        <div class="context-menu-item" data-action="export">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Export
        </div>
        <div class="context-menu-item danger" data-action="delete">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Delete
        </div>
    `;

    menu.addEventListener('click', (e) => {
        const action = e.target.closest('.context-menu-item')?.dataset.action;
        if (!action) return;

        menu.remove();

        switch (action) {
            case 'edit':
                openControlEditor(control);
                break;
            case 'duplicate':
                duplicateControl(control);
                break;
            case 'export':
                exportControl(control);
                break;
            case 'delete':
                deleteControl(control);
                break;
        }
    });

    document.body.appendChild(menu);

    // Close on click outside
    const closeHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

/**
 * Opens the control editor modal
 * @param {import("../types.js").ControlDefinition} [control] - Control to edit, or undefined for new
 */
function openControlEditor(control) {
    Logger.log('[ControlPalette] Opening control editor', control?.id);
    // TODO: Implement control editor modal
    import('../utils/dom.js').then(dom => {
        dom.showToast('Control editor coming soon!', 'info');
    });
}

/**
 * Duplicates a control
 * @param {import("../types.js").ControlDefinition} control
 */
function duplicateControl(control) {
    const newControl = {
        ...control,
        id: `${control.id}_copy_${Date.now()}`,
        name: `${control.name} (Copy)`
    };
    controlRegistry.registerCustom(newControl);
    renderControlPalette('controlPalette');
    
    import('../utils/dom.js').then(dom => {
        dom.showToast(`Duplicated ${control.name}`, 'success');
    });
}

/**
 * Exports a control to JSON
 * @param {import("../types.js").ControlDefinition} control
 */
function exportControl(control) {
    const json = controlRegistry.exportToJson(control.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${control.id}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    import('../utils/dom.js').then(dom => {
        dom.showToast(`Exported ${control.name}`, 'success');
    });
}

/**
 * Deletes a custom control
 * @param {import("../types.js").ControlDefinition} control
 */
function deleteControl(control) {
    if (confirm(`Delete "${control.name}"? This cannot be undone.`)) {
        controlRegistry.deleteCustom(control.id);
        renderControlPalette('controlPalette');
        
        import('../utils/dom.js').then(dom => {
            dom.showToast(`Deleted ${control.name}`, 'success');
        });
    }
}

/**
 * Handles drop of control onto canvas
 * @param {string} controlId - The control definition ID
 * @param {DragEvent} e - The drop event
 * @param {object} canvasInstance - The canvas instance
 */
export function handleControlDrop(controlId, e, canvasInstance) {
    if (!controlId) return false;

    const control = controlRegistry.get(controlId);
    if (!control) {
        Logger.warn('[ControlPalette] Control not found:', controlId);
        return false;
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Find the target artboard
    let targetEl = e.target;
    if (targetEl === canvasInstance.viewport) {
        targetEl = document.elementFromPoint(clientX, clientY);
    }

    const artboardWrapper = targetEl?.closest(".artboard-wrapper");
    let targetPageIndex = AppState.currentPageIndex;
    let targetRect = null;

    if (artboardWrapper) {
        targetPageIndex = parseInt(artboardWrapper.dataset.index, 10);
        const artboardEl = artboardWrapper.querySelector(".artboard");
        if (artboardEl) targetRect = artboardEl.getBoundingClientRect();
    } else {
        // Default to current page
        const artboardEl = document.querySelector(`.artboard[data-index="${targetPageIndex}"]`);
        if (artboardEl) targetRect = artboardEl.getBoundingClientRect();
    }

    // Calculate position relative to artboard
    const zoom = AppState.zoomLevel;
    let x = 40, y = 40; // Default position

    if (targetRect) {
        x = Math.round((clientX - targetRect.left) / zoom);
        y = Math.round((clientY - targetRect.top) / zoom);
    }

    // Adjust for control size
    const defaultSize = control.defaultSize || { width: 100, height: 100 };
    x = Math.max(0, x - defaultSize.width / 2);
    y = Math.max(0, y - defaultSize.height / 2);

    // Create instance at drop position
    const instance = ControlFactory.createInstance(control, { x, y });
    const widgets = ControlFactory.expandToWidgets(instance, control);

    Logger.log('[ControlPalette] Expanding control to widgets:', widgets.length);

    // Add all widgets to the target page
    for (const widget of widgets) {
        AppState.addWidget(widget, targetPageIndex);
    }

    // Switch to target page if different
    if (AppState.currentPageIndex !== targetPageIndex) {
        AppState.setCurrentPageIndex(targetPageIndex);
    }

    // Select all widgets in the control
    if (widgets.length > 0) {
        const widgetIds = widgets.map(w => w.id);
        AppState.selectWidgets(widgetIds);
    }

    emit(EVENTS.CONTROL_ADDED, { control, instance, widgets });

    // Show toast
    import('../utils/dom.js').then(dom => {
        dom.showToast(`Added ${control.name}`, 'success');
    });

    return true;
}

export default { renderControlPalette, handleControlDrop };
