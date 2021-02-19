import { config, initFramebuffers, environment } from './script.js';
import { generateColor, normalizeColor, scaleByPixelRatio, getTextureScale, wrap } from './utils.js';

import { gl, ext, canvas, getResolution, correctDeltaX, correctDeltaY } from './webgl_context.js';
import { createFBO, createDoubleFBO, resizeDoubleFBO, createTextureAsync, CHECK_FRAMEBUFFER_STATUS } from './webgl_framebuffers.js'
import { initBloomFramebuffers, initSunraysFramebuffers, bloom, bloomFramebuffers, sunrays, sunraysTemp, updateDye, multipleSplats, renderDye, splatStack, updateKeywords, loadBlock } from './render_dye.js'
import { Font } from '../three/three.module.js';



function getPresetJSON(url) {
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET", url, false);
    Httpreq.send(null);
    return JSON.parse(Httpreq.responseText);
}

//====================================================================================================================
// starts the gui
//====================================================================================================================
export function startGUI() {
    var gui = new dat.GUI({ width: 300, load: getPresetJSON('./js/flow/presets.json'), preset: 'Preset1' });
    gui.remember(config);
    gui.add(config, 'DYE_RESOLUTION', { '16384': 16384, '8192': 8192, '4096': 4096, '2048': 2048, '1024': 1024, '512': 512, '256': 256, '128': 128 }).name('Dye resolution (pixels)').onFinishChange(initFramebuffers);
    gui.add(config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256, '512': 512, '1024': 1024, '2048': 2048, }).name('sim resolution (pixels)').onFinishChange(initFramebuffers);
    gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
    gui.add(config, 'CURL', 0, 50).name('vorticity').step(1);

    let paintfolder = gui.addFolder('Paint');
    paintfolder.add(config, 'DRAWMODE', { 'DYE': 0, 'BLOCK': 1 })
    paintfolder.addColor(config, 'COL1').name('picker color');
    paintfolder.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
    paintfolder.add(config, 'SHADING').name('shading').onFinishChange(updateKeywords);
    paintfolder.add(config, 'COLORFUL').name('colorful');
    paintfolder.add(config, 'COLORPICKER').name('Colorpicker');
    paintfolder.add(config, 'loadBlock').name('load');

    gui.add(config, 'PAUSED').name('paused').listen();
    gui.add(config, 'SPEED', 0.0, 1.0).name('speed');
    gui.add({
        fun: () => {
            splatStack.push(parseInt(Math.random() * 20) + 5);
        }
    }, 'fun').name('Random splats');
    let advanced = gui.addFolder('Advanced')
    advanced.add(config, 'WALL', { 'BLOCK': 0, 'FREE': 1, 'WRAP': 2 }).name('wall').onFinishChange(initFramebuffers);
    advanced.add(config, 'FORCEX', -50, 50, 5).name('Force-X');
    advanced.add(config, 'FORCEY', -50, 50, 5).name('Force-Y');
    advanced.add(config, 'FORCER', -50, 50, 5).name('Force-R');
    advanced.add(config, 'FORCEA', -50, 50, 5).name('Force-Axial');

    let bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(config, 'BLOOM').name('enabled').onFinishChange(updateKeywords);
    bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
    bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');

    let sunraysFolder = gui.addFolder('Sunrays');
    sunraysFolder.add(config, 'SUNRAYS').name('enabled').onFinishChange(updateKeywords);
    sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');

    let captureFolder = gui.addFolder('Capture');
    captureFolder.addColor(config, 'BACK_COLOR').name('background color');
    captureFolder.add(config, 'TRANSPARENT').name('transparent');
    captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot');

}

export function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
}
//====================================================================================================================
// Functions for capturing to file
//====================================================================================================================
function captureScreenshot() {
    let res = getResolution(config.CAPTURE_RESOLUTION);
    let target = createFBO(res.width, res.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST);
    renderDye(target);

    let texture = framebufferToTexture(target);
    texture = normalizeTexture(texture, target.width, target.height);

    let captureCanvas = textureToCanvas(texture, target.width, target.height);
    let datauri = captureCanvas.toDataURL();
    downloadURI('fluid.png', datauri);
    URL.revokeObjectURL(datauri);
}
//---------------------------------------------------------------------------------------------------------------------
function framebufferToTexture(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    let length = target.width * target.height * 4;
    let texture = new Float32Array(length);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
    return texture;
}
//---------------------------------------------------------------------------------------------------------------------
function normalizeTexture(texture, width, height) {
    let result = new Uint8Array(texture.length);
    let id = 0;
    for (let i = height - 1; i >= 0; i--) {
        for (let j = 0; j < width; j++) {
            let nid = i * width * 4 + j * 4;
            result[nid + 0] = clamp01(texture[id + 0]) * 255;
            result[nid + 1] = clamp01(texture[id + 1]) * 255;
            result[nid + 2] = clamp01(texture[id + 2]) * 255;
            result[nid + 3] = clamp01(texture[id + 3]) * 255;
            id += 4;
        }
    }
    return result;
}
//---------------------------------------------------------------------------------------------------------------------
function clamp01(input) {
    return Math.min(Math.max(input, 0), 1);
}
//---------------------------------------------------------------------------------------------------------------------
function textureToCanvas(texture, width, height) {
    let captureCanvas = document.createElement('canvas');
    let ctx = captureCanvas.getContext('2d');
    captureCanvas.width = width;
    captureCanvas.height = height;
    let imageData = ctx.createImageData(width, height);
    imageData.data.set(texture);
    ctx.putImageData(imageData, 0, 0);
    return captureCanvas;
}
//---------------------------------------------------------------------------------------------------------------------
function downloadURI(filename, uri) {
    let link = document.createElement('a');
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}





//=====================================================================================================================
//  mouse interaction stuff below
//
//
//
//
//
//
//====================================================================================================================

function pointerPrototype() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
}

export let pointers = [];
pointers.push(new pointerPrototype());

canvas.addEventListener('mousedown', e => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    let pointer = pointers.find(p => p.id == -1);
    if (pointer == null)
        pointer = new pointerPrototype();
    updatePointerDownData(pointer, -1, posX, posY);
});
//====================================================================================================================
//
//====================================================================================================================

canvas.addEventListener('mousemove', e => {
    let pointer = pointers[0];
    if (!pointer.down) return;
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(pointer, posX, posY);
});
//====================================================================================================================
//
//====================================================================================================================

window.addEventListener('mouseup', () => {
    updatePointerUpData(pointers[0]);
});

//====================================================================================================================
//
//====================================================================================================================



canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    while (touches.length >= pointers.length)
        pointers.push(new pointerPrototype());
    for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i + 1];
        if (!pointer.down) continue;
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
    }
}, false);
//====================================================================================================================
//
//====================================================================================================================

window.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers.find(p => p.id == touches[i].identifier);
        if (pointer == null) continue;
        updatePointerUpData(pointer);
    }
});
//====================================================================================================================
//
//====================================================================================================================

window.addEventListener('keydown', e => {
    if (e.code === 'KeyP')
        config.PAUSED = !config.PAUSED;
    if (e.key === ' ')
        splatStack.push(parseInt(Math.random() * 20) + 5);
});
//====================================================================================================================
//
//====================================================================================================================

function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    if (config.COLORPICKER) {
        var c = config.COL1;
        if (config.DRAWMODE == 0) { // paint DYE
            c.r *= 0.15;
            c.g *= 0.15;
            c.b *= 0.15;
        }

        pointer.color = c;
    }
    else
        pointer.color = generateColor();
}
//====================================================================================================================
//
//====================================================================================================================

function updatePointerMoveData(pointer, posX, posY) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    //pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.moved = true;
}
//====================================================================================================================
//
//====================================================================================================================

function updatePointerUpData(pointer) {
    pointer.down = false;
}
//====================================================================================================================
//
//====================================================================================================================
