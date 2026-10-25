import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CellType } from './constants.js';
import { TrafficLight } from './TrafficLight.js';
import { sound } from './Audio.js';

export async function importMapFromPhoto(game) {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Prompt
        });

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            tempCanvas.width = game.grid.width;
            tempCanvas.height = game.grid.height;

            // Draw scaled image to grid resolution
            ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            game.lights = [];
            game.vehicles = [];
            game.pedestrians = [];

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const pixelIndex = i / 4;
                const x = pixelIndex % tempCanvas.width;
                const y = Math.floor(pixelIndex / tempCanvas.width);

                const maxColor = Math.max(r, g, b);
                const minColor = Math.min(r, g, b);
                const isGray = (maxColor - minColor) < 32;
                const brightness = (r + g + b) / 3;

                // Color classification:
                if (isGray && brightness < 140) {
                    // Dark gray / black -> Road
                    game.grid.set(x, y, CellType.ROAD);
                } else if (b > r + 25 && b > g + 15) {
                    // Blue -> Water
                    game.grid.set(x, y, CellType.WATER);
                } else if (g > r + 15 && g > b + 15) {
                    // Green -> Grass / Tree
                    if (Math.random() < 0.15) {
                        game.grid.set(x, y, CellType.TREE);
                    } else {
                        game.grid.set(x, y, CellType.GRASS);
                    }
                } else if (brightness > 110 && !isGray) {
                    // Saturated colorful building
                    if (brightness > 170) {
                        game.grid.set(x, y, CellType.COMMERCIAL);
                    } else {
                        game.grid.set(x, y, CellType.HOUSE);
                    }
                } else {
                    game.grid.set(x, y, CellType.GRASS);
                }
            }

            // Post-processing: bridge conversion & road connection
            for (let y = 1; y < game.grid.height - 1; y++) {
                for (let x = 1; x < game.grid.width - 1; x++) {
                    if (game.grid.isRoad(x, y) && game.grid.hasNeighbor(x, y, [CellType.WATER])) {
                        game.grid.set(x, y, CellType.BRIDGE);
                    }
                    // Auto-place traffic lights at 4-way intersections
                    if (game.grid.isRoad(x, y) && game.grid.getRoadMask(x, y) === 15) {
                        if (Math.random() < 0.25) {
                            game.lights.push(new TrafficLight(x, y));
                        }
                    }
                }
            }

            sound.playBuild();
            game.spawnVehicles(45);
            game.spawnPedestrians(30);
            game.updateStats();
        };

        img.src = image.webPath;
    } catch (err) {
        console.warn('Camera selection dismissed or error:', err);
    }
}
