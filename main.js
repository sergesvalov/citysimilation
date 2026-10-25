import './style.css';
import { CityGame } from './src/CityGame.js';
import { Tool } from './src/constants.js';
import { importMapFromPhoto } from './src/PhotoMapGenerator.js';
import { sound } from './src/Audio.js';

// Initialize Game
const canvas = document.getElementById('city-canvas');
const game = new CityGame(canvas);
game.start();

// --- Tool Selection ---
const toolButtons = document.querySelectorAll('.tool-btn');
toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        if (!tool) return;
        game.setTool(tool);

        toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Play click sound
        sound.playClick();
    });
});

// --- Quick Actions & Buttons ---
const btnRegen = document.getElementById('btn-regen');
if (btnRegen) {
    btnRegen.addEventListener('click', () => {
        game.regenerate();
        sound.playBuild();
    });
}

const btnClear = document.getElementById('btn-clear');
if (btnClear) {
    btnClear.addEventListener('click', () => {
        if (confirm('Clear entire city?')) {
            game.clearCity();
            sound.playDemolish();
        }
    });
}

const btnCamera = document.getElementById('btn-camera');
if (btnCamera) {
    btnCamera.addEventListener('click', () => {
        importMapFromPhoto(game);
    });
}

// --- Sound Toggle ---
const btnAudio = document.getElementById('btn-audio');
if (btnAudio) {
    const updateAudioIcon = () => {
        btnAudio.textContent = sound.muted ? '🔇' : '🔊';
        btnAudio.title = sound.muted ? 'Unmute Sound' : 'Mute Sound';
    };
    updateAudioIcon();
    btnAudio.addEventListener('click', () => {
        sound.toggleMute();
        updateAudioIcon();
        if (!sound.muted) sound.playClick();
    });
}

// --- Settings Drawer Toggle ---
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
if (btnSettings && settingsPanel) {
    btnSettings.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
        sound.playClick();
    });
}

// --- Zoom Buttons ---
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');

if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
        game.camera.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
    });
}
if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
        game.camera.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
    });
}
if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
        game.camera.zoom = 1.0;
        game.camera.center(game.grid.width, game.grid.height);
    });
}

// --- Sliders ---
const timeSlider = document.getElementById('time-slider');
const timeLabel = document.getElementById('time-label');
const lightSlider = document.getElementById('light-slider');
const lightLabel = document.getElementById('light-label');

if (lightSlider && lightLabel) {
    lightSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        lightLabel.textContent = (val / 1000).toFixed(1) + 's';
        game.setLightDuration(val);
    });
}

if (timeSlider) {
    timeSlider.addEventListener('input', (e) => {
        const hour = parseFloat(e.target.value);
        game.setTimeOfDay(hour);
    });
}

// --- Realtime HUD Updater ---
const hudPopulation = document.getElementById('hud-population');
const hudCars = document.getElementById('hud-cars');
const hudCongestion = document.getElementById('hud-congestion');
const hudSpeed = document.getElementById('hud-speed');
const hudClock = document.getElementById('hud-clock');
const hudSunIcon = document.getElementById('hud-sun-icon');

setInterval(() => {
    if (hudPopulation) hudPopulation.textContent = game.stats.population.toLocaleString();
    if (hudCars) hudCars.textContent = game.stats.vehicles;
    
    if (hudCongestion) {
        hudCongestion.textContent = game.stats.congestion + '%';
        hudCongestion.className = 'stat-value ' + (
            game.stats.congestion < 25 ? 'congestion-low' :
            game.stats.congestion < 55 ? 'congestion-med' : 'congestion-high'
        );
    }
    
    if (hudSpeed) hudSpeed.textContent = game.stats.avgSpeed + ' km/h';

    // Format hour of day
    const hour = Math.floor(game.timeOfDay);
    const minute = Math.floor((game.timeOfDay % 1) * 60);
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    if (hudClock) hudClock.textContent = timeStr;

    // Sun / Moon icon
    const isNight = game.timeOfDay < 6 || game.timeOfDay > 20;
    if (hudSunIcon) hudSunIcon.textContent = isNight ? '🌙' : '☀️';

    // Sync time slider if user is not actively dragging it
    if (timeSlider && document.activeElement !== timeSlider) {
        timeSlider.value = game.timeOfDay;
        if (timeLabel) timeLabel.textContent = timeStr;
    }
}, 300);
