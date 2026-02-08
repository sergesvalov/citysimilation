import { CellType } from './Grid.js';

export class Generator {
    constructor() { }

    generate(grid) {
        // 1. Fill with Grass
        for (let i = 0; i < grid.cells.length; i++) {
            grid.cells[i] = CellType.GRASS;
        }

        // 2. Simple Road Generation (Random Walkers)
        const walkers = [];
        for (let i = 0; i < 5; i++) {
            walkers.push({
                x: Math.floor(grid.width / 2),
                y: Math.floor(grid.height / 2),
                dir: Math.floor(Math.random() * 4) // 0: N, 1: E, 2: S, 3: W
            });
        }

        const steps = 300;

        for (let i = 0; i < steps; i++) {
            walkers.forEach(walker => {
                grid.set(walker.x, walker.y, CellType.ROAD);

                // occasionally change direction
                if (Math.random() < 0.2) {
                    walker.dir = Math.floor(Math.random() * 4);
                }

                // Move
                if (walker.dir === 0) walker.y--;
                else if (walker.dir === 1) walker.x++;
                else if (walker.dir === 2) walker.y++;
                else if (walker.dir === 3) walker.x--;

                // Clamp
                walker.x = Math.max(1, Math.min(grid.width - 2, walker.x));
                walker.y = Math.max(1, Math.min(grid.height - 2, walker.y));
            });
        }

        // 3. Place Houses
        // Iterate over grid, if grass and next to road, chance to place house
        const newGrid = [...grid.cells]; // Copy to avoid modification while reading behavior if we were simultaneous
        // But here we can just iterate.

        for (let y = 1; y < grid.height - 1; y++) {
            for (let x = 1; x < grid.width - 1; x++) {
                if (grid.get(x, y) === CellType.GRASS) {
                    if (this.isNextTo(grid, x, y, CellType.ROAD)) {
                        if (Math.random() < 0.3) {
                            grid.set(x, y, CellType.HOUSE);
                        } else if (Math.random() < 0.1) {
                            grid.set(x, y, CellType.TREE);
                        }
                    } else if (Math.random() < 0.05) {
                        grid.set(x, y, CellType.TREE);
                    }
                }
            }
        }
    }

    isNextTo(grid, x, y, type) {
        return (
            grid.get(x + 1, y) === type ||
            grid.get(x - 1, y) === type ||
            grid.get(x, y + 1) === type ||
            grid.get(x, y - 1) === type
        );
    }
}
