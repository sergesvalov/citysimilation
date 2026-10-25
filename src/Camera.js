import { CELL_SIZE } from './constants.js';

export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
        this.minZoom = 0.45;
        this.maxZoom = 2.8;

        // Pointer tracking for drag & pinch
        this.pointers = new Map();
        this.prevPinchDist = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    center(gridWidth, gridHeight) {
        const totalW = gridWidth * CELL_SIZE * this.zoom;
        const totalH = gridHeight * CELL_SIZE * this.zoom;
        this.x = (this.canvas.width - totalW) / 2;
        this.y = (this.canvas.height - totalH) / 2;
    }

    screenToGrid(screenX, screenY) {
        const worldX = (screenX - this.x) / this.zoom;
        const worldY = (screenY - this.y) / this.zoom;
        return {
            gx: Math.floor(worldX / CELL_SIZE),
            gy: Math.floor(worldY / CELL_SIZE),
            exactX: worldX / CELL_SIZE,
            exactY: worldY / CELL_SIZE
        };
    }

    gridToScreen(gx, gy) {
        return {
            sx: this.x + gx * CELL_SIZE * this.zoom,
            sy: this.y + gy * CELL_SIZE * this.zoom
        };
    }

    zoomAt(screenX, screenY, factor) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (newZoom === this.zoom) return;

        // Keep cursor position stable in world coordinates
        const worldX = (screenX - this.x) / this.zoom;
        const worldY = (screenY - this.y) / this.zoom;

        this.zoom = newZoom;
        this.x = screenX - worldX * this.zoom;
        this.y = screenY - worldY * this.zoom;
    }

    handleWheel(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        this.zoomAt(e.clientX, e.clientY, factor);
    }
}
