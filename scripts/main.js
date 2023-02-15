"use strict"

const canvasWidth = 800;
const canvasHeight = 600;

const canvas = document.getElementById("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
const gl = canvas.getContext("webgl");
let lastDate = new Date().getTime();
let deltaTime = 0.0;

function makeSphere(xPos, yPos, zPos, radius) {
    const points = [];

    const stepSize = Math.PI / 180.0;
    for (let theta = 0; theta < Math.PI; theta += stepSize) {
        for (let phi = 0; phi < Math.PI * 2; phi += stepSize) {
            const x = xPos + (Math.sin(theta) * Math.cos(phi) * radius);
            const y = yPos + (Math.sin(theta) * Math.sin(phi) * radius);
            const z = zPos + (Math.cos(theta) * radius);
            points.push(x, y, z);
            points.push(1.0, 1.0, 0.0, 1.0);
        }
    }

    return points;
}

function makeCoordinateGrid(gridSize, yPos, cellSize) {
    const grid = [];

    for (let x = -gridSize; x <= gridSize; x += cellSize) {
        grid.push(x, yPos, -gridSize);
        grid.push(1.0, 1.0, 1.0, 1.0);
        grid.push(x, yPos, gridSize);
        grid.push(1.0, 1.0, 1.0, 1.0);
    }

    for (let z = -gridSize; z <= gridSize; z += cellSize) {
        grid.push(-gridSize, yPos, z);
        grid.push(1.0, 1.0, 1.0, 1.0);
        grid.push(gridSize, yPos, z);
        grid.push(1.0, 1.0, 1.0, 1.0);
    }

    return grid;
}

const vertexShaderSource = `
        attribute vec3 a_Position;
        attribute vec4 a_Color;

        uniform mat4 u_ProjectionMatrix;
        uniform mat4 u_ViewMatrix;

        varying vec4 color;

        void main()
        {
            color = a_Color;
            gl_Position = u_ProjectionMatrix * u_ViewMatrix * vec4(a_Position, 1.0);
            gl_PointSize = 1.0;
        }
    `;

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error(`Failed to compile vertex shader! ${gl.getShaderInfoLog(vertexShader)}`);
}

const fragmentShaderSource = `
        precision mediump float;

        varying vec4 color;

        void main()
        {
            gl_FragColor = color;
        }
    `;

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(`Failed to compile fragment shader! ${gl.getShaderInfoLog(fragmentShader)}`);
}

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(`Failed to link shader program! ${gl.getProgramInfoLog(shaderProgram)}`);
}

gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

gl.useProgram(shaderProgram);

const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_Position");
const colorAttributebLocation = gl.getAttribLocation(shaderProgram, "a_Color");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.enableVertexAttribArray(colorAttributebLocation);

const grid = makeCoordinateGrid(10, -1, 1);
const sphere = makeSphere(0, 3, 0, 4);

const vboSphere = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vboSphere);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere), gl.STATIC_DRAW);

const vboGrid = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vboGrid);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grid), gl.STATIC_DRAW);

const strideSize = 7;
const strideSizeBits = strideSize * Float32Array.BYTES_PER_ELEMENT;

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.viewport(0.0, 0.0, canvasWidth, canvasHeight);

function renderScene() {
    const projectionMatrix = new Float32Array(16);
    const viewMatrix = new Float32Array(16);

    const fov = Math.PI / 180.0 * 45.0;
    const aspect = canvasWidth / canvasHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

    const position = [0.0, 0.0, 10.0];
    const frontView = [0.0, 0.0, -1.0];
    const cameraUpVector = [0.0, 1.0, 0.0];
    mat4.lookAt(viewMatrix, position, frontView, cameraUpVector);

    const projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "u_ProjectionMatrix");
    const viewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "u_ViewMatrix");
    gl.uniformMatrix4fv(projectionMatrixUniformLocation, gl.FALSE, projectionMatrix);
    gl.uniformMatrix4fv(viewMatrixUniformLocation, gl.FALSE, viewMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vboSphere);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, gl.FALSE, strideSizeBits, 0);
    gl.vertexAttribPointer(colorAttributebLocation, 4, gl.FLOAT, gl.FALSE, strideSizeBits, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.drawArrays(gl.POINTS, 0, sphere.length / strideSize);

    gl.bindBuffer(gl.ARRAY_BUFFER, vboGrid);

    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, gl.FALSE, strideSizeBits, 0);
    gl.vertexAttribPointer(colorAttributebLocation, 4, gl.FLOAT, gl.FALSE, strideSizeBits, Float32Array.BYTES_PER_ELEMENT * 3);
    gl.drawArrays(gl.LINES, 0, grid.length / strideSize);
}

function lifeCycle() {
    const currentTime = new Date().getTime();
    deltaTime = (currentTime - lastDate) / 1000.0;
    lastDate = currentTime;

    renderScene();

    window.requestAnimationFrame(lifeCycle);
}

window.requestAnimationFrame(lifeCycle);
