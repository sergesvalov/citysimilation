import { CellType } from './constants.js';
import { TrafficLight } from './TrafficLight.js';

export class Generator {
    constructor() {}

    generate(grid, lights) {
        lights.length = 0;
        grid.cells.fill(CellType.GRASS);

        // 1. Procedural Winding River
        this.generateRiver(grid);

        // 2. Highway Network (2-lane arteries)
        this.generateHighways(grid);

        // 3. Local Street Network
        this.generateStreets(grid);

        // 4. Bridges over water
        this.generateBridges(grid);

        // 5. Zoning: Residential, Commercial, Parks & Trees
        this.generateZoning(grid);

        // 6. Traffic Lights at Major Highway Intersections
        this.generateTrafficLights(grid, lights);
    }

    generateRiver(grid) {
        // Meandering river across the map
        const vertical = Math.random() < 0.5;
        let rx = vertical ? Math.floor(grid.width * (0.3 + Math.random() * 0.4)) : 0;
        let ry = vertical ? 0 : Math.floor(grid.height * (0.3 + Math.random() * 0.4));
        const riverWidth = 3;

        const maxSteps = vertical ? grid.height : grid.width;
        let curveDelta = 0;

        for (let i = 0; i < maxSteps; i++) {
            if (vertical) {
                ry = i;
                curveDelta += (Math.random() - 0.5) * 0.8;
                curveDelta = Math.max(-1.5, Math.min(1.5, curveDelta));
                rx = Math.floor(rx + curveDelta);
                rx = Math.max(riverWidth + 1, Math.min(grid.width - riverWidth - 2, rx));
            } else {
                rx = i;
                curveDelta += (Math.random() - 0.5) * 0.8;
                curveDelta = Math.max(-1.5, Math.min(1.5, curveDelta));
                ry = Math.floor(ry + curveDelta);
                ry = Math.max(riverWidth + 1, Math.min(grid.height - riverWidth - 2, ry));
            }

            // Brush for river
            for (let dy = -1; dy <= riverWidth; dy++) {
                for (let dx = -1; dx <= riverWidth; dx++) {
                    if (Math.hypot(dx, dy) <= riverWidth) {
                        grid.set(rx + dx, ry + dy, CellType.WATER);
                    }
                }
            }
        }
    }

    generateHighways(grid) {
        const highwayWalkers = [];
        const count = 3;

        for (let i = 0; i < count; i++) {
            let sx = Math.floor(grid.width / 2);
            let sy = Math.floor(grid.height / 2);
            if (sx % 2 !== 0) sx--;
            if (sy % 2 !== 0) sy--;

            highwayWalkers.push({
                x: sx + (i * 18 - 18),
                y: sy,
                dir: Math.floor(Math.random() * 4),
                straightSteps: 0
            });
        }

        const steps = 180;
        for (let i = 0; i < steps; i++) {
            highwayWalkers.forEach(w => {
                this.fillBrush(grid, w.x, w.y, 2, CellType.HIGHWAY);

                if (w.straightSteps > 12 && Math.random() < 0.12) {
                    w.dir = Math.floor(Math.random() * 4);
                    w.straightSteps = 0;
                }

                const step = 2;
                if (w.dir === 0) w.y -= step;
                else if (w.dir === 1) w.x += step;
                else if (w.dir === 2) w.y += step;
                else if (w.dir === 3) w.x -= step;

                w.straightSteps += step;
                w.x = Math.max(2, Math.min(grid.width - 4, w.x));
                w.y = Math.max(2, Math.min(grid.height - 4, w.y));

                if (w.x % 2 !== 0) w.x--;
                if (w.y % 2 !== 0) w.y--;
            });
        }
    }

    generateStreets(grid) {
        const streetWalkers = [];
        for (let i = 0; i < 22; i++) {
            const rx = Math.floor(Math.random() * (grid.width - 2)) + 1;
            const ry = Math.floor(Math.random() * (grid.height - 2)) + 1;
            if (grid.hasNeighbor(rx, ry, [CellType.HIGHWAY])) {
                streetWalkers.push({
                    x: rx,
                    y: ry,
                    dir: Math.floor(Math.random() * 4),
                    steps: 0
                });
            }
        }

        for (let i = 0; i < 350; i++) {
            for (let k = streetWalkers.length - 1; k >= 0; k--) {
                const w = streetWalkers[k];

                if (grid.get(w.x, w.y) !== CellType.HIGHWAY && w.steps > 2) {
                    if (grid.hasNeighbor(w.x, w.y, [CellType.HIGHWAY])) {
                        streetWalkers.splice(k, 1);
                        continue;
                    }
                }

                if (grid.get(w.x, w.y) !== CellType.HIGHWAY && grid.get(w.x, w.y) !== CellType.WATER) {
                    grid.set(w.x, w.y, CellType.ROAD);
                }

                if (Math.random() < 0.22) {
                    w.dir = Math.floor(Math.random() * 4);
                }

                if (w.dir === 0) w.y--;
                else if (w.dir === 1) w.x++;
                else if (w.dir === 2) w.y++;
                else if (w.dir === 3) w.x--;

                w.x = Math.max(1, Math.min(grid.width - 2, w.x));
                w.y = Math.max(1, Math.min(grid.height - 2, w.y));
                w.steps++;

                if (w.steps > 55) streetWalkers.splice(k, 1);
            }

            // Spawn replacement walkers
            if (streetWalkers.length < 6 && Math.random() < 0.15) {
                const rx = Math.floor(Math.random() * (grid.width - 2)) + 1;
                const ry = Math.floor(Math.random() * (grid.height - 2)) + 1;
                if (grid.hasNeighbor(rx, ry, [CellType.HIGHWAY])) {
                    streetWalkers.push({
                        x: rx,
                        y: ry,
                        dir: Math.floor(Math.random() * 4),
                        steps: 0
                    });
                }
            }
        }
    }

    generateBridges(grid) {
        // Find roads and highways running across water and convert to bridges
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const val = grid.get(x, y);
                if (val === CellType.ROAD || val === CellType.HIGHWAY) {
                    // Check if adjacent to water
                    if (grid.hasNeighbor(x, y, [CellType.WATER])) {
                        grid.set(x, y, CellType.BRIDGE);
                    }
                }
            }
        }
    }

    generateZoning(grid) {
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                if (grid.get(x, y) === CellType.GRASS) {
                    const nearHighway = grid.hasNeighbor(x, y, [CellType.HIGHWAY]);
                    const nearRoad = grid.hasNeighbor(x, y, [CellType.ROAD]);
                    const nearWater = grid.hasNeighbor(x, y, [CellType.WATER]);

                    if (nearHighway) {
                        // Commercial skyscrapers near major arteries
                        if (Math.random() < 0.35) {
                            grid.set(x, y, CellType.COMMERCIAL);
                        } else if (Math.random() < 0.25) {
                            grid.set(x, y, CellType.HOUSE);
                        } else if (Math.random() < 0.2) {
                            grid.set(x, y, CellType.TREE);
                        }
                    } else if (nearRoad) {
                        // Residential houses along streets
                        if (Math.random() < 0.45) {
                            grid.set(x, y, CellType.HOUSE);
                        } else if (Math.random() < 0.1) {
                            grid.set(x, y, CellType.COMMERCIAL);
                        } else if (Math.random() < 0.2) {
                            grid.set(x, y, CellType.TREE);
                        }
                    } else if (nearWater) {
                        // Waterfront parks and trees
                        if (Math.random() < 0.3) {
                            grid.set(x, y, CellType.TREE);
                        }
                    } else if (Math.random() < 0.04) {
                        // Wild trees in grasslands
                        grid.set(x, y, CellType.TREE);
                    }
                }
            }
        }
    }

    generateTrafficLights(grid, lights) {
        for (let y = 0; y < grid.height; y += 2) {
            for (let x = 0; x < grid.width; x += 2) {
                if (
                    grid.get(x, y) === CellType.HIGHWAY &&
                    grid.get(x + 1, y) === CellType.HIGHWAY &&
                    grid.get(x, y + 1) === CellType.HIGHWAY &&
                    grid.get(x + 1, y + 1) === CellType.HIGHWAY
                ) {
                    const hasNS =
                        (grid.get(x, y - 1) === CellType.HIGHWAY || grid.get(x + 1, y - 1) === CellType.HIGHWAY) &&
                        (grid.get(x, y + 2) === CellType.HIGHWAY || grid.get(x + 1, y + 2) === CellType.HIGHWAY);

                    const hasEW =
                        (grid.get(x - 1, y) === CellType.HIGHWAY || grid.get(x - 1, y + 1) === CellType.HIGHWAY) &&
                        (grid.get(x + 2, y) === CellType.HIGHWAY || grid.get(x + 2, y + 1) === CellType.HIGHWAY);

                    if (hasNS && hasEW) {
                        const tooClose = lights.some(l => Math.abs(l.x - x) + Math.abs(l.y - y) < 14);
                        if (!tooClose) {
                            lights.push(new TrafficLight(x, y));
                        }
                    }
                }
            }
        }
    }

    fillBrush(grid, x, y, size, type) {
        for (let by = 0; by < size; by++) {
            for (let bx = 0; bx < size; bx++) {
                grid.set(x + bx, y + by, type);
            }
        }
    }
}
