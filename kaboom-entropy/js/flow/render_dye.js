
import { config, dye, environment } from './script.js';
import { gl, ext, canvas, getResolution } from './webgl_context.js';
import { generateColor, normalizeColor, getTextureScale, wrap } from './utils.js';
import { Program, blit } from './webgl_programs.js'
import { createFBO, createTextureAsync, copyProgram } from './webgl_framebuffers.js'
import { baseVertexShader, blurVertexShader, blurShader, colorShader, checkerboardShader, displayShaderSource } from './shaders.js'
import { bloomPrefilterShader, bloomBlurShader, bloomFinalShader, sunraysMaskShader, sunraysShader, splatShader, } from './shaders_effects.js'

import { pointers } from './gui.js';

export let bloom;
export let bloomFramebuffers = [];
export let sunrays;
export let sunraysTemp;
export let splatStack = [];

let ditheringTexture = createTextureAsync('./js/flow/LDR_LLL1_0.png');
const splatProgram = new Program(baseVertexShader, splatShader, true);
const blurProgram = new Program(blurVertexShader, blurShader, true);
const colorProgram = new Program(baseVertexShader, colorShader, true);
const checkerboardProgram = new Program(baseVertexShader, checkerboardShader, true);
const bloomPrefilterProgram = new Program(baseVertexShader, bloomPrefilterShader, true);
const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader, true);
const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader, true);
const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader, true);
const sunraysProgram = new Program(baseVertexShader, sunraysShader, true);
const displayMaterial = new Program(baseVertexShader, displayShaderSource, false);
let colorUpdateTimer = 0.0;


//====================================================================================================================
//  Keywords (=defines)
//====================================================================================================================
export function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}
//====================================================================================================================
//
//====================================================================================================================


export function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering, config.WALL);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering, config.WALL);
        bloomFramebuffers.push(fbo);
    }
}
//====================================================================================================================
//
//====================================================================================================================

export function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering, config.WALL);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering, config.WALL);
}



export function updateDye(dt, vel) {
    updateColors(dt);
    applyInputs(vel);
}

//====================================================================================================================
//
//====================================================================================================================

function updateColors(dt) {
    if (!config.COLORFUL) return;
    if (config.COLORPICKER) return;
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

function activateblock(data) {
    copyProgram.bind();
    copyProgram.uniforms.uTexture.set(data.attach(0));
    blit(environment.write);
    environment.swap();
}

export function loadBlock() {
    createTextureAsync('./js/flow/eik.png', activateblock)



}

/*
let input = "/img/boom.svg"
new SvgToPngConverter().convertFromInput(input, function (imgData) {
    // You now have your png data in base64 (imgData). 
    // Do what ever you wish with it here.
});
*/

//====================================================================================================================
//
//====================================================================================================================

function applyInputs(vel) {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop(), vel);

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p, vel);
        }
    });
}

function splatPointer(pointer, vel) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color, vel);
}

export function multipleSplats(amount, vel) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color, vel);
    }
}
//====================================================================================================================
//
//====================================================================================================================

function splat(x, y, dx, dy, color, vel) {
    if (config.DRAWMODE == 1) { // block
        splatProgram.bind();
        splatProgram.uniforms.aspectRatio.set(canvas.width / canvas.height);
        splatProgram.uniforms.point.set([x, y]);
        splatProgram.uniforms.color.set(config.COL1);
        splatProgram.uniforms.multiplier.set(0);
        splatProgram.uniforms.radius.set(correctRadius(config.SPLAT_RADIUS / 100.0));
        splatProgram.uniforms.uTarget.set(environment.read.attach(0));
        splatProgram.uniforms.color.set([config.COL1.r / 255.0, config.COL1.g / 255.0, config.COL1.b / 255.0]);
        blit(environment.write);
        environment.swap();
    }
    else {  // paint dye
        splatProgram.bind();
        splatProgram.uniforms.uTarget.set(vel.read.attach(0));
        splatProgram.uniforms.aspectRatio.set(canvas.width / canvas.height);
        splatProgram.uniforms.point.set([x, y]);
        splatProgram.uniforms.color.set([dx, dy, 0.0]);
        splatProgram.uniforms.multiplier.set(1);
        splatProgram.uniforms.radius.set(correctRadius(config.SPLAT_RADIUS / 100.0));
        blit(vel.write);
        vel.swap();
        splatProgram.uniforms.uTarget.set(dye.read.attach(0));
        splatProgram.uniforms.color.set([color.r, color.g, color.b]);
        blit(dye.write);
        dye.swap();
    }

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
export function renderDye(target) {
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
    displayMaterial.bind();
    displayMaterial.uniforms.uTexture.set(dye.read.attach(0));
    if (config.SHADING)
        displayMaterial.uniforms.texelSize.set([1.0 / width, 1.0 / height]);
    if (config.BLOOM) {
        displayMaterial.uniforms.uBloom.set(bloom.attach(1));
        displayMaterial.uniforms.uDithering.set(ditheringTexture.attach(2));
        let scale = getTextureScale(ditheringTexture, width, height);
        displayMaterial.uniforms.ditherScale.set([scale.x, scale.y]);
    }
    if (config.SUNRAYS)
        displayMaterial.uniforms.uSunrays.set(sunrays.attach(3));
    displayMaterial.uniforms.uEnvironment.set(environment.read.attach(4));
    blit(target);


}
