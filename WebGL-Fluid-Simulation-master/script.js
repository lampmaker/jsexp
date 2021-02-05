/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

import { gl, ext, canvas, getResolution, correctDeltaX, correctDeltaY } from './webgl_context.js';
import { generateColor, normalizeColor, scaleByPixelRatio, getTextureScale, wrap } from '/utils.js';
import { Material, Program, blit } from '/webgl_programs.js'
import { createFBO, createDoubleFBO, resizeDoubleFBO, createTextureAsync, CHECK_FRAMEBUFFER_STATUS } from '/webgl_framebuffers.js'
import {
    baseVertexShader, blurVertexShader, blurShader, copyShader, clearShader, colorShader, checkerboardShader, displayShaderSource,
    environmentShader
} from '/shaders.js'
import { bloomPrefilterShader, bloomBlurShader, bloomFinalShader, sunraysMaskShader, sunraysShader, splatShader, } from '/shaders_effects.js'
import { advectionShader, divergenceShader, curlShader, vorticityShader, pressureShader, gradientSubtractShader, } from '/shaders_fluid.js'

import { startGUI, isMobile, pointers } from './gui.js';

// Simulation section


resizeCanvas();

export let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
}


export let splatStack = [];


if (isMobile()) {
    config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
}


//====================================================================================================================
// creates the GUI
//====================================================================================================================
startGUI();



//====================================================================================================================
//
//====================================================================================================================

let dye;            // rgba  -> 4 bytes per point
let velocity;       // rg -> 2 per point
let divergence;      // 1 per point
let curl;            // 1 per point
let pressure;        // 1 per point
let bloom;
let bloomFramebuffers = [];
let sunrays;
let sunraysTemp;
let environment;

let ditheringTexture = createTextureAsync('LDR_LLL1_0.png');
let environmentTexture = createTextureAsync('BORDERS.png')     //MK MOD

const blurProgram = new Program(blurVertexShader, blurShader);
const environmentProgram = new Program(baseVertexShader, environmentShader);  //MK MOD
const clearProgram = new Program(baseVertexShader, clearShader);
const colorProgram = new Program(baseVertexShader, colorShader);
const checkerboardProgram = new Program(baseVertexShader, checkerboardShader);
const bloomPrefilterProgram = new Program(baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader);
const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader);
const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader);
const sunraysProgram = new Program(baseVertexShader, sunraysShader);
const splatProgram = new Program(baseVertexShader, splatShader);
const advectionProgram = new Program(baseVertexShader, advectionShader);
const divergenceProgram = new Program(baseVertexShader, divergenceShader);
const curlProgram = new Program(baseVertexShader, curlShader);
const vorticityProgram = new Program(baseVertexShader, vorticityShader);
const pressureProgram = new Program(baseVertexShader, pressureShader);
const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

const displayMaterial = new Material(baseVertexShader, displayShaderSource);

//====================================================================================================================
//  wordt aangeroepen bij resize  
//====================================================================================================================
export function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null)
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    initBloomFramebuffers();
    initSunraysFramebuffers();
}
//====================================================================================================================
//
//====================================================================================================================

function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}
//====================================================================================================================
//
//====================================================================================================================

function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}



//====================================================================================================================
//
//====================================================================================================================

export function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
multipleSplats(parseInt(Math.random() * 20) + 5);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
update();
//====================================================================================================================
//
//====================================================================================================================

function update() {

    const dt = calcDeltaTime();
    if (resizeCanvas())
        initFramebuffers();

    updateColors(dt);
    applyInputs();
    if (!config.PAUSED)
        step(dt);

    render(null);

    requestAnimationFrame(update);
}
//====================================================================================================================
//
//====================================================================================================================

function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function resizeCanvas() {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}
//====================================================================================================================
//
//====================================================================================================================

function updateColors(dt) {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}
//====================================================================================================================
//
//====================================================================================================================

function applyInputs() {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop());

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });

}
//====================================================================================================================
//
//====================================================================================================================



function step(dt) {
    gl.disable(gl.BLEND);

    //----------------------------------- CURL   input: velocity output -> velocity




    curlProgram.bind();
    curlProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    curlProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    blit(curl);



    vorticityProgram.bind();
    vorticityProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    vorticityProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    vorticityProgram.uniforms.uCurl.set(curl.attach(1));
    vorticityProgram.uniforms.curl.set(config.CURL);
    vorticityProgram.uniforms.dt.set(dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    divergenceProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    divergenceProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    clearProgram.uniforms.uTexture.set(pressure.read.attach(0));
    clearProgram.uniforms.value.set(config.PRESSURE);
    blit(pressure.write);
    pressure.swap();




    pressureProgram.bind();
    pressureProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    pressureProgram.uniforms.uDivergence.set(divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        pressureProgram.uniforms.uPressure.set(pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
    }

    gradienSubtractProgram.bind();
    gradienSubtractProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    gradienSubtractProgram.uniforms.uPressure.set(pressure.read.attach(0));
    gradienSubtractProgram.uniforms.uVelocity.set(velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();




    advectionProgram.bind();
    advectionProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    if (!ext.supportLinearFiltering)
        advectionProgram.uniforms.dyeTexelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    let velocityId = velocity.read.attach(0);
    advectionProgram.uniforms.uVelocity.set(velocityId);
    advectionProgram.uniforms.uSource.set(velocityId);
    advectionProgram.uniforms.dt.set(dt);
    advectionProgram.uniforms.dissipation.set(config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();




    if (!ext.supportLinearFiltering)
        advectionProgram.uniforms.dyeTexelSize.set([dye.texelSizeX, dye.texelSizeY]);
    advectionProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    advectionProgram.uniforms.uSource.set(dye.read.attach(1));
    advectionProgram.uniforms.dissipation.set(config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();



}
//====================================================================================================================
//
//====================================================================================================================

export function render(target) {
    if (config.BLOOM)
        applyBloom(dye.read, bloom);
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
        blur(sunrays, sunraysTemp, 1);
    }

    if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
    }
    else {
        gl.disable(gl.BLEND);
    }

    if (!config.TRANSPARENT)
        drawColor(target, normalizeColor(config.BACK_COLOR));
    if (target == null && config.TRANSPARENT)
        drawCheckerboard(target);
    drawDisplay(target);
}
//====================================================================================================================
//
//====================================================================================================================

function drawColor(target, color) {
    colorProgram.bind();
    colorProgram.uniforms.color.set([color.r, color.g, color.b, 1]);
    blit(target);
}
//====================================================================================================================
//
//====================================================================================================================

function drawCheckerboard(target) {
    checkerboardProgram.bind();
    checkerboardProgram.uniforms.aspectRatio.set(canvas.width / canvas.height);
    blit(target);
}
//====================================================================================================================
//
//====================================================================================================================

function drawDisplay(target) {
    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;
    /*
        environmentProgram.bind();
        environmentProgram.uniforms.uSource.set(environmentTexture);
        environmentProgram.uniforms.uEnvironment.set(environmentTexture);
        blit(target);
        //    return;
    */

    displayMaterial.bind();
    if (config.SHADING)
        displayMaterial.uniforms.texelSize.set([1.0 / width, 1.0 / height]);
    displayMaterial.uniforms.uTexture.set(dye.read.attach(0));
    if (config.BLOOM) {
        displayMaterial.uniforms.uBloom.set(bloom.attach(1));
        displayMaterial.uniforms.uDithering.set(ditheringTexture.attach(2));
        let scale = getTextureScale(ditheringTexture, width, height);
        displayMaterial.uniforms.ditherScale.set([scale.x, scale.y]);
    }
    if (config.SUNRAYS)
        displayMaterial.uniforms.uSunrays.set(sunrays.attach(3));



    blit(target);
}
//====================================================================================================================
//
//====================================================================================================================

function applyBloom(source, destination) {
    if (bloomFramebuffers.length < 2)
        return;

    let last = destination;

    gl.disable(gl.BLEND);

    bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;

    bloomPrefilterProgram.uniforms.curve.set([curve0, curve1, curve2]);
    bloomPrefilterProgram.uniforms.threshold.set(config.BLOOM_THRESHOLD);
    bloomPrefilterProgram.uniforms.uTexture.set(source.attach(0));

    blit(last);

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        bloomBlurProgram.uniforms.texelSize.set([last.texelSizeX, last.texelSizeY]);
        bloomBlurProgram.uniforms.uTexture.set(last.attach(0));
        blit(dest);
        last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        bloomBlurProgram.uniforms.texelSize.set([last.texelSizeX, last.texelSizeY]);
        bloomBlurProgram.uniforms.uTexture.set(last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex);
        last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    bloomFinalProgram.uniforms.texelSize.set([last.texelSizeX, last.texelSizeY]);
    bloomFinalProgram.uniforms.uTexture.set(last.attach(0));
    bloomFinalProgram.uniforms.intensity.set(config.BLOOM_INTENSITY);
    blit(destination);
}
//====================================================================================================================
//
//====================================================================================================================

function applySunrays(source, mask, destination) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    sunraysMaskProgram.uniforms.uTexture.set(source.attach(0));
    blit(mask);

    sunraysProgram.bind();
    sunraysProgram.uniforms.weight.set(config.SUNRAYS_WEIGHT);
    sunraysProgram.uniforms.uTexture.set(mask.attach(0));
    blit(destination);
}
//====================================================================================================================
//
//====================================================================================================================

function blur(target, temp, iterations) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        blurProgram.uniforms.texelSize.set([target.texelSizeX, 0.0]);
        blurProgram.uniforms.uTexture.set(target.attach(0));
        blit(temp);
        blurProgram.uniforms.texelSize.set([0.0, target.texelSizeY]);
        blurProgram.uniforms.uTexture.set(temp.attach(0));
        blit(target);
    }

}

function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
    }
}
//====================================================================================================================
//
//====================================================================================================================

function splat(x, y, dx, dy, color) {
    splatProgram.bind();
    splatProgram.uniforms.uTarget.set(velocity.read.attach(0));
    splatProgram.uniforms.aspectRatio.set(canvas.width / canvas.height);
    splatProgram.uniforms.point.set([x, y]);
    splatProgram.uniforms.color.set([dx, dy, 0.0]);
    splatProgram.uniforms.radius.set(correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write);
    velocity.swap();

    splatProgram.uniforms.uTarget.set(dye.read.attach(0));
    splatProgram.uniforms.color.set([color.r, color.g, color.b]);

    blit(dye.write);
    dye.swap();
}
//====================================================================================================================
//
//====================================================================================================================

function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        radius *= aspectRatio;
    return radius;
}
