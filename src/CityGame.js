import { Grid, CELL_SIZE } from './Grid.js';
import { Renderer } from './Renderer.js';
import { Generator } from './Generator.js';

export class CityGame {
    constructor(canvas) {
        this.canvas = canvas;
        const cols = Math.floor(window.innerWidth / CELL_SIZE);
        const rows = Math.floor(window.innerHeight / CELL_SIZE);
        // Make grid slightly smaller than screen to verify it's working
        this.grid = new Grid(40, 30);
        this.renderer = new Renderer(canvas);
        this.generator = new Generator();
    }

    start() {
        this.regenerate();
        this.loop();
    }

    regenerate() {
        this.generator.generate(this.grid);
        this.draw();
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        // For now, only draw when needed or static.
        // But let's keep it in loop for potential animations later.
        // this.draw(); 
    }

    draw() {
        this.renderer.draw(this.grid);
    }
}
