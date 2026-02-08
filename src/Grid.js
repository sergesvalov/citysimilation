export const CELL_SIZE = 32;

export const CellType = {
    GRASS: 0,
    ROAD: 1,
    HOUSE: 2,
    WATER: 3,
    TREE: 4
};

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Array(width * height).fill(CellType.GRASS);
    }

    getIndex(x, y) {
        return y * this.width + x;
    }

    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.cells[this.getIndex(x, y)];
    }

    set(x, y, type) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.cells[this.getIndex(x, y)] = type;
    }

    forEach(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                callback(this.get(x, y), x, y);
            }
        }
    }
}
