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
import { Program, blit } from '/webgl_programs.js'
import { createFBO, createDoubleFBO, resizeDoubleFBO, createTextureAsync, CHECK_FRAMEBUFFER_STATUS } from '/webgl_framebuffers.js'
import {
    baseVertexShader, blurVertexShader, blurShader, copyShader, clearShader, colorShader, checkerboardShader, displayShaderSource,
    environmentShader
} from '/shaders.js'
import { bloomPrefilterShader, bloomBlurShader, bloomFinalShader, sunraysMaskShader, sunraysShader, splatShader, } from '/shaders_effects.js'
import { advectionShader, divergenceShader, curlShader, vorticityShader, pressureShader, gradientSubtractShader, } from '/shaders_fluid.js'

import { startGUI, isMobile, pointers } from './gui.js';



import { initBloomFramebuffers, initSunraysFramebuffers, bloom, bloomFramebuffers, sunrays, sunraysTemp, updateDye, multipleSplats, renderDye, updateKeywords } from '/render_dye.js'

// Simulation section


resizeCanvas();

export let config = {
    SIM_RESOLUTION: 256,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 8192,
    DENSITY_DISSIPATION: .1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 1,
    PRESSURE_ITERATIONS: 20,
    SPEED: 1.0,
    CURL: 5,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    DRAWMODE: 0,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    WALL: true,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: false,
    BLOOM: false,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
    FORCEX: 0.0,
    FORCEY: 0.0,
    FORCER: 0.0, // radial
    FORCEA: 0.0, // axial
    COLORPICKER: false,
    COL1: { r: 255, g: 0, b: 0 },
    COL2: { r: 0, g: 255, b: 0 },
    COL3: { r: 0, g: 0, b: 255 },

}





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
//  Global variables.

//====================================================================================================================

export let dye;            // rgba  -> 4 bytes per point
let velocity;       // rg -> 2 per point
let divergence;      // 1 per point
let curl;            // 1 per point
let pressure;        // 1 per point
let environment; // 

export let environmentTexture = createTextureAsync('hart.png')     //MK MO_simD

export const environmentProgram = new Program(baseVertexShader, environmentShader, true);  //MK MO_simD
const clearProgram = new Program(baseVertexShader, clearShader, true);
const advectionProgram = new Program(baseVertexShader, advectionShader, true);
const divergenceProgram = new Program(baseVertexShader, divergenceShader, true);
const curlProgram = new Program(baseVertexShader, curlShader, true);
const vorticityProgram = new Program(baseVertexShader, vorticityShader, true);
const pressureProgram = new Program(baseVertexShader, pressureShader, true);
const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader, true);


//====================================================================================================================
//  Initialisatie van alle framebuffers. 
//  wordt aangeroepen bij resize
//====================================================================================================================
export function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);   // width,height in pixels.
    let dyeRes = getResolution(config.DYE_RESOLUTION);
    console.log("Sim resolution (w,h):", simRes.width, simRes.height);
    console.log("Dye resolution (w,h):", dyeRes.width, dyeRes.height);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    if (dye == null) dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null) velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    if (environment == null) environment = createDoubleFBO(simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else environment = resizeDoubleFBO(environment, simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, filtering);


    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    initBloomFramebuffers();
    initSunraysFramebuffers();
    multipleSplats(parseInt(Math.random() * 20) + 5, velocity);

    environmentProgram.bind();
    environmentProgram.uniforms.uEnvironment.set(environmentTexture.attach(2));
    blit(environment.write);
    environment.swap();

}



//====================================================================================================================
//====================================================================================================================
//  CODE START
//====================================================================================================================
//====================================================================================================================
updateKeywords();
initFramebuffers();
let lastUpdateTime = Date.now();
update();

//====================================================================================================================
// 
//  Main loop
//
//====================================================================================================================
function update() {
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateDye(dt, velocity);
    var viewenv = true;         // set to true to view environment texture.  For debugging purposes

    if (!config.PAUSED) step(dt);
    renderDye(null);
    requestAnimationFrame(update);

}
//====================================================================================================================
//  helper functions
//====================================================================================================================
function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt * config.SPEED;
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
//====================================================================================================================
//
//  Main fluid simulation. 
//
//====================================================================================================================
//====================================================================================================================
function step(dt) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    curlProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    curlProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    vorticityProgram.uniforms.extForce.set([config.FORCEX, config.FORCEY]);
    vorticityProgram.uniforms.extradForce.set([config.FORCER, config.FORCEA]);
    vorticityProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    vorticityProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    vorticityProgram.uniforms.uEnvironment.set(environmentTexture.attach(2));
    vorticityProgram.uniforms.uCurl.set(curl.attach(1));
    vorticityProgram.uniforms.curl.set(config.CURL);
    vorticityProgram.uniforms.dt.set(dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    divergenceProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    divergenceProgram.uniforms.uVelocity.set(velocity.read.attach(0));
    divergenceProgram.uniforms.wall.set(config.WALL);
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


    // the next section deforms the dye based on the velocity
    advectionProgram.bind();
    advectionProgram.uniforms.texelSize.set([velocity.texelSizeX, velocity.texelSizeY]);
    advectionProgram.uniforms.uEnvironment.set(environmentTexture.attach(2));
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

