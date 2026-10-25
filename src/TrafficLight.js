import { Direction } from './constants.js';

export class TrafficLight {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isGreenNS = Math.random() < 0.5;
        this.phase = this.isGreenNS ? 'GREEN_NS' : 'GREEN_EW'; // GREEN_NS, YELLOW_NS, GREEN_EW, YELLOW_EW
        this.timer = Math.random() * 1000;
        this.duration = 2500;
        this.yellowDuration = 600;
        this.manual = false;
    }

    toggle() {
        this.manual = true;
        this.isGreenNS = !this.isGreenNS;
        this.phase = this.isGreenNS ? 'GREEN_NS' : 'GREEN_EW';
        this.timer = 0;
    }

    update(dt, duration = 2500) {
        if (this.manual) return;
        this.duration = duration;
        this.timer += dt;

        if (this.phase === 'GREEN_NS' && this.timer > this.duration) {
            this.phase = 'YELLOW_NS';
            this.timer = 0;
        } else if (this.phase === 'YELLOW_NS' && this.timer > this.yellowDuration) {
            this.phase = 'GREEN_EW';
            this.isGreenNS = false;
            this.timer = 0;
        } else if (this.phase === 'GREEN_EW' && this.timer > this.duration) {
            this.phase = 'YELLOW_EW';
            this.timer = 0;
        } else if (this.phase === 'YELLOW_EW' && this.timer > this.yellowDuration) {
            this.phase = 'GREEN_NS';
            this.isGreenNS = true;
            this.timer = 0;
        }
    }

    canPass(dir) {
        if (dir === Direction.NORTH || dir === Direction.SOUTH) {
            return this.phase === 'GREEN_NS';
        } else {
            return this.phase === 'GREEN_EW';
        }
    }

    isYellow() {
        return this.phase === 'YELLOW_NS' || this.phase === 'YELLOW_EW';
    }
}
