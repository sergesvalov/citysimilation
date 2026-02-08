import './style.css'
import { CityGame } from './src/CityGame.js'

const canvas = document.getElementById('city-canvas');
const regenBtn = document.getElementById('regen-btn');

// Resize canvas to fill window
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const game = new CityGame(canvas);
game.start();

regenBtn.addEventListener('click', () => {
    game.regenerate();
});
