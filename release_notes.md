# Release Notes



## v0.6.1

### 🐛 Bug Fixes

#### Quote/RSS Widget
- **Quote & Author Swapped**: Fixed RSS parsing where quote text and author name were incorrectly swapped for BrainyQuote feeds
- **Auto Text Scaling**: Added automatic font scaling for quotes - text now shrinks (100% → 75% → 50%) to fit within widget bounds

#### YAML Generation
- **Duplicate Layouts**: Fixed "Update Layout from YAML" creating duplicate layouts and resetting device model to E1001
- **Cleaned Up HTTP Comments**: Removed confusing duplicate `http_request` comment block from generated YAML

#### Display Rendering
- **Text Vertical Alignment**: Added 11px vertical offset for text widgets to better match canvas preview with actual e-ink display positioning
  - *Note: This adjustment compensates for font baseline differences between browser and ESPHome rendering*

#### Graph Widget
- **Grid Lines**: Fixed X and Y grid lines not generating correctly in YAML output

### ✨ Improvements

#### Online Image Widget
- **Binary Mode for Monochrome**: Remote images now default to BINARY type for monochrome displays (E1001, TRMNL) for sharper rendering
- **Auto Type Detection**: Image type automatically selected based on device (BINARY for monochrome, RGB565 for color E1002)

#### Rounded Rectangle Widget
- **New Widget**: Full support for rounded rectangles with configurable corner radius
- **Border Support**: Optional border with customizable thickness

---

## v0.6.0
> [!NOTE]
> This is a **major release** with significant architectural improvements, new widgets, and hardware support.

### 🎉 Major Features

#### Layout Manager
- **Multi-Device Support**: Manage multiple e-ink devices from a single interface
- **Export/Import Layouts**: Save and share your dashboard designs as files
- Switch between devices seamlessly with persistent configurations

#### Completely Redesigned UI
- **Fresh Modern Interface**: Complete visual overhaul - easier on the eyes
- **Light Mode**: New light theme for users who prefer a brighter workspace
- **Canvas Controls**: Zoom in/out and recenter the canvas for precise editing

#### Template-Free Workflow
- **No More Templates Required**: The generator now produces a complete, standalone configuration
- Simply paste the generated YAML below ESPHome's auto-generated sections
- Makes setup child's play - no manual template merging needed

#### New Widgets
- **Quote / RSS Feed Widget**: Display inspirational quotes or RSS feed content
  - RSS feed URL configuration with popular default (BrainyQuote)
  - Optional author display, random quote selection
  - Configurable refresh interval (15min to 24h)
  - Word wrap, italic styling, full font customization
  - **Zero configuration**: No `configuration.yaml` entries or Home Assistant sensors needed
  - *Note: Functional but formatting not fully respected - unfinished feature*

- **QR Code Widget**: Generate QR codes directly on your e-ink display
  - Configurable content string (URLs, text, etc.)
  - Four error correction levels (LOW, MEDIUM, QUARTILE, HIGH)
  - Auto-scaling to fit widget dimensions

- **Weather Forecast Widget**: Multi-day weather forecast display
  - Shows upcoming weather conditions with dynamic icons
  - Integrates with Home Assistant weather entities
  - *Note: Requires a weather entity configured in Home Assistant*

- **Vertical Lines**: Draw vertical lines (untested)

### 📱 New Hardware Support

#### reTerminal E1002 - Color E-Ink Display
- **Full color e-paper support** for the Seeed Studio reTerminal E1002
- Color rendering for all widgets and shapes
- Same easy workflow as E1001 - just select your device type

#### TRMNL (ESP32-C3)
- **New device support**: TRMNL e-paper hardware now fully supported
- Dedicated hardware template (`trmnl_lambda.yaml`)
- Correct SPI and battery sensor configurations
- Proper busy_pin logic

> [!WARNING]
> **Experimental Feature**: Online Image (remote URLs) widget is an initial implementation and may be buggy or broken. Use at your own discretion.

### 🔧 Architecture Overhaul
- **Modular Frontend Architecture**: Complete refactor of the monolithic `editor.js` (276KB) into a modular system:
  - `yaml_export.js` - Clean YAML generation with per-widget handling
  - `yaml_import.js` - Robust YAML parsing and import
  - `canvas.js` - Canvas rendering and interaction
  - `state.js` - Centralized application state management
  - `properties.js` - Widget property panel generation
  - `widget_factory.js` - Standardized widget creation
  - `keyboard.js` - Keyboard shortcuts handling
  - Improved maintainability and extensibility

- **Feature-Based Widget System**: Backend now uses a `features/` directory with:
  - Per-widget `schema.json` for property definitions
  - Per-widget `render.js` for canvas preview rendering
  - Standardized widget registration and discovery

### 🐛 Bug Fixes

#### Widget Rendering
- **Line Widget**: Fixed length synchronization between canvas preview and e-ink display
- **Line Widget**: Fixed drag resize functionality
- **Rectangle Border**: Corrected `border-box` positioning discrepancy between canvas and e-ink
- **Weather Forecast**: Fixed positioning at correct X/Y coordinates
- **Graph Grid Lines**: Fixed `x_grid` values not generating correctly in YAML

#### Sensor & Entity Handling
- **Sensor ID Generation**: Fixed sensor ID stripping for `battery_icon`, `sensor_text`, `progress_bar`, and `weather_icon` widgets
  - Correctly strips `sensor.` and `weather.` prefixes when generating ESPHome `id()` references
- **Quote/RSS Widget**: Added WiFi connection check and startup delay for reliable fetching

#### Font System
- **Italic Font Support**: Fixed italic fonts not being correctly referenced in lambda code
  - Text widgets now use `_italic` suffix (e.g., `font_roboto_900_100_italic`) when italic is enabled
  - Quote RSS widget correctly references italic font IDs
- **Font Validation**: Fixed `font_roboto_400_24` validation warning in battery_icon widget
- **Italic Persistence**: Fixed `italic` property not persisting for `sensor_text` and `datetime` widgets after YAML update

#### Device Settings & Persistence
- **Device Name Sync**: Fixed device name changes not persisting in Device Settings modal and Manage Layouts list
- **Device Settings Modal**: Fixed settings reverting upon re-opening

#### YAML Generation
- **Duplicate SPI Removal**: Fixed duplicate SPI configuration in generated YAML
- **YAML Duplicate Fixes**: Various fixes for duplicate section generation

### 🔄 Technical Improvements
- **Frontend Feature Registry**: Dynamic widget type discovery and registration
- **Schema-Driven Properties**: Widget properties now defined in JSON schemas
- **Improved Error Handling**: Better error messages and AppState.notify integration
- **Code Organization**: Clear separation between core, UI, IO, and utility modules

---

## v0.5.0

> [!WARNING]
> **BREAKING CHANGE**: This version requires the **latest hardware template**.
> Global settings have been moved to the template.
> You **MUST** update your `reterminal_e1001_lambda.yaml` (or equivalent) to the latest version for these features to work.
> Old templates will cause compilation errors or ignore your power settings.

### 🎉 Major Features
- **Page Management**:
  - **Drag & Drop Reordering**: You can now reorder pages in the sidebar by dragging them.
  - **Persistent Page Names**: Custom page names are now saved in the YAML and restored upon import.
- **New Power Management UI**: Complete redesign with radio buttons for clear, mutually exclusive power modes:
  - **Standard (Always On)** - Auto-refresh based on page intervals
  - **Night Mode** - Screen off during specified hours for energy savings
  - **Manual Refresh Only** - Updates only via button or Home Assistant trigger
  - **Deep Sleep (Battery Saver)** - Device offline between updates for maximum power savings
- **Deep Sleep Support**: Full ESPHome deep sleep implementation with configurable intervals (default: 600s)
- **Smart Text Optimization**: Automatically strips unused characters from large static fonts to save massive amounts of RAM, preventing compilation crashes. Dynamic text (sensors) remains untouched.

### 🐛 Bug Fixes
#### Settings & Persistence
- **Device Settings Persistence**: Fixed all device settings (power mode, sleep times, deep sleep interval) not saving and jumping back to defaults on restart.
- **Page Refresh Rates**: Fixed page refresh intervals not persisting and resetting when updating layout from YAML.
- **Power Management Settings**: Fixed settings resetting to "Standard" mode when updating layout from YAML.

#### YAML Generation
- **Script Generation**: Fixed wrong script generated for deep sleep mode (was using auto-refresh loop instead of simple sleep).
- **Display Lambda**: Fixed missing COLOR_ON/COLOR_OFF definitions causing compilation errors.
- **Sensor Text Widget**: Fixed value-only mode (no label) missing critical YAML sections (button:, font:, script:, globals:).
- **Refresh Intervals**: Fixed page refresh intervals < 60 seconds being filtered out.
- **No-Refresh Window**: Fixed invalid conditions generated when window not configured (0-0 case).
- **Manual Refresh Mode**: Fixed manual refresh showing unnecessary page interval logic (now minimal script only).

#### Widget Improvements
- **Line Widget**: Fixed lines not rendering straight on e-paper (right side was ~10px lower).
- **Image Widget**: Fixed missing path property in UI and drag functionality not working.
- **Battery Icon**: Fixed percentage text not centering underneath battery symbol when icon is enlarged.
- **Sensor Text Alignment**: Added separate alignment options for label and value (e.g., label left, value right) with WYSIWYG canvas preview.
- **DateTime Widget**: Verified alignment options working correctly.
- **Progress Bar Widget**: Verified alignment options working correctly.

#### Font System
- **Google Fonts**: Fonts now work correctly - all fonts pre-defined in template (Template-Only approach).
- **Font Selection**: Verified font dropdown shows all 15 supported families.
- **Font Persistence**: Fixed font selections (Family, Weight, Size) for Sensor Text widgets not persisting through YAML updates.


### 🔧 Technical Improvements
- **Frontend/Backend Parity**: Both generators now produce identical output.
- **Robust Import**: `applyImportedLayout()` now merges settings instead of overwriting, preserving user preferences.
- **Smart Parsing**: The YAML parser now intelligently extracts page names and refresh rates from comments and code logic.
- **YAML Highlighting**: Selecting a widget on the canvas now automatically highlights its corresponding YAML definition in the snippet box.


## v0.4.6.1
- **Critical Bug Fix**: Fixed JavaScript error `ReferenceError: isTextSensor is not defined` in snippet generator that prevented YAML generation and caused compilation errors.


## v0.4.6
- **Number Sensor Fix**: Fixed a bug where number sensors were interpreted as text sensors, causing them to show gibberish or fail to compile.
- **Graph Improvements**: X and Y information are now automatically added if the user adds min/max information or time information in the widget settings.
- **Graph Persistence**: Fixed a bug where graph minimum/maximum values and duration were not saving to YAML. These values would reset when "Update Layout from YAML" was pressed.
- **Known Bugs**:
    - Puppet widget is still unstable.
    - Straight lines are not perfectly straight.
    - Visible conditions are not fully tested and might fail to compile.


## v0.4.5
- **Min/Max Visibility**: Added support for numeric range conditions (Min/Max) with AND/OR logic for widget visibility. Perfect for progress bars (e.g., `0 < value < 100`).
- **Boot Stability**: Updated the default hardware template (`reterminal_e1001_lambda.yaml`) to remove the immediate display update from `on_boot`, preventing boot loops on heavy layouts.
- **WiFi Sensor**: Added `wifi_signal_db` to the default hardware template (diagnostic entity).
- **GUI Updates**: Added "Update Layout from YAML" button to the editor for easier round-trip editing.
- **Graph Widget Fixes**: Fixed persistence of `min_value`, `max_value`, `min_range`, and `max_range` properties.
- **Editor Fixes**: Fixed CSS regression and ensured fullscreen editing works correctly.
- **Text Sensor Persistence**: Fixed "Is Text Sensor?" checkbox state not saving to backend.
- **Puppet Widget Fixes**: Fixed Puppet/Online Image widgets not saving to backend, added automatic `http_request` dependency, and fixed URL corruption in parser.
- **Puppet Stability**: Added `on_error` handler and conditional page updates to prevent crashes and unnecessary refreshes.
- **Conditional Visibility**: Fixed C++ compilation error when using conditional visibility with numeric sensors (removed invalid `atof` check).

## v0.4.4
- **Text Sensor Support**: Added "Is Text Sensor?" checkbox to `sensor_text` widget to correctly format string states (fixes `NaN` issue).
- **Entity Picker Limit**: Increased the entity fetch limit from 1000 to 5000 to support larger Home Assistant installations.
- **Default Template Fixes**: Updated `reterminal_e1001_lambda.yaml` to match default dashboard entity IDs (`sensor_reterminal_e1001_...`) and device name.
- **Canvas Responsiveness**: Improved canvas scaling and centering on smaller screens.

## v0.4.3
### New Features
-   **Copy/Paste**: Added support for copying and pasting widgets using `Ctrl+C` and `Ctrl+V`. Pasted widgets are automatically offset for visibility.
-   **Undo/Redo**: Implemented Undo (`Ctrl+Z`) and Redo (`Ctrl+Y` or `Ctrl+Shift+Z`) functionality for widget operations (move, resize, add, delete, property changes).
-   **Fullscreen YAML Editing**: The fullscreen YAML view is now editable and includes an "Update Layout from YAML" button to apply changes directly.
-   **Sidebar Visibility Control**: Added a configuration option to show or hide the integration in the Home Assistant sidebar.
-   **Canvas Responsiveness**: The editor canvas now dynamically scales and centers to fit smaller screens, ensuring the entire layout is visible without scrolling.

### Bug Fixes
-   **Ghost Pages**: Fixed an issue where deleted pages would persist in the generated YAML snippet.
-   **Undo/Redo Stability**: Fixed issues where Undo would jump back multiple steps or become unresponsive due to duplicate history states or missing drag state capture.
-   **Graph Persistence**: Fixed `Continuous: true` setting not saving correctly.
-   **Page Jump**: Fixed editor jumping to the first page after layout updates.
-   **Weather Text Color**: Fixed weather widget text color reverting to black.

## v0.4.2
-   **Graph Widget**: Added automated sensor info (min/max) based on Home Assistant entity attributes.
-   **Circle Widget**: Enforced 1:1 aspect ratio during resize to prevent distortion.
-   **Manifest**: Version bump.
