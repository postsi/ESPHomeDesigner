"""
ESPHome Host Platform Simulator API

This module provides API endpoints for running LVGL designs in a native
simulator window using ESPHome's host platform with SDL display.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..const import API_BASE_PATH
from .base import DesignerBaseView

_LOGGER = logging.getLogger(__name__)

# Track running simulator processes
_simulator_processes: Dict[str, Any] = {}


def _check_esphome_installed() -> tuple[bool, str]:
    """Check if ESPHome CLI is installed and available."""
    esphome_path = shutil.which("esphome")
    if esphome_path:
        return True, esphome_path
    return False, ""


def _check_sdl_installed() -> bool:
    """Check if SDL2 is installed (basic check)."""
    # On macOS, check for Homebrew SDL2
    if os.path.exists("/opt/homebrew/lib/libSDL2.dylib"):
        return True
    if os.path.exists("/usr/local/lib/libSDL2.dylib"):
        return True
    # On Linux, check common paths
    if os.path.exists("/usr/lib/x86_64-linux-gnu/libSDL2.so"):
        return True
    if os.path.exists("/usr/lib/libSDL2.so"):
        return True
    # Try pkg-config as fallback
    try:
        result = subprocess.run(
            ["pkg-config", "--exists", "sdl2"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return False


class SimulatorCheckView(DesignerBaseView):
    """Check if simulator dependencies are available."""

    url = f"{API_BASE_PATH}/simulator/check"
    name = "api:esphome_designer_simulator_check"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request) -> web.Response:
        """Check simulator availability."""
        esphome_installed, esphome_path = _check_esphome_installed()
        sdl_installed = _check_sdl_installed()
        
        available = esphome_installed and sdl_installed
        
        reasons = []
        if not esphome_installed:
            reasons.append("ESPHome CLI not found. Install with: pip install esphome")
        if not sdl_installed:
            reasons.append("SDL2 not found. Install with: brew install sdl2 (macOS) or apt install libsdl2-dev (Linux)")
        
        return self.json({
            "available": available,
            "esphome_installed": esphome_installed,
            "esphome_path": esphome_path,
            "sdl_installed": sdl_installed,
            "reason": "; ".join(reasons) if reasons else None
        }, request=request)


class SimulatorStartView(DesignerBaseView):
    """Start the ESPHome simulator with provided YAML."""

    url = f"{API_BASE_PATH}/simulator/start"
    name = "api:esphome_designer_simulator_start"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        """Start the simulator."""
        try:
            data = await request.json()
            yaml_content = data.get("yaml", "")
            
            if not yaml_content:
                return self.json(
                    {"error": "No YAML content provided"},
                    status_code=400,
                    request=request
                )
            
            # Check dependencies
            esphome_installed, esphome_path = _check_esphome_installed()
            if not esphome_installed:
                return self.json(
                    {"error": "ESPHome CLI not installed. Run: pip install esphome"},
                    status_code=500,
                    request=request
                )
            
            # Create temporary directory for the simulator config
            temp_dir = tempfile.mkdtemp(prefix="esphome_sim_")
            yaml_path = Path(temp_dir) / "simulator.yaml"
            
            # Write the YAML file
            yaml_path.write_text(yaml_content)
            _LOGGER.info(f"Simulator YAML written to: {yaml_path}")
            
            # Generate a unique process ID
            import uuid
            process_id = str(uuid.uuid4())[:8]
            
            # First compile the project
            _LOGGER.info(f"Compiling simulator project...")
            try:
                compile_result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: subprocess.run(
                        [esphome_path, "compile", str(yaml_path)],
                        cwd=temp_dir,
                        capture_output=True,
                        text=True,
                        timeout=300  # 5 minute timeout for compilation
                    )
                )
                
                if compile_result.returncode != 0:
                    error_msg = compile_result.stderr or compile_result.stdout or "Unknown compilation error"
                    _LOGGER.error(f"Compilation failed: {error_msg}")
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    return self.json(
                        {"error": f"Compilation failed: {error_msg[:500]}"},
                        status_code=500,
                        request=request
                    )
                
                _LOGGER.info("Compilation successful, starting simulator...")
                
            except subprocess.TimeoutExpired:
                _LOGGER.error("Compilation timed out")
                shutil.rmtree(temp_dir, ignore_errors=True)
                return self.json(
                    {"error": "Compilation timed out after 5 minutes"},
                    status_code=500,
                    request=request
                )
            
            # Find the compiled binary
            # For host platform, the binary is in .esphome/build/lvgl-simulator/lvgl-simulator
            build_dir = Path(temp_dir) / ".esphome" / "build" / "lvgl-simulator"
            binary_path = build_dir / "lvgl-simulator"
            
            if not binary_path.exists():
                # Try alternative path
                binary_path = build_dir / "lvgl-simulator.app" / "Contents" / "MacOS" / "lvgl-simulator"
            
            if not binary_path.exists():
                _LOGGER.error(f"Could not find compiled binary in {build_dir}")
                # Fall back to running via esphome run
                try:
                    process = subprocess.Popen(
                        [esphome_path, "run", str(yaml_path), "--no-logs"],
                        cwd=temp_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        start_new_session=True
                    )
                except Exception as e:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    return self.json(
                        {"error": f"Failed to start simulator: {str(e)}"},
                        status_code=500,
                        request=request
                    )
            else:
                # Run the compiled binary directly
                try:
                    # Set up environment for SDL
                    env = os.environ.copy()
                    # On macOS, ensure SDL can find libraries
                    if os.path.exists("/opt/homebrew/lib"):
                        env["DYLD_LIBRARY_PATH"] = "/opt/homebrew/lib:" + env.get("DYLD_LIBRARY_PATH", "")
                    
                    process = subprocess.Popen(
                        [str(binary_path)],
                        cwd=temp_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        env=env,
                        start_new_session=True
                    )
                except Exception as e:
                    _LOGGER.error(f"Failed to run binary: {e}")
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    return self.json(
                        {"error": f"Failed to run simulator binary: {str(e)}"},
                        status_code=500,
                        request=request
                    )
            
            _simulator_processes[process_id] = {
                "process": process,
                "temp_dir": temp_dir,
                "yaml_path": str(yaml_path)
            }
            
            _LOGGER.info(f"Simulator started with PID: {process.pid}, ID: {process_id}")
            
            return self.json({
                "success": True,
                "process_id": process_id,
                "pid": process.pid,
                "yaml_path": str(yaml_path)
            }, request=request)
                
        except Exception as e:
            _LOGGER.error(f"Simulator start error: {e}")
            return self.json(
                {"error": str(e)},
                status_code=500,
                request=request
            )


class SimulatorStopView(DesignerBaseView):
    """Stop a running simulator."""

    url = f"{API_BASE_PATH}/simulator/stop"
    name = "api:esphome_designer_simulator_stop"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        """Stop the simulator."""
        try:
            data = await request.json()
            process_id = data.get("process_id")
            
            if process_id and process_id in _simulator_processes:
                sim_info = _simulator_processes[process_id]
                process = sim_info["process"]
                temp_dir = sim_info["temp_dir"]
                
                # Terminate the process
                try:
                    process.terminate()
                    # Give it a moment to terminate gracefully
                    await asyncio.sleep(0.5)
                    if process.poll() is None:
                        process.kill()
                except Exception as e:
                    _LOGGER.warning(f"Error terminating simulator: {e}")
                
                # Clean up temp directory
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception as e:
                    _LOGGER.warning(f"Error cleaning up temp dir: {e}")
                
                del _simulator_processes[process_id]
                _LOGGER.info(f"Simulator {process_id} stopped")
                
                return self.json({"success": True}, request=request)
            else:
                return self.json(
                    {"error": "Process not found"},
                    status_code=404,
                    request=request
                )
                
        except Exception as e:
            _LOGGER.error(f"Simulator stop error: {e}")
            return self.json(
                {"error": str(e)},
                status_code=500,
                request=request
            )


class SimulatorStatusView(DesignerBaseView):
    """Get status of running simulators."""

    url = f"{API_BASE_PATH}/simulator/status"
    name = "api:esphome_designer_simulator_status"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request) -> web.Response:
        """Get simulator status."""
        running = []
        for process_id, sim_info in list(_simulator_processes.items()):
            process = sim_info["process"]
            poll_result = process.poll()
            
            if poll_result is not None:
                # Process has ended, clean up
                try:
                    shutil.rmtree(sim_info["temp_dir"], ignore_errors=True)
                except Exception:
                    pass
                del _simulator_processes[process_id]
            else:
                running.append({
                    "process_id": process_id,
                    "pid": process.pid,
                    "yaml_path": sim_info["yaml_path"]
                })
        
        return self.json({
            "running": running,
            "count": len(running)
        }, request=request)
