import { CellType, VehicleType, Direction, CELL_SIZE, PALETTE } from './constants.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.time = 0; // Animation timestamp for water and sirens

        // Lighting offscreen canvas for night lights overlay
        this.lightCanvas = document.createElement('canvas');
        this.lightCtx = this.lightCanvas.getContext('2d');
    }

    draw(grid, vehicles, lights, pedestrians, timeOfDay) {
        this.time = performance.now();
        const ctx = this.ctx;
        const cam = this.camera;

        // Clear canvas with dark backdrop
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(cam.zoom, cam.zoom);

        // Viewport culling bounds
        const viewLeft = -cam.x / cam.zoom;
        const viewTop = -cam.y / cam.zoom;
        const viewRight = viewLeft + this.canvas.width / cam.zoom;
        const viewBottom = viewTop + this.canvas.height / cam.zoom;

        const startX = Math.max(0, Math.floor(viewLeft / CELL_SIZE));
        const endX = Math.min(grid.width, Math.ceil(viewRight / CELL_SIZE));
        const startY = Math.max(0, Math.floor(viewTop / CELL_SIZE));
        const endY = Math.min(grid.height, Math.ceil(viewBottom / CELL_SIZE));

        // 1. Draw Ground / Base Terrain (Grass & Water)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const type = grid.get(x, y);
                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;

                if (type === CellType.WATER) {
                    this.drawWater(ctx, px, py, x, y);
                } else {
                    this.drawGrass(ctx, px, py, grid.getMeta(x, y));
                }
            }
        }

        // 2. Draw Roads, Highways, and Bridges
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const type = grid.get(x, y);
                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;

                if (type === CellType.ROAD) {
                    this.drawSmartRoad(ctx, grid, x, y, px, py);
                } else if (type === CellType.HIGHWAY) {
                    this.drawHighway(ctx, grid, x, y, px, py);
                } else if (type === CellType.BRIDGE) {
                    this.drawBridge(ctx, grid, x, y, px, py);
                }
            }
        }

        // 3. Draw Buildings and Trees
        const isNight = timeOfDay < 6 || timeOfDay > 20;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const type = grid.get(x, y);
                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;
                const meta = grid.getMeta(x, y);

                if (type === CellType.HOUSE) {
                    this.drawHouse(ctx, px, py, meta, isNight);
                } else if (type === CellType.COMMERCIAL) {
                    this.drawCommercial(ctx, px, py, meta, isNight);
                } else if (type === CellType.TREE) {
                    this.drawTree(ctx, px, py, meta);
                }
            }
        }

        // 4. Draw Traffic Lights
        lights.forEach(light => {
            const px = (light.x + 1) * CELL_SIZE;
            const py = (light.y + 1) * CELL_SIZE;
            this.drawTrafficLight(ctx, light, px, py);
        });

        // 5. Draw Pedestrians
        pedestrians.forEach(p => {
            this.drawPedestrian(ctx, p);
        });

        // 6. Draw Vehicles
        vehicles.forEach(vehicle => {
            this.drawVehicle(ctx, vehicle);
        });

        ctx.restore();

        // 7. Day / Night Overlay & Dynamic Lighting Layer
        this.drawLightingLayer(grid, vehicles, lights, timeOfDay);
    }

    drawGrass(ctx, px, py, meta) {
        ctx.fillStyle = (meta % 5 === 0) ? '#16a34a' : '#15803d';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Subtle grass blade details
        if (meta % 7 === 0) {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(px + (meta % 20), py + ((meta * 3) % 20), 2, 3);
        }
    }

    drawWater(ctx, px, py, gx, gy) {
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Animated wavy reflections
        const wave = Math.sin(this.time * 0.003 + gx * 0.7 + gy * 0.7);
        if (wave > 0.2) {
            ctx.fillStyle = 'rgba(147, 197, 253, 0.45)';
            ctx.fillRect(px + 4, py + 8 + wave * 4, CELL_SIZE - 8, 3);
        }
    }

    drawBridge(ctx, grid, gx, gy, px, py) {
        // Water base
        this.drawWater(ctx, px, py, gx, gy);

        // Concrete / wood bridge deck
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Bridge deck asphalt
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);

        // Railings
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, 3);
        ctx.fillRect(px + 2, py + CELL_SIZE - 5, CELL_SIZE - 4, 3);

        // Dashed center line
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(px + CELL_SIZE / 2 - 1, py + CELL_SIZE / 2 - 1, 2, 4);
    }

    drawSmartRoad(ctx, grid, gx, gy, px, py) {
        const mask = grid.getRoadMask(gx, gy);

        // Dark road asphalt
        ctx.fillStyle = '#374151';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = '#f3f4f6';
        const mid = CELL_SIZE / 2;

        // Straight North-South
        if (mask === 5 || mask === 1 || mask === 4) {
            ctx.fillRect(px + mid - 1, py + 2, 2, 6);
            ctx.fillRect(px + mid - 1, py + 14, 2, 6);
            ctx.fillRect(px + mid - 1, py + 24, 2, 6);
        }
        // Straight East-West
        else if (mask === 10 || mask === 2 || mask === 8) {
            ctx.fillRect(px + 2, py + mid - 1, 6, 2);
            ctx.fillRect(px + 14, py + mid - 1, 6, 2);
            ctx.fillRect(px + 24, py + mid - 1, 6, 2);
        }
        // Intersections: draw crosswalks (зебра)
        else if (mask === 15 || mask === 7 || mask === 11 || mask === 13 || mask === 14) {
            // Center intersection dot
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(px + mid - 2, py + mid - 2, 4, 4);

            // Crosswalk stripes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            if (mask & 1) { // North crosswalk
                for (let i = 6; i < CELL_SIZE - 6; i += 5) ctx.fillRect(px + i, py + 2, 3, 4);
            }
            if (mask & 4) { // South crosswalk
                for (let i = 6; i < CELL_SIZE - 6; i += 5) ctx.fillRect(px + i, py + CELL_SIZE - 6, 3, 4);
            }
        } else {
            // Turning corner road
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(px + mid - 1, py + mid - 1, 2, 2);
        }
    }

    drawHighway(ctx, grid, gx, gy, px, py) {
        // Highway tarmac
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        const mid = CELL_SIZE / 2;

        // Yellow divider on internal borders
        ctx.fillStyle = '#fbbf24';
        if (gx % 2 === 1 && gy % 2 === 0) {
            ctx.fillRect(px, py + mid - 1, 6, 2);
            ctx.fillRect(px + 14, py + mid - 1, 6, 2);
        } else if (gx % 2 === 0 && gy % 2 === 1) {
            ctx.fillRect(px + mid - 1, py, 2, 6);
            ctx.fillRect(px + mid - 1, py + 14, 2, 6);
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(px + mid - 1, py + mid - 1, 2, 2);
        }
    }

    drawHouse(ctx, px, py, meta, isNight) {
        const wallColors = PALETTE.houseWalls;
        const roofColors = PALETTE.houseRoof;
        const colorIdx = meta % wallColors.length;

        // House shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px + 4, py + 8, CELL_SIZE - 6, CELL_SIZE - 8);

        // House main wall body
        ctx.fillStyle = wallColors[colorIdx];
        ctx.fillRect(px + 4, py + 8, CELL_SIZE - 8, CELL_SIZE - 12);

        // Pitched roof (triangle)
        ctx.fillStyle = roofColors[colorIdx];
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 9);
        ctx.lineTo(px + CELL_SIZE / 2, py + 1);
        ctx.lineTo(px + CELL_SIZE - 2, py + 9);
        ctx.closePath();
        ctx.fill();

        // Front door
        ctx.fillStyle = '#451a03';
        ctx.fillRect(px + CELL_SIZE / 2 - 3, py + CELL_SIZE - 9, 6, 5);

        // Windows (glow at night!)
        ctx.fillStyle = isNight && (meta % 4 !== 0) ? '#fef08a' : '#bfdbfe';
        ctx.fillRect(px + 7, py + 11, 4, 4);
        ctx.fillRect(px + CELL_SIZE - 11, py + 11, 4, 4);
    }

    drawCommercial(ctx, px, py, meta, isNight) {
        // Skyscraper body shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px + 5, py + 5, CELL_SIZE - 6, CELL_SIZE - 6);

        // Skyscraper body
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);

        // Rooftop border
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 5, py + 5, CELL_SIZE - 10, CELL_SIZE - 10);

        // Air conditioning unit / Helipad on roof
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + CELL_SIZE / 2 - 3, py + CELL_SIZE / 2 - 3, 6, 6);

        // Office Windows Grid
        for (let wy = 8; wy < CELL_SIZE - 8; wy += 5) {
            for (let wx = 8; wx < CELL_SIZE - 8; wx += 5) {
                const lit = isNight && ((meta + wx * 7 + wy * 13) % 3 !== 0);
                ctx.fillStyle = lit ? '#fef08a' : '#38bdf8';
                ctx.fillRect(px + wx, py + wy, 3, 3);
            }
        }
    }

    drawTree(ctx, px, py, meta) {
        const mid = CELL_SIZE / 2;
        const offsetX = (meta % 5) - 2;
        const offsetY = ((meta * 2) % 5) - 2;

        // Tree shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(px + mid + offsetX + 2, py + mid + offsetY + 3, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark foliage
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(px + mid + offsetX, py + mid + offsetY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Highlight leaf cluster
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px + mid + offsetX - 2, py + mid + offsetY - 2, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTrafficLight(ctx, light, centerX, centerY) {
        // Base housing
        ctx.fillStyle = '#111827';
        ctx.fillRect(centerX - 12, centerY - 12, 24, 24);

        // Border outline
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - 12, centerY - 12, 24, 24);

        // North-South lights
        let nsColor = '#ef4444'; // Red
        if (light.phase === 'GREEN_NS') nsColor = '#22c55e';
        else if (light.phase === 'YELLOW_NS') nsColor = '#eab308';

        ctx.fillStyle = nsColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 6, 3, 0, Math.PI * 2);
        ctx.arc(centerX, centerY + 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // East-West lights
        let ewColor = '#ef4444';
        if (light.phase === 'GREEN_EW') ewColor = '#22c55e';
        else if (light.phase === 'YELLOW_EW') ewColor = '#eab308';

        ctx.fillStyle = ewColor;
        ctx.beginPath();
        ctx.arc(centerX - 6, centerY, 3, 0, Math.PI * 2);
        ctx.arc(centerX + 6, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPedestrian(ctx, p) {
        const sx = p.x * CELL_SIZE;
        const sy = p.y * CELL_SIZE;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx + 1, sy + 1, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Clothes / body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(sx, sy - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawVehicle(ctx, v) {
        const sx = v.x * CELL_SIZE;
        const sy = v.y * CELL_SIZE;

        ctx.save();
        ctx.translate(sx, sy);

        // Rotate based on travel direction
        if (v.dir === Direction.EAST) ctx.rotate(Math.PI / 2);
        else if (v.dir === Direction.SOUTH) ctx.rotate(Math.PI);
        else if (v.dir === Direction.WEST) ctx.rotate(-Math.PI / 2);

        const halfL = v.length / 2;
        const halfW = v.width / 2;

        // Vehicle shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(-halfW + 1, -halfL + 2, v.width, v.length);

        if (v.type === VehicleType.BUS) {
            // Bus body
            ctx.fillStyle = v.color;
            ctx.fillRect(-halfW, -halfL, v.width, v.length);

            // Front windshield
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-halfW + 1, -halfL + 1, v.width - 2, 4);

            // Passenger side windows
            ctx.fillStyle = '#0f172a';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-halfW + 1, -halfL + 7 + i * 4, 2, 3);
                ctx.fillRect(halfW - 3, -halfL + 7 + i * 4, 2, 3);
            }
        } else if (v.type === VehicleType.TRUCK) {
            // Truck Cab
            ctx.fillStyle = v.cabColor;
            ctx.fillRect(-halfW, -halfL, v.width, 9);

            // Cab windshield
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-halfW + 1, -halfL + 1, v.width - 2, 3);

            // Cargo trailer
            ctx.fillStyle = v.color;
            ctx.fillRect(-halfW, -halfL + 10, v.width, v.length - 10);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(-halfW, -halfL + 10, v.width, v.length - 10);
        } else if (v.type === VehicleType.EMERGENCY) {
            // White body
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-halfW, -halfL, v.width, v.length);

            // Red/Blue stripes
            ctx.fillStyle = v.emergencyType === 'police' ? '#1d4ed8' : '#dc2626';
            ctx.fillRect(-halfW, -halfL + 6, v.width, 4);

            // Windshield
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-halfW + 1, -halfL + 1, v.width - 2, 3);

            // Roof flashing lightbar
            const sirenRed = v.sirenPhase ? '#ef4444' : '#1e3a8a';
            const sirenBlue = v.sirenPhase ? '#1e3a8a' : '#3b82f6';
            ctx.fillStyle = sirenRed;
            ctx.fillRect(-halfW + 1, -1, (v.width - 2) / 2, 3);
            ctx.fillStyle = sirenBlue;
            ctx.fillRect(0, -1, (v.width - 2) / 2, 3);
        } else {
            // Standard Sedan
            ctx.fillStyle = v.color;
            ctx.fillRect(-halfW, -halfL, v.width, v.length);

            // Windshield
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(-halfW + 1, -halfL + 3, v.width - 2, 4);

            // Rear window
            ctx.fillRect(-halfW + 1, halfL - 5, v.width - 2, 3);

            // Roof
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(-halfW + 1, -halfL + 7, v.width - 2, v.length - 13);
        }

        // Brake lights
        if (v.braking) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-halfW + 1, halfL - 2, 3, 2);
            ctx.fillRect(halfW - 4, halfL - 2, 3, 2);
        }

        ctx.restore();
    }

    /**
     * Day / Night Overlay and Dynamic Lighting:
     * Punches glowing light cones for car headlights and circles for streetlamps onto the darkness
     */
    drawLightingLayer(grid, vehicles, lights, timeOfDay) {
        // Calculate ambient lighting intensity and color
        // 0.0 = bright day, 0.75 = deep night
        let darkness = 0;
        let ambientColor = 'rgba(10, 15, 30, ';

        if (timeOfDay >= 6 && timeOfDay < 8) {
            // Dawn: warm golden hue
            const p = (timeOfDay - 6) / 2;
            darkness = 0.5 * (1 - p);
            ambientColor = 'rgba(67, 30, 20, ';
        } else if (timeOfDay >= 8 && timeOfDay <= 17) {
            // Full daylight: no darkness overlay needed
            return;
        } else if (timeOfDay > 17 && timeOfDay <= 20) {
            // Dusk: sunset purple/orange
            const p = (timeOfDay - 17) / 3;
            darkness = 0.65 * p;
            ambientColor = 'rgba(40, 20, 50, ';
        } else {
            // Night
            darkness = 0.75;
            ambientColor = 'rgba(9, 14, 28, ';
        }

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Resize offscreen light canvas if needed
        if (this.lightCanvas.width !== width || this.lightCanvas.height !== height) {
            this.lightCanvas.width = width;
            this.lightCanvas.height = height;
        }

        const lctx = this.lightCtx;

        // Fill with darkness
        lctx.fillStyle = ambientColor + darkness + ')';
        lctx.fillRect(0, 0, width, height);

        // Set composite mode to cut glowing light out of the darkness
        lctx.globalCompositeOperation = 'destination-out';

        const cam = this.camera;

        // 1. Street lights glow at traffic intersections
        lights.forEach(light => {
            const sx = cam.x + (light.x + 1) * CELL_SIZE * cam.zoom;
            const sy = cam.y + (light.y + 1) * CELL_SIZE * cam.zoom;
            const radius = 60 * cam.zoom;

            const grad = lctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
            grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            lctx.fillStyle = grad;
            lctx.beginPath();
            lctx.arc(sx, sy, radius, 0, Math.PI * 2);
            lctx.fill();
        });

        // 2. Car Headlights & Siren Beams
        vehicles.forEach(v => {
            const sx = cam.x + v.x * CELL_SIZE * cam.zoom;
            const sy = cam.y + v.y * CELL_SIZE * cam.zoom;
            const beamDist = 55 * cam.zoom;
            const beamSpread = 24 * cam.zoom;

            let angle = -Math.PI / 2; // North
            if (v.dir === Direction.EAST) angle = 0;
            else if (v.dir === Direction.SOUTH) angle = Math.PI / 2;
            else if (v.dir === Direction.WEST) angle = Math.PI;

            // Headlight cone
            lctx.save();
            lctx.translate(sx, sy);
            lctx.rotate(angle);

            const coneGrad = lctx.createRadialGradient(0, 0, 0, beamDist, 0, beamDist);
            coneGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
            coneGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
            coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            lctx.fillStyle = coneGrad;
            lctx.beginPath();
            lctx.moveTo(0, 0);
            lctx.lineTo(beamDist, -beamSpread);
            lctx.lineTo(beamDist, beamSpread);
            lctx.closePath();
            lctx.fill();

            // Emergency siren pulse circle
            if (v.type === VehicleType.EMERGENCY) {
                const sRadius = 45 * cam.zoom;
                const sirenGrad = lctx.createRadialGradient(0, 0, 0, 0, 0, sRadius);
                sirenGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
                sirenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                lctx.fillStyle = sirenGrad;
                lctx.beginPath();
                lctx.arc(0, 0, sRadius, 0, Math.PI * 2);
                lctx.fill();
            }

            lctx.restore();
        });

        lctx.globalCompositeOperation = 'source-over';

        // Draw lighting canvas onto main canvas
        this.ctx.drawImage(this.lightCanvas, 0, 0);
    }
}
