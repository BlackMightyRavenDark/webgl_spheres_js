import { gl } from "./main.js";

export class Sphere {

    constructor (x, y, z, radius, speed, detalizationLevel, color) {
        this.xPos = x;
        this.yPos = y;
        this.zPos = z;
        this.radius = radius;
        this.speed = speed;
        this.detalizationLevel = detalizationLevel;
        this.color = color;

        this.vbo = gl.createBuffer();
    }

    make() {
        const r = (this.color >> 24 & 255) / 255;
        const g = (this.color >> 16 & 255) / 255;
        const b = (this.color >>  8 & 255) / 255;
        const a = (this.color       & 255) / 255;

        const points = [];
        const TWO_PI = Math.PI * 2;
        this.verticeCount = 0;
        for (let theta = 0; theta < this.detalizationLevel; ++theta) {
            const lon = this.#mapRange(theta, 0, this.detalizationLevel, 0, Math.PI);
            for (let phi = 0; phi < this.detalizationLevel; ++phi) {
                const lat = this.#mapRange(phi, 0, this.detalizationLevel, 0, TWO_PI)
                const x = Math.sin(lat) * Math.cos(lon) * this.radius;
                const y = Math.sin(lat) * Math.sin(lon) * this.radius;
                const z = Math.cos(lat) * this.radius;
                points.push(x, y, z);
                points.push(r, g, b, a);
                this.verticeCount++;
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    }

    #mapRange(x, in_min, in_max, out_min, out_max) {
        const diff = in_max - in_min;
        return (x - in_min) * (out_max - out_min) / diff + out_min;
    }
}
