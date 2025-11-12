"""
Panel view for the reTerminal Dashboard Designer.

This exposes the editor UI as a full-screen, authenticated panel inside Home Assistant,
so users do not need to copy anything into /config/www manually.

Routes:
- GET /reterminal-dashboard
    Serves the embedded editor HTML/JS, which talks to:
    - /api/reterminal_dashboard/layout
    - /api/reterminal_dashboard/entities
    - /api/reterminal_dashboard/snippet
    - /api/reterminal_dashboard/import_snippet

Notes:
- This view runs under the Home Assistant frontend origin and shares auth/session.
- All API calls are relative paths, no hard-coded host.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import API_BASE_PATH

_LOGGER = logging.getLogger(__name__)


PANEL_URL_PATH = "/reterminal-dashboard"


class ReTerminalDashboardPanelView(HomeAssistantView):
    """Serve the reTerminal Dashboard Designer editor as a panel."""

    url = PANEL_URL_PATH
    name = "reterminal_dashboard:panel"
    requires_auth = True
    cors_allowed = False

    def __init__(self, hass: HomeAssistant) -> None:
        """Store hass if needed later."""
        self.hass = hass

    async def get(self, request) -> Any:  # type: ignore[override]
        """Return the editor HTML.

        The HTML is an inlined, slightly adapted version of www/reterminal_dashboard_panel/editor.html
        with JS bindings to the reterminal_dashboard HTTP API.
        """
        _LOGGER.info("Panel view accessed by user: %s", getattr(request.get('hass_user'), 'name', 'unknown'))
        
        # IMPORTANT:
        # - No hard-coded host.
        # - Use relative paths to API_BASE_PATH so auth/session cookies work automatically.
        # - Sensor/entity loading via /api/reterminal_dashboard/entities.
        # - Layout load/save via /api/reterminal_dashboard/layout.
        # - Snippet import/export via /api/reterminal_dashboard/import_snippet and /snippet.
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>reTerminal Dashboard Designer · YAML Snippet Editor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
{self._load_base_styles()}
  </style>
</head>
<body>
  <div class="sidebar">
    <div>
      <h1><span class="logo-dot"></span> reTerminal Designer</h1>
      <div class="pill"><span></span>Connected to Home Assistant</div>
    </div>

    <div class="sidebar-group">
      <div class="sidebar-section-label">Layout</div>
      <button class="btn btn-full" id="btn-load-layout">Load layout from HA</button>
      <button class="btn btn-secondary btn-full" id="btn-save-layout">Save layout to HA</button>
    </div>

    <div class="sidebar-group">
      <div class="sidebar-section-label">Pages</div>
      <div class="page-list" id="page-list"></div>
      <button class="btn btn-secondary btn-full" id="btn-add-page">+ Add page</button>
    </div>

    <div class="sidebar-group">
      <div class="sidebar-section-label">Widgets</div>
      <div class="widget-list">
        <div class="item" data-widget-type="label">
          <span class="label">Text label</span>
          <span class="tag">static</span>
        </div>
        <div class="item" data-widget-type="sensor">
          <span class="label">Sensor value</span>
          <span class="tag">entity</span>
        </div>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="main-header">
      <div class="main-header-title">
        <h2>Canvas editor</h2>
        <span>Design pages for your reTerminal E1001. Changes are saved to the HA integration storage.</span>
      </div>
      <div class="main-header-actions">
        <div class="main-header-pill">API base: {API_BASE_PATH}</div>
        <button class="btn btn-secondary" id="btn-generate-snippet">Generate ESPHome snippet</button>
        <button class="btn btn-secondary" id="btn-import-snippet">Import snippet</button>
      </div>
    </div>

    <div class="canvas-wrap">
      <div class="canvas-area">
        <div class="canvas-toolbar">
          <span>Page: <strong id="current-page-label">Page 1</strong></span>
          <span>Drag widgets, resize corners. Sensor widgets can bind to entities.</span>
        </div>
        <div class="canvas dark landscape" id="canvas">
          <div class="canvas-grid"></div>
        </div>
      </div>

      <div class="right-panel">
        <div class="right-panel-header">Widget properties</div>
        <div class="right-panel-body">
          <div class="sidebar-group">
            <label class="sidebar-section-label">Type</label>
            <div id="prop-type" class="prop-value">None selected</div>
          </div>
          <div class="sidebar-group">
            <label class="sidebar-section-label">Text</label>
            <input id="prop-text" class="input" type="text" placeholder="Label text" />
          </div>
          <div class="sidebar-group">
            <label class="sidebar-section-label">Sensor entity_id</label>
            <input id="prop-entity" class="input" type="text" placeholder="sensor.example" list="entity-list" />
            <datalist id="entity-list"></datalist>
            <div class="hint">Start typing to filter. List is loaded from Home Assistant.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
  // ----- Config -----
  const API_BASE = "{API_BASE_PATH}";

  // ----- State -----
  let layout = {{
    pages: [
      {{
        id: "page_1",
        name: "Page 1",
        widgets: []
      }}
    ],
  }};
  let currentPageIndex = 0;
  let activeWidgetId = null;
  let entityIndex = [];  // Loaded from HA

  function getCurrentPage() {{
    return layout.pages[currentPageIndex] || layout.pages[0];
  }}

  function findWidget(page, widgetId) {{
    return page.widgets.find(w => w.id === widgetId) || null;
  }}

  function uuid() {{
    return "w_" + Math.random().toString(36).slice(2, 10);
  }}

  // ----- Canvas rendering -----
  function renderPagesSidebar() {{
    const list = document.getElementById("page-list");
    list.innerHTML = "";
    layout.pages.forEach((p, idx) => {{
      const div = document.createElement("div");
      div.className = "item" + (idx === currentPageIndex ? " active" : "");
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = p.name || ("Page " + (idx + 1));
      const meta = document.createElement("small");
      meta.textContent = p.id;
      div.appendChild(label);
      div.appendChild(meta);
      div.addEventListener("click", () => {{
        currentPageIndex = idx;
        activeWidgetId = null;
        renderAll();
      }});
      list.appendChild(div);
    }});
    document.getElementById("current-page-label").textContent =
      (getCurrentPage().name || ("Page " + (currentPageIndex + 1)));
  }}

  function renderCanvas() {{
    const canvas = document.getElementById("canvas");
    // Remove old widgets
    canvas.querySelectorAll(".widget").forEach(el => el.remove());
    const page = getCurrentPage();
    if (!page) return;

    page.widgets.forEach(w => {{
      const el = document.createElement("div");
      el.className = "widget" + (w.id === activeWidgetId ? " active" : "");
      el.style.left = (w.x || 10) + "px";
      el.style.top = (w.y || 10) + "px";
      el.style.width = (w.width || 120) + "px";
      el.style.height = (w.height || 24) + "px";
      el.textContent = w.type === "sensor"
        ? (w.text || w.entity_id || "sensor.example")
        : (w.text || "Label");

      el.dataset.id = w.id;

      // Click to select
      el.addEventListener("click", (ev) => {{
        ev.stopPropagation();
        activeWidgetId = w.id;
        renderAll();
      }});

      // Simple drag
      let drag = false;
      let offsetX = 0;
      let offsetY = 0;
      el.addEventListener("mousedown", (ev) => {{
        drag = true;
        offsetX = ev.offsetX;
        offsetY = ev.offsetY;
        activeWidgetId = w.id;
        renderAll();
      }});
      window.addEventListener("mousemove", (ev) => {{
        if (!drag || activeWidgetId !== w.id) return;
        const rect = canvas.getBoundingClientRect();
        w.x = Math.max(0, Math.min(rect.width - 20, ev.clientX - rect.left - offsetX));
        w.y = Math.max(0, Math.min(rect.height - 20, ev.clientY - rect.top - offsetY));
        renderCanvas();
      }});
      window.addEventListener("mouseup", () => drag = false);

      // Resize handle
      const handle = document.createElement("div");
      handle.className = "widget-resize-handle";
      let resizing = false;
      let startW = 0;
      let startH = 0;
      handle.addEventListener("mousedown", (ev) => {{
        ev.stopPropagation();
        resizing = true;
        startW = w.width || 120;
        startH = w.height || 24;
      }});
      window.addEventListener("mousemove", (ev) => {{
        if (!resizing || activeWidgetId !== w.id) return;
        const rect = canvas.getBoundingClientRect();
        const dx = ev.clientX - (rect.left + (w.x || 10) + startW);
        const dy = ev.clientY - (rect.top + (w.y || 10) + startH);
        w.width = Math.max(40, startW + dx);
        w.height = Math.max(16, startH + dy);
        renderCanvas();
      }});
      window.addEventListener("mouseup", () => resizing = false);

      el.appendChild(handle);
      canvas.appendChild(el);
    }});
  }}

  function renderProperties() {{
    const page = getCurrentPage();
    const typeEl = document.getElementById("prop-type");
    const textInput = document.getElementById("prop-text");
    const entityInput = document.getElementById("prop-entity");

    if (!page || !activeWidgetId) {{
      typeEl.textContent = "None selected";
      textInput.value = "";
      entityInput.value = "";
      return;
    }}

    const w = findWidget(page, activeWidgetId);
    if (!w) {{
      typeEl.textContent = "None selected";
      textInput.value = "";
      entityInput.value = "";
      return;
    }}

    typeEl.textContent = w.type || "unknown";
    textInput.value = w.text || "";
    entityInput.value = w.entity_id || "";

    textInput.oninput = (ev) => {{
      w.text = ev.target.value;
      renderCanvas();
    }};

    entityInput.oninput = (ev) => {{
      w.entity_id = ev.target.value;
      renderCanvas();
    }};
  }}

  function renderAll() {{
    renderPagesSidebar();
    renderCanvas();
    renderProperties();
  }}

  // ----- API helpers -----
  async function apiGet(path) {{
    const resp = await fetch(path, {{
      method: "GET",
      credentials: "same-origin",
    }});
    if (!resp.ok) throw new Error("GET " + path + " failed: " + resp.status);
    return await resp.json();
  }}

  async function apiPost(path, body) {{
    const resp = await fetch(path, {{
      method: "POST",
      credentials: "same-origin",
      headers: {{
        "Content-Type": "application/json"
      }},
      body: JSON.stringify(body),
    }});
    if (!resp.ok) throw new Error("POST " + path + " failed: " + resp.status);
    return await resp.json();
  }}

  // ----- Load entities for picker -----
  async function loadEntities() {{
    try {{
      const data = await apiGet(API_BASE + "/entities");
      entityIndex = Array.isArray(data) ? data : [];
      const datalist = document.getElementById("entity-list");
      datalist.innerHTML = "";
      entityIndex.forEach(e => {{
        const opt = document.createElement("option");
        opt.value = e.entity_id;
        opt.label = e.name || e.entity_id;
        datalist.appendChild(opt);
      }});
      console.log("Loaded entities for picker:", entityIndex.length);
    }} catch (err) {{
      console.warn("Failed to load entities for picker:", err);
    }}
  }}

  // ----- Load and save layout -----
  async function loadLayoutFromHA() {{
    try {{
      const data = await apiGet(API_BASE + "/layout");
      if (data && data.pages) {{
        layout = data;
        if (!Array.isArray(layout.pages) || layout.pages.length === 0) {{
          layout.pages = [{{ id: "page_1", name: "Page 1", widgets: [] }}];
        }}
      }}
      currentPageIndex = 0;
      activeWidgetId = null;
      renderAll();
      alert("Layout loaded from Home Assistant.");
    }} catch (err) {{
      console.error("Failed to load layout:", err);
      alert("Failed to load layout from Home Assistant. Check logs.");
    }}
  }}

  async function saveLayoutToHA() {{
    try {{
      const page = getCurrentPage();
      if (!page) {{
        alert("No pages to save.");
        return;
      }}
      // For now, send the whole layout as the default device layout body.
      const body = layout;
      const data = await apiPost(API_BASE + "/layout", body);
      console.log("Saved layout:", data);
      alert("Layout saved to Home Assistant.");
    }} catch (err) {{
      console.error("Failed to save layout:", err);
      alert("Failed to save layout to Home Assistant. Check logs.");
    }}
  }}

  // ----- Snippet actions (minimal wiring) -----
  async function generateSnippet() {{
    try {{
      const resp = await fetch(API_BASE + "/snippet", {{
        method: "GET",
        credentials: "same-origin",
      }});
      const text = await resp.text();
      const blob = new Blob([text], {{ type: "text/yaml" }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reterminal_snippet.yaml";
      a.click();
      URL.revokeObjectURL(url);
    }} catch (err) {{
      console.error("Failed to generate snippet:", err);
      alert("Failed to generate snippet. Check logs.");
    }}
  }}

  async function importSnippet() {{
    alert("Import snippet UX not implemented in this minimal panel wiring. Use the HTTP API directly or extend this UI.");
  }}

  // ----- Widget creation -----
  function addWidget(type) {{
    const page = getCurrentPage();
    if (!page) return;
    const id = uuid();
    const base = {{
      id,
      x: 40,
      y: 40,
      width: 140,
      height: 24,
      text: type === "sensor" ? "" : "Label",
      type,
    }};
    if (type === "sensor") {{
      base.entity_id = "";
    }}
    page.widgets.push(base);
    activeWidgetId = id;
    renderAll();
  }}

  // ----- Event wiring -----
  function initEvents() {{
    document.getElementById("btn-load-layout").onclick = loadLayoutFromHA;
    document.getElementById("btn-save-layout").onclick = saveLayoutToHA;
    document.getElementById("btn-generate-snippet").onclick = generateSnippet;
    document.getElementById("btn-import-snippet").onclick = importSnippet;

    document.querySelectorAll(".widget-list .item").forEach(el => {{
      el.addEventListener("click", () => {{
        const t = el.getAttribute("data-widget-type");
        if (t) addWidget(t);
      }});
    }});

    document.getElementById("canvas").addEventListener("click", () => {{
      activeWidgetId = null;
      renderAll();
    }});
  }}

  // ----- Init -----
  (async function main() {{
    initEvents();
    renderAll();
    await loadEntities();
    // Optionally auto-load layout on open:
    try {{
      await loadLayoutFromHA();
    }} catch (err) {{
      console.warn("Initial layout load failed (may be first run):", err);
    }}
  }})();
  </script>
</body>
</html>
"""
        return self.Response(
            body=html,
            status=200,
            content_type="text/html",
        )

    def _load_base_styles(self) -> str:
        """Return the CSS subset from the standalone editor for the inline panel.

        Extracted from the original editor.html to avoid external files.
        Keep this in sync with your design but avoid remote dependencies.
        """
        # NOTE: For brevity and maintainability, we include only layout-critical parts.
        # You can further compress or refactor as needed.
        return """
:root {
  --bg: #0f1115;
  --bg-elevated: #181b22;
  --accent: #52c7ea;
  --accent-soft: rgba(82, 199, 234, 0.16);
  --border-subtle: #2a2f3a;
  --text: #e5e9f0;
  --muted: #7b8190;
  --danger: #ff6b81;
  --font: system-ui, -apple-system, BlinkMacSystemFont, -sans-serif;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
body {
  font-family: var(--font);
  background: radial-gradient(circle at top left, #1c1f26 0, #050609 40%, #020308 100%);
  color: var(--text);
  display: flex;
}
.sidebar {
  width: 260px;
  background: linear-gradient(to bottom, #151821, #0c0f15);
  border-right: 1px solid var(--border-subtle);
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
.sidebar h1 {
  font-size: 16px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  font-size: 10px;
  color: var(--muted);
  margin-top: 6px;
}
.pill span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
.sidebar-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 6px;
}
.select, .input {
  width: 100%;
  padding: 7px 9px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: #0f1118;
  color: var(--text);
  outline: none;
}
.select:focus, .input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-soft);
}
.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.btn {
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  padding: 6px 9px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.16s ease;
}
.btn:hover {
  background: var(--accent-soft);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}
.btn-secondary {
  border-color: var(--border-subtle);
  color: var(--muted);
}
.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.btn-full {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}
.page-list, .widget-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item {
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--muted);
}
.item span.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item small {
  font-size: 9px;
  opacity: 0.7;
}
.item.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.item:hover {
  background: #151822;
  border-color: var(--border-subtle);
}
.item .tag {
  padding: 1px 5px;
  border-radius: 999px;
  font-size: 8px;
  border: 1px solid var(--border-subtle);
  color: var(--muted);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 8px;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.main-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.main-header-title h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.main-header-title span {
  font-size: 11px;
  color: var(--muted);
}
.main-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.main-header-pill {
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  font-size: 9px;
  color: var(--muted);
}
.canvas-wrap {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 0;
  overflow: hidden;
}
.canvas-area {
  background: radial-gradient(circle at top, #171b22, #05070b);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}
.canvas-toolbar span strong {
  color: var(--accent);
  font-weight: 500;
}
.canvas {
  width: 800px;
  height: 480px;
  margin-top: 4px;
  background: #000000;
  border-radius: 10px;
  border: 1px solid #222222;
  position: relative;
  box-shadow: inset 0 0 0 1px #222222, 0 18px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  transition: all 0.16s ease;
  flex-shrink: 0;
}
.canvas-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}
.widget {
  position: absolute;
  font-size: 12px;
  color: #ffffff;
  cursor: move;
  display: block;
  user-select: none;
  border: none;
  background: transparent;
  padding: 0;
}
.widget.active {
  outline: 1px solid var(--accent);
  box-shadow: 0 0 0 1px rgba(82, 199, 234, 0.4);
}
.widget-resize-handle {
  position: absolute;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
  cursor: nwse-resize;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.widget-resize-handle::after {
  content: "";
  width: 6px;
  height: 2px;
  border-radius: 2px;
  background: #0b0e13;
  transform: rotate(40deg);
  opacity: 0.9;
}
.right-panel {
  width: 260px;
  background: #0d1016;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  max-height: 480px;
}
.right-panel-header {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}
.right-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hint {
  font-size: 9px;
  color: var(--muted);
}
"""