import { CellType } from './constants.js';

export class Pedestrian {
    constructor(grid) {
        this.grid = grid;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.speed = 0.015 + Math.random() * 0.01;
        this.color = `hsl(${Math.random() * 360}, 60%, 65%)`;
        this.waitTimer = 0;
        this.findSpawn();
    }

    findSpawn() {
        for (let i = 0; i < 100; i++) {
            const rx = Math.floor(Math.random() * (this.grid.width - 2)) + 1;
            const ry = Math.floor(Math.random() * (this.grid.height - 2)) + 1;
            const cell = this.grid.get(rx, ry);

            // Spawn near houses or commercial buildings on road edges
            if (cell === CellType.HOUSE || cell === CellType.COMMERCIAL || cell === CellType.GRASS) {
                if (this.grid.hasNeighbor(rx, ry, [CellType.ROAD, CellType.HIGHWAY])) {
                    this.x = rx + 0.2 + Math.random() * 0.6;
                    this.y = ry + 0.2 + Math.random() * 0.6;
                    this.pickNewTarget();
                    return;
                }
            }
        }
    }

    pickNewTarget() {
        const cx = Math.floor(this.x);
        const cy = Math.floor(this.y);
        
        // Find adjacent walkway / sidewalk
        const candidates = [
            { x: cx + 1, y: cy },
            { x: cx - 1, y: cy },
            { x: cx, y: cy + 1 },
            { x: cx, y: cy - 1 }
        ].filter(p => this.grid.inBounds(p.x, p.y) && !this.grid.isWater(p.x, p.y));

        if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.targetX = pick.x + 0.2 + Math.random() * 0.6;
            this.targetY = pick.y + 0.2 + Math.random() * 0.6;
        } else {
            this.targetX = this.x;
            this.targetY = this.y;
        }
    }

    update(dt) {
        if (this.waitTimer > 0) {
            this.waitTimer -= dt;
            return;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        const step = this.speed * (dt / 16.67);

        if (dist <= step || dist < 0.05) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.waitTimer = 1000 + Math.random() * 3000;
            this.pickNewTarget();
        } else {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
    }
}
