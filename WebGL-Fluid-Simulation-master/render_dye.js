
import { config, initFramebuffers, updateKeywords, splatStack, render, dye } from './script.js';
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


export let bloom;
export let bloomFramebuffers = [];
export let sunrays;
export let sunraysTemp;

const splatProgram = new Program(baseVertexShader, splatShader, true);
let colorUpdateTimer = 0.0;



//====================================================================================================================
//
//====================================================================================================================


export function initBloomFramebuffers() {
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

export function initSunraysFramebuffers() {
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

export function updateColors(dt) {
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

export function applyInputs(vel) {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop());

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
    splatProgram.bind();
    splatProgram.uniforms.uTarget.set(vel.read.attach(0));
    splatProgram.uniforms.aspectRatio.set(canvas.width / canvas.height);
    splatProgram.uniforms.point.set([x, y]);
    splatProgram.uniforms.color.set([dx, dy, 0.0]);
    splatProgram.uniforms.radius.set(correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(vel.write);
    vel.swap();

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