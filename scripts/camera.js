"use strict"

export class Camera {
    constructor(posX, posY, posZ, rotX, rotY, rotZ) {
        this.positionX = posX;
        this.positionY = posY;
        this.positionZ = posZ;
        this.rotationX = rotX;
        this.rotationY = rotY;
        this.rotationZ = rotZ;
        this.flyingSpeed = 10.0;

        this.calculateDirection();
    }

    calculateDirection() {
        const RADIAN = Math.PI / 180.0;
        this.directionX = Math.cos((this.rotationX - 90) * RADIAN) * Math.cos(this.rotationY * RADIAN);
        this.directionY = Math.sin(this.rotationY * RADIAN);
        this.directionZ = Math.sin((this.rotationX - 90) * RADIAN) * Math.cos(this.rotationY * RADIAN);

        const length = Math.sqrt(this.directionX * this.directionX + this.directionY * this.directionY + this.directionZ * this.directionZ);
        if (Math.abs(length) >= 0.001) {
            this.directionX /= length;
            this.directionY /= length;
            this.directionZ /= length;
        }
    }
}
