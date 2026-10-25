import { Grid, CELL_SIZE } from './Grid.js';
import { Renderer } from './Renderer.js';
import { Generator } from './Generator.js';
import { Camera } from './Camera.js';
import { Vehicle } from './Vehicles.js';
import { Pedestrian } from './Pedestrians.js';
import { TrafficLight } from './TrafficLight.js';
import { CellType, Tool } from './constants.js';
import { sound } from './Audio.js';

export class CityGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.grid = new Grid(64, 46);
        this.camera = new Camera(canvas);
        this.renderer = new Renderer(canvas, this.camera);
        this.generator = new Generator();

        this.vehicles = [];
        this.lights = [];
        this.pedestrians = [];

        this.currentTool = Tool.ROAD;
        this.lightDuration = 2200;

        // Day / Night cycle
        this.timeOfDay = 12.0; // 12:00 PM (Noon)
        this.timeSpeed = 0.2; // Hours per second (~2 mins full day)
        this.timePaused = false;

        // Pointer state
        this.isPointerDown = false;
        this.activePointers = new Map();
        this.prevPinchDist = null;
        this.dragStart = { x: 0, y: 0, camX: 0, camY: 0 };
        this.hasMoved = false;

        this.stats = {
            population: 0,
            vehicles: 0,
            congestion: 0,
            avgSpeed: 0
        };

        this.setupEventListeners();
        this.resize();
        this.camera.center(this.grid.width, this.grid.height);

        this.lastTime = performance.now();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    start() {
        this.regenerate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    regenerate() {
        this.generator.generate(this.grid, this.lights);
        this.spawnVehicles(50);
        this.spawnPedestrians(35);
        this.updateStats();
    }

    clearCity() {
        this.grid.cells.fill(CellType.GRASS);
        this.lights = [];
        this.vehicles = [];
        this.pedestrians = [];
        this.updateStats();
    }

    spawnVehicles(count) {
        this.vehicles = [];
        for (let i = 0; i < count; i++) {
            this.vehicles.push(new Vehicle(this.grid, this.lights));
        }
    }

    spawnPedestrians(count) {
        this.pedestrians = [];
        for (let i = 0; i < count; i++) {
            this.pedestrians.push(new Pedestrian(this.grid));
        }
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setLightDuration(ms) {
        this.lightDuration = ms;
    }

    setTimeOfDay(val) {
        this.timeOfDay = val;
    }

    toggleTimePause() {
        this.timePaused = !this.timePaused;
        return this.timePaused;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
        });

        const canvas = this.canvas;

        // Pointer Events for unified touch, mouse, and stylus support
        canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            this.camera.handleWheel(e);
        }, { passive: false });
    }

    onPointerDown(e) {
        this.canvas.setPointerCapture(e.pointerId);
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.isPointerDown = true;
        this.hasMoved = false;

        if (this.activePointers.size === 1) {
            this.dragStart = {
                x: e.clientX,
                y: e.clientY,
                camX: this.camera.x,
                camY: this.camera.y
            };

            // If not in Pan tool, perform tool action at clicked tile
            if (this.currentTool !== Tool.PAN && e.button !== 1 && e.button !== 2) {
                const { gx, gy } = this.camera.screenToGrid(e.clientX, e.clientY);
                this.applyTool(gx, gy, e.clientX, e.clientY);
            }
        } else if (this.activePointers.size === 2) {
            // Pinch-to-zoom start
            const pts = Array.from(this.activePointers.values());
            this.prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
    }

    onPointerMove(e) {
        if (!this.activePointers.has(e.pointerId)) return;
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const distMoved = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
        if (distMoved > 4) this.hasMoved = true;

        // Two-finger Pinch-to-zoom on mobile
        if (this.activePointers.size === 2) {
            const pts = Array.from(this.activePointers.values());
            const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

            if (this.prevPinchDist) {
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;
                const factor = currentDist / this.prevPinchDist;
                this.camera.zoomAt(midX, midY, factor);
            }
            this.prevPinchDist = currentDist;
            return;
        }

        // Single pointer drag
        if (this.isPointerDown && this.activePointers.size === 1) {
            if (this.currentTool === Tool.PAN || e.buttons === 4 || e.buttons === 2) {
                // Pan map
                this.camera.x = this.dragStart.camX + (e.clientX - this.dragStart.x);
                this.camera.y = this.dragStart.camY + (e.clientY - this.dragStart.y);
            } else {
                // Continuous drawing
                const { gx, gy } = this.camera.screenToGrid(e.clientX, e.clientY);
                this.applyTool(gx, gy, e.clientX, e.clientY, true);
            }
        }
    }

    onPointerUp(e) {
        this.activePointers.delete(e.pointerId);
        try {
            this.canvas.releasePointerCapture(e.pointerId);
        } catch (err) { }

        if (this.activePointers.size === 0) {
            this.isPointerDown = false;
            this.prevPinchDist = null;
        } else if (this.activePointers.size === 1) {
            this.prevPinchDist = null;
            const remaining = this.activePointers.values().next().value;
            this.dragStart = {
                x: remaining.x,
                y: remaining.y,
                camX: this.camera.x,
                camY: this.camera.y
            };
        }
    }

    applyTool(gx, gy, screenX, screenY, isContinuous = false) {
        if (!this.grid.inBounds(gx, gy)) return;

        // Inspect tool: click lights or honk vehicles
        if (this.currentTool === Tool.INSPECT) {
            if (isContinuous) return;

            // Check if user clicked on a car
            const { exactX, exactY } = this.camera.screenToGrid(screenX, screenY);
            const clickedVehicle = this.vehicles.find(v => Math.hypot(v.x - exactX, v.y - exactY) < 0.65);
            if (clickedVehicle) {
                clickedVehicle.honk();
                return;
            }

            // Check if clicked near a traffic light
            const lx = gx % 2 === 0 ? gx : gx - 1;
            const ly = gy % 2 === 0 ? gy : gy - 1;
            const light = this.lights.find(l => (l.x === gx || l.x === lx) && (l.y === gy || l.y === ly));
            if (light) {
                light.toggle();
                sound.playClick();
            }
            return;
        }

        // Bulldozer tool
        if (this.currentTool === Tool.BULLDOZER) {
            const prev = this.grid.get(gx, gy);
            if (prev !== CellType.GRASS) {
                this.grid.set(gx, gy, CellType.GRASS);
                // Remove any light on this tile
                this.lights = this.lights.filter(l => l.x !== gx || l.y !== gy);
                if (!isContinuous) sound.playDemolish();
            }
            return;
        }

        // Traffic Light Tool
        if (this.currentTool === Tool.LIGHT) {
            if (isContinuous) return;
            const existingIdx = this.lights.findIndex(l => l.x === gx && l.y === gy);
            if (existingIdx >= 0) {
                this.lights.splice(existingIdx, 1);
                sound.playDemolish();
            } else {
                this.lights.push(new TrafficLight(gx, gy));
                sound.playBuild();
            }
            return;
        }

        // Road placement
        if (this.currentTool === Tool.ROAD) {
            const current = this.grid.get(gx, gy);
            if (current === CellType.WATER) {
                this.grid.set(gx, gy, CellType.BRIDGE);
                if (!isContinuous) sound.playBuild();
            } else if (current !== CellType.HIGHWAY && current !== CellType.ROAD) {
                this.grid.set(gx, gy, CellType.ROAD);
                if (!isContinuous) sound.playBuild();
            }
            return;
        }

        // Highway placement (2x2 brush)
        if (this.currentTool === Tool.HIGHWAY) {
            const baseGx = gx % 2 === 0 ? gx : gx - 1;
            const baseGy = gy % 2 === 0 ? gy : gy - 1;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const tx = baseGx + dx;
                    const ty = baseGy + dy;
                    if (this.grid.inBounds(tx, ty)) {
                        const cur = this.grid.get(tx, ty);
                        if (cur === CellType.WATER) this.grid.set(tx, ty, CellType.BRIDGE);
                        else this.grid.set(tx, ty, CellType.HIGHWAY);
                    }
                }
            }
            if (!isContinuous) sound.playBuild();
            return;
        }

        // Zoning & Environment Tools
        const current = this.grid.get(gx, gy);
        if (this.currentTool === Tool.HOUSE && current !== CellType.HOUSE) {
            this.grid.set(gx, gy, CellType.HOUSE);
            if (!isContinuous) sound.playBuild();
        } else if (this.currentTool === Tool.COMMERCIAL && current !== CellType.COMMERCIAL) {
            this.grid.set(gx, gy, CellType.COMMERCIAL);
            if (!isContinuous) sound.playBuild();
        } else if (this.currentTool === Tool.TREE && current !== CellType.TREE) {
            this.grid.set(gx, gy, CellType.TREE);
            if (!isContinuous) sound.playBuild();
        } else if (this.currentTool === Tool.WATER && current !== CellType.WATER) {
            this.grid.set(gx, gy, CellType.WATER);
            if (!isContinuous) sound.playBuild();
        }
    }

    updateStats() {
        let houses = 0;
        let commercial = 0;
        this.grid.forEach((type) => {
            if (type === CellType.HOUSE) houses++;
            else if (type === CellType.COMMERCIAL) commercial++;
        });

        this.stats.population = houses * 4 + commercial * 9;
        this.stats.vehicles = this.vehicles.length;

        const waitingCars = this.vehicles.filter(v => v.waiting).length;
        this.stats.congestion = this.vehicles.length > 0
            ? Math.round((waitingCars / this.vehicles.length) * 100)
            : 0;

        const totalSpeed = this.vehicles.reduce((sum, v) => sum + (v.waiting ? 0 : v.baseSpeed), 0);
        this.stats.avgSpeed = this.vehicles.length > 0
            ? Math.round((totalSpeed / this.vehicles.length) * 500)
            : 0;
    }

    animate(timestamp) {
        const dt = Math.min(timestamp - this.lastTime, 100);
        this.lastTime = timestamp;

        // Advance Day / Night Cycle
        if (!this.timePaused) {
            this.timeOfDay = (this.timeOfDay + (this.timeSpeed * dt) / 1000) % 24;
        }

        // Update Traffic Lights
        this.lights.forEach(l => l.update(dt, this.lightDuration));

        // Update Vehicles
        this.vehicles.forEach(v => v.update(dt, this.vehicles));

        // Update Pedestrians
        this.pedestrians.forEach(p => p.update(dt));

        // Update Stats periodically (every 500ms)
        if (Math.random() < 0.05) {
            this.updateStats();
        }

        // Render Frame
        this.renderer.draw(
            this.grid,
            this.vehicles,
            this.lights,
            this.pedestrians,
            this.timeOfDay
        );

        requestAnimationFrame(this.animate);
    }
}
