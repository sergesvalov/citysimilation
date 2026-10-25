import { CellType, CELL_SIZE } from './constants.js';

export { CELL_SIZE };

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Uint8Array(width * height);
        // Metadata store for variations (e.g. building color, window patterns)
        this.meta = new Uint8Array(width * height);
        this.initMeta();
    }

    initMeta() {
        for (let i = 0; i < this.meta.length; i++) {
            this.meta[i] = Math.floor(Math.random() * 256);
        }
    }

    getIndex(x, y) {
        return y * this.width + x;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x, y) {
        if (!this.inBounds(x, y)) return null;
        return this.cells[this.getIndex(x, y)];
    }

    getMeta(x, y) {
        if (!this.inBounds(x, y)) return 0;
        return this.meta[this.getIndex(x, y)];
    }

    set(x, y, type) {
        if (!this.inBounds(x, y)) return;
        const idx = this.getIndex(x, y);
        this.cells[idx] = type;
        this.meta[idx] = Math.floor(Math.random() * 256);
    }

    isRoad(x, y) {
        const type = this.get(x, y);
        return type === CellType.ROAD || type === CellType.HIGHWAY || type === CellType.BRIDGE;
    }

    isDriveable(x, y) {
        return this.isRoad(x, y);
    }

    isWater(x, y) {
        return this.get(x, y) === CellType.WATER;
    }

    getNeighbors(x, y) {
        return {
            north: this.get(x, y - 1),
            east: this.get(x + 1, y),
            south: this.get(x, y + 1),
            west: this.get(x - 1, y)
        };
    }

    hasNeighbor(x, y, types) {
        const n = [
            this.get(x, y - 1),
            this.get(x + 1, y),
            this.get(x, y + 1),
            this.get(x - 1, y)
        ];
        return n.some(t => t !== null && types.includes(t));
    }

    /**
     * Bitmask of connected roads:
     * Bit 0 (1): North
     * Bit 1 (2): East
     * Bit 2 (4): South
     * Bit 3 (8): West
     */
    getRoadMask(x, y) {
        let mask = 0;
        if (this.isRoad(x, y - 1)) mask |= 1;
        if (this.isRoad(x + 1, y)) mask |= 2;
        if (this.isRoad(x, y + 1)) mask |= 4;
        if (this.isRoad(x - 1, y)) mask |= 8;
        return mask;
    }

    forEach(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                callback(this.cells[this.getIndex(x, y)], x, y, this.meta[this.getIndex(x, y)]);
            }
        }
    }
}
