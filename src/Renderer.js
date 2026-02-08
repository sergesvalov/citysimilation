import { CELL_SIZE, CellType } from './Grid.js';

export class Renderer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.canvas = canvas;
    }

    draw(grid) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate offset to center the grid
        const totalWidth = grid.width * CELL_SIZE;
        const totalHeight = grid.height * CELL_SIZE;
        const offsetX = (this.canvas.width - totalWidth) / 2;
        const offsetY = (this.canvas.height - totalHeight) / 2;

        grid.forEach((value, x, y) => {
            const posX = offsetX + x * CELL_SIZE;
            const posY = offsetY + y * CELL_SIZE;

            switch (value) {
                case CellType.GRASS:
                    this.ctx.fillStyle = '#4caf50'; // Green
                    break;
                case CellType.ROAD:
                    this.ctx.fillStyle = '#9e9e9e'; // Gray
                    break;
                case CellType.HOUSE:
                    this.ctx.fillStyle = '#f44336'; // Red
                    break;
                case CellType.WATER:
                    this.ctx.fillStyle = '#2196f3'; // Blue
                    break;
                case CellType.TREE:
                    this.ctx.fillStyle = '#2e7d32'; // Dark Green
                    break;
                default:
                    this.ctx.fillStyle = '#000';
            }

            this.ctx.fillRect(posX, posY, CELL_SIZE, CELL_SIZE);

            // Draw grid lines for better visualization (optional)
            this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            this.ctx.strokeRect(posX, posY, CELL_SIZE, CELL_SIZE);

            // Add some details
            if (value === CellType.ROAD) {
                this.ctx.fillStyle = '#fff';
                // Simple dashed line in the middle
                this.ctx.fillRect(posX + CELL_SIZE / 2 - 2, posY + CELL_SIZE / 2 - 2, 4, 4);
            }
            if (value === CellType.HOUSE) {
                // Roof
                this.ctx.fillStyle = '#a52a2a'; // Brown
                this.ctx.beginPath();
                this.ctx.moveTo(posX, posY);
                this.ctx.lineTo(posX + CELL_SIZE / 2, posY - 5);
                this.ctx.lineTo(posX + CELL_SIZE, posY);
                this.ctx.fill();
            }
        });
    }
}
