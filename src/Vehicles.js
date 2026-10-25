import { CellType, VehicleType, Direction, DX, DY } from './constants.js';
import { sound } from './Audio.js';

let nextVehicleId = 1;

export class Vehicle {
    constructor(grid, lights, type = null) {
        this.id = nextVehicleId++;
        this.grid = grid;
        this.lights = lights;
        
        // Randomly assign vehicle type if not specified
        if (!type) {
            const roll = Math.random();
            if (roll < 0.65) this.type = VehicleType.SEDAN;
            else if (roll < 0.82) this.type = VehicleType.TRUCK;
            else if (roll < 0.94) this.type = VehicleType.BUS;
            else this.type = VehicleType.EMERGENCY;
        } else {
            this.type = type;
        }

        this.configureType();

        this.x = 0;
        this.y = 0;
        this.dir = Direction.NORTH;
        this.currentSpeed = this.baseSpeed;
        this.waiting = false;
        this.braking = false;
        this.stuckTimer = 0;
        this.sirenTimer = 0;
        this.sirenPhase = false; // toggles red/blue for emergency

        this.findSpawn();
        this.lastCellX = Math.floor(this.x);
        this.lastCellY = Math.floor(this.y);
    }

    configureType() {
        switch (this.type) {
            case VehicleType.BUS:
                this.baseSpeed = 0.045 + Math.random() * 0.015;
                this.length = 26;
                this.width = 12;
                this.color = Math.random() < 0.5 ? '#f59e0b' : '#3b82f6'; // Yellow school or blue transit
                break;
            case VehicleType.TRUCK:
                this.baseSpeed = 0.04 + Math.random() * 0.015;
                this.length = 26;
                this.width = 12;
                this.cabColor = `hsl(${Math.random() * 360}, 70%, 45%)`;
                this.color = '#94a3b8'; // Grey container
                break;
            case VehicleType.EMERGENCY:
                this.baseSpeed = 0.08 + Math.random() * 0.02; // Faster
                this.length = 20;
                this.width = 11;
                this.color = '#f8fafc'; // White body
                this.emergencyType = Math.random() < 0.5 ? 'police' : 'ambulance';
                break;
            case VehicleType.SEDAN:
            default:
                this.type = VehicleType.SEDAN;
                this.baseSpeed = 0.06 + Math.random() * 0.03;
                this.length = 18;
                this.width = 10;
                const hues = [0, 25, 45, 140, 200, 220, 270, 320]; // Curated vivid car colors
                const hue = hues[Math.floor(Math.random() * hues.length)];
                this.color = `hsl(${hue}, 80%, ${45 + Math.random() * 15}%)`;
                break;
        }
    }

    findSpawn() {
        for (let i = 0; i < 150; i++) {
            const tx = Math.floor(Math.random() * this.grid.width);
            const ty = Math.floor(Math.random() * this.grid.height);
            if (this.grid.isDriveable(tx, ty)) {
                this.x = tx + 0.5;
                this.y = ty + 0.5;
                this.pickDirection(tx, ty);
                return;
            }
        }
    }

    isCorrectLane(x, y, dir) {
        if (this.grid.get(x, y) !== CellType.HIGHWAY) return true;
        // Right-hand traffic rule on 2x2 highways:
        // North (0): left lane of the 2-lane road (even x)
        // South (2): right lane (odd x)
        // East (1): top lane (even y)
        // West (3): bottom lane (odd y)
        if (dir === Direction.NORTH) return (x % 2 === 0);
        if (dir === Direction.SOUTH) return (x % 2 !== 0);
        if (dir === Direction.EAST) return (y % 2 === 0);
        if (dir === Direction.WEST) return (y % 2 !== 0);
        return true;
    }

    pickDirection(cx, cy) {
        const validDirs = [];
        if (this.grid.isDriveable(cx, cy - 1)) validDirs.push(Direction.NORTH);
        if (this.grid.isDriveable(cx + 1, cy)) validDirs.push(Direction.EAST);
        if (this.grid.isDriveable(cx, cy + 1)) validDirs.push(Direction.SOUTH);
        if (this.grid.isDriveable(cx - 1, cy)) validDirs.push(Direction.WEST);

        if (validDirs.length === 0) {
            this.dir = (this.dir + 2) % 4;
            return;
        }

        const reverse = (this.dir + 2) % 4;
        let options = [];
        if (validDirs.length > 2) options = validDirs;
        else if (validDirs.length === 2) options = validDirs.filter(d => d !== reverse);
        else options = validDirs;

        let bestOptions = options.filter(d => {
            const nx = cx + DX[d];
            const ny = cy + DY[d];
            return this.isCorrectLane(nx, ny, d);
        });

        if (this.grid.get(cx, cy) === CellType.HIGHWAY) {
            bestOptions = bestOptions.filter(d => {
                if (d !== this.dir) {
                    const nx2 = cx + DX[d] * 2;
                    const ny2 = cy + DY[d] * 2;
                    if (!this.grid.isDriveable(nx2, ny2)) return false;
                }
                return true;
            });
        }

        if (bestOptions.length > 0) {
            this.dir = bestOptions[Math.floor(Math.random() * bestOptions.length)];
        } else {
            const fallback = options.length > 0 ? options : validDirs;
            this.dir = fallback[Math.floor(Math.random() * fallback.length)];
        }
    }

    checkTrafficLight() {
        const cx = Math.floor(this.x);
        const cy = Math.floor(this.y);
        
        // Check if current cell is already inside intersection
        const myLightX = cx % 2 === 0 ? cx : cx - 1;
        const myLightY = cy % 2 === 0 ? cy : cy - 1;
        if (this.lights.find(l => l.x === myLightX && l.y === myLightY)) {
            return false; // Already inside intersection, keep moving
        }

        const lookAhead = 0.9;
        const lx = this.x + DX[this.dir] * lookAhead;
        const ly = this.y + DY[this.dir] * lookAhead;

        const gridX = Math.floor(lx);
        const gridY = Math.floor(ly);
        const lightX = gridX % 2 === 0 ? gridX : gridX - 1;
        const lightY = gridY % 2 === 0 ? gridY : gridY - 1;
        const light = this.lights.find(l => l.x === lightX && l.y === lightY);

        if (light) {
            // Emergency vehicles with siren yield less or proceed if safe
            if (this.type === VehicleType.EMERGENCY && Math.random() < 0.7) {
                return false;
            }
            return !light.canPass(this.dir);
        }
        return false;
    }

    /**
     * Anti-Collision & Tailgating Check:
     * Checks if another vehicle is directly in front of this vehicle
     */
    checkVehicleAhead(allVehicles) {
        const safeDistance = (this.length / 32) + 0.55; // ~1.1 to 1.3 tiles
        const checkDist = safeDistance;

        for (let i = 0; i < allVehicles.length; i++) {
            const other = allVehicles[i];
            if (other.id === this.id) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;

            // Vector in our travel direction
            let forwardDist = 0;
            let lateralDist = 0;

            if (this.dir === Direction.NORTH) {
                forwardDist = -dy;
                lateralDist = Math.abs(dx);
            } else if (this.dir === Direction.SOUTH) {
                forwardDist = dy;
                lateralDist = Math.abs(dx);
            } else if (this.dir === Direction.EAST) {
                forwardDist = dx;
                lateralDist = Math.abs(dy);
            } else if (this.dir === Direction.WEST) {
                forwardDist = -dx;
                lateralDist = Math.abs(dy);
            }

            // If other vehicle is ahead in our lane
            if (forwardDist > 0 && forwardDist < checkDist && lateralDist < 0.55) {
                return other; // Found blocking vehicle
            }
        }
        return null;
    }

    honk() {
        sound.playHorn();
    }

    update(dt, allVehicles) {
        const timeScale = dt / 16.67;

        // Emergency siren animation
        if (this.type === VehicleType.EMERGENCY) {
            this.sirenTimer += dt;
            if (this.sirenTimer > 180) {
                this.sirenTimer = 0;
                this.sirenPhase = !this.sirenPhase;
            }
        }

        // 1. Check traffic light
        const lightRed = this.checkTrafficLight();

        // 2. Check collision with vehicle ahead
        const vehicleAhead = this.checkVehicleAhead(allVehicles);

        if (lightRed || vehicleAhead) {
            this.waiting = true;
            this.braking = true;
            this.stuckTimer += dt;

            // Occasional impatient honk if stuck behind traffic for a long time
            if (this.stuckTimer > 5000 && Math.random() < 0.003) {
                sound.playHorn();
                this.stuckTimer = 0;
            }
            return;
        }

        this.waiting = false;
        this.braking = false;
        this.stuckTimer = 0;

        // Move forward smoothly
        const step = this.baseSpeed * timeScale;
        const nextX = this.x + DX[this.dir] * step;
        const nextY = this.y + DY[this.dir] * step;

        const ncx = Math.floor(nextX);
        const ncy = Math.floor(nextY);

        // Turn around if road ends ahead
        if (this.grid.inBounds(ncx, ncy) && !this.grid.isDriveable(ncx, ncy)) {
            this.dir = (this.dir + 2) % 4;
            return;
        }

        this.x = nextX;
        this.y = nextY;

        const cx = Math.floor(this.x);
        const cy = Math.floor(this.y);

        // Cell center crossing check for turns
        if (cx !== this.lastCellX || cy !== this.lastCellY) {
            const distToCenter = Math.abs(this.x - (cx + 0.5)) + Math.abs(this.y - (cy + 0.5));
            if (distToCenter < step * 1.8) {
                this.pickDirection(cx, cy);
                this.lastCellX = cx;
                this.lastCellY = cy;
            }
        }

        // Screen boundary wrap-around
        if (this.x < 0) this.x = this.grid.width - 0.1;
        else if (this.x >= this.grid.width) this.x = 0;
        if (this.y < 0) this.y = this.grid.height - 0.1;
        else if (this.y >= this.grid.height) this.y = 0;
    }
}
