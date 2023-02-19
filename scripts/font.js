"use strict"

import { gl } from "./main.js"
import { canvasWidth } from "./main.js";
import { canvasHeight } from "./main.js";

export class Font {
    #_textureId;
    #_shaderProgram;

    constructor (filePath) {
        this.#_textureId = this.#loadFontTexture(filePath);
        this.#_shaderProgram = this.#buildShaders();
    }

    drawString(textString, xPos, yPos, color) {
        const r = (color >> 24 & 255) / 255;
        const g = (color >> 16 & 255) / 255;
        const b = (color >>  8 & 255) / 255;
        const a = (color       & 255) / 255;

        const vertices = [];
        const indices = [];
        const fontSize = 16;
        for (let i = 0; i < textString.length; ++i) {
            const charId = this.#fixCharId(textString.charCodeAt(i));
            const glyphPositionX = charId % 16;
            const glyphPositionY = Math.floor(charId / 16);
            const glyphSize = 0.0625 ; // 16 / 256;

            const u0 = glyphPositionX * glyphSize;
            const v0 = 1 - glyphPositionY * glyphSize;
            const u1 = u0 + glyphSize;
            const v1 = v0 - glyphSize;

            const x = xPos + (fontSize / 1.5 * i);
            vertices.push(x, yPos, 0, u0, v0);
            vertices.push(r, g, b, a);
            vertices.push(x + fontSize, yPos, 0, u1, v0);
            vertices.push(r, g, b, a);
            vertices.push(x + fontSize, yPos + fontSize, 0, u1, v1);
            vertices.push(r, g, b, a);
            vertices.push(x, yPos + fontSize, 0, u0, v1);
            vertices.push(r, g, b, a);

            const id = i * 4;
            indices.push(id, id + 1, id + 2, id + 2, id + 3, id);
        }

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STREAM_DRAW);

        gl.useProgram(this.#_shaderProgram);
        const positionLocation = gl.getAttribLocation(this.#_shaderProgram, "a_Position");
        const colorLocation = gl.getAttribLocation(this.#_shaderProgram, "a_Color");
        const texCoordsLocation = gl.getAttribLocation(this.#_shaderProgram, "a_TextureCoords");
        gl.enableVertexAttribArray(positionLocation);
        gl.enableVertexAttribArray(colorLocation);
        gl.enableVertexAttribArray(texCoordsLocation);

        const projectionMatrix = new Float32Array(16);
        mat4.ortho(projectionMatrix, 0, canvasWidth, canvasHeight, 0, -1, 1);
        const projLocation = gl.getUniformLocation(this.#_shaderProgram, "u_ProjectionMatrix");
        gl.uniformMatrix4fv(projLocation, gl.FALSE, projectionMatrix);

        const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, gl.FALSE, stride, 0);
        gl.vertexAttribPointer(texCoordsLocation, 2, gl.FLOAT, gl.FALSE, stride, Float32Array.BYTES_PER_ELEMENT * 3);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, gl.FALSE, stride, Float32Array.BYTES_PER_ELEMENT * 5);

        gl.disable(gl.DEPTH_TEST);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
        gl.enable(gl.DEPTH_TEST);
    }

    #loadFontTexture(filePath) {
        const texId = gl.createTexture();
        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texId);
            gl.activeTexture(gl.TEXTURE0);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }
        image.src = filePath;
        return texId;
    }

    getTextureId() {
        return this.#_textureId;
    }

    #buildShaders() {
        const vertexShaderTextureSource = `
            precision highp float;

            attribute vec3 a_Position;
            attribute vec4 a_Color;
            attribute vec2 a_TextureCoords;

            uniform mat4 u_ProjectionMatrix;

            varying vec4 color;
            varying vec2 texCoords;

            void main()
            {
                color = a_Color;
                texCoords = a_TextureCoords;
                gl_Position = u_ProjectionMatrix * vec4(a_Position, 1.0);
            }
        `;

        const vertexShaderTexture = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShaderTexture, vertexShaderTextureSource);
        gl.compileShader(vertexShaderTexture);

        if (!gl.getShaderParameter(vertexShaderTexture, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile vertex shader! ${gl.getShaderInfoLog(vertexShaderTexture)}`);
            gl.deleteShader(vertexShaderTexture);
            return null;
        }

        const fragmentShaderTextureSource = `
            precision highp float;

            varying vec4 color;
            varying vec2 texCoords;

            uniform sampler2D sampler;

            void main()
            {
                vec4 tex = texture2D(sampler, texCoords);
                if (tex.a < 0.99)
                    discard;
                gl_FragColor = tex * color;
            }
        `;

        const fragmentShaderTexture = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShaderTexture, fragmentShaderTextureSource);
        gl.compileShader(fragmentShaderTexture);

        if (!gl.getShaderParameter(fragmentShaderTexture, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile fragment shader! ${gl.getShaderInfoLog(fragmentShaderTexture)}`);
            gl.deleteShader(vertexShaderTexture);
            gl.deleteShader(fragmentShaderTexture);
            return null;
        }

        const shaderProgramTexture = gl.createProgram();
        gl.attachShader(shaderProgramTexture, vertexShaderTexture);
        gl.attachShader(shaderProgramTexture, fragmentShaderTexture);
        gl.linkProgram(shaderProgramTexture);

        if (!gl.getProgramParameter(shaderProgramTexture, gl.LINK_STATUS)) {
            console.error(`Failed to link shader program! ${gl.getProgramInfoLog(shaderProgramTexture)}`);
            gl.deleteShader(vertexShaderTexture);
            gl.deleteShader(fragmentShaderTexture);
            gl.deleteProgram(shaderProgramTexture);
            return null;
        }

        gl.deleteShader(vertexShaderTexture);
        gl.deleteShader(fragmentShaderTexture);
        return shaderProgramTexture;    
    }

    #fixCharId(id) {
        //Костыль для поддержки русских букв.
        switch (id) {
            case 1025:
                return 168;

            case 1105:
                return 184;

            default:
                return id > 1000 ? id - 848 : id;
        }
    }
}
