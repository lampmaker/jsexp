

import { GUI } from '/js/three/dat.gui.module.js'
import { loadSVG, init, voronoi_updateparams, diffgrowth_updateparams, savesvg } from '/js/puzzler/puzzler.js';
;


//window.clean = clean;
//window.snapshot = snapshot;         // expose functions from module

var gui, guiData, x, y;
var loaded = false;
var midiconnected = false;
var VData;
var stream, mediaRecorder, recordedChunks = [];

var mididata = {
    knobs: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    sliders: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0]
}
const midimap = {
    knobs: [14, 15, 16, 17, 18, 19, 29, 21, 22],
    buttons: [23, 24, 25, 276, 27, 28, 29, 30],
    sliders: [3, 4, 5, 6, 7, 8, 9, 10, 11]
}

var gspeed, gf, gk, gfx, gfy, gfxd, gfyd, gkx, gky, gkxd, gkyd, recbtn;
//=================================================================================================================
guiData = {
    cwidth: 1024,
    cheight: 1024,
    maskfile: loadImage,
    imagetracer: imgtr,
    SVG_filename: "beer",
    SVG_edgedist: 1,
    start: diffstart,
    save: savesvg
};

VData = {
    SEED_npieces: 50,
    SEED_autodistribute: true,
    a1: 100,
    a2: 80,
    f: 10,
    a: 0.5
}

var DiffData;
DiffData = {
    d1: 5,
    d2: 3,
    fc: 3,
    forcetonext: .21,
    forcetopoints: 600,
    speed: .07,
    fmax: 1,
    edgeforce: 100
}

//=================================================================================================================

function scalemidi(i) {
    var s = 1;
    if (mididata.buttons[i] != 0) s = -1;
    return s * mididata.sliders[i]
}


//=================================================================================================================
var hexToRgb = function (hex, a) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        [parseInt(result[1], 16) / 255.0,
        parseInt(result[2], 16) / 255.0,
        parseInt(result[3], 16) / 255.0,
            a
        ] : null;
}

//=================================================================================================================
/*

176, x
    Button  Slider  Knob     
1   23      3       14              
2   24      4       15
3   25      5       16
4   26      6       17
5   27      7       18
6   28      8       19
7   29      9       20
8   30      10      21
V   31      11      22    

Slidr AB        176,9
Knob A          192
button a1       176,67
button a2       176,64
button 3        176,1
button 4        176,2

repeat              176,49
back                176,47
forward             176,48
stop                176,46
play         176,45    
record              176,44
*/


function mapmidi(m) {
    var value = m[2] / 127;;
    var control = m[1];
    for (var i = 0; i < 8; i++) {
        if (midimap.knobs[i] == control) {
            mididata.knobs[i] = value;
            return true;
        }

        if (midimap.sliders[i] == control) {
            mididata.sliders[i] = value;
            return true;
        }
        if (midimap.buttons[i] == control) {
            mididata.buttons[i] = value;
            return true;
        }
    }
    return false;
}


function parsemidi(m) {
    var value;
    var control = -1;
    switch (m[0]) {
        case 176:
            control = m[1];
            value = m[2] / 127;
            break;
        case 192: // input 0
            value = m[1] / 127;
            control = 0;
            break;
        default:
            break;
    }
    switch (control) {
        case 0:  // main knob
            break;
        case 2: // button
            break;
        default:
            if (mapmidi(m)) { }
            break;
    }

}

//=================================================================================================================
function updatescreen() {
    init(guiData.cwidth, guiData.cheight);
}
//=================================================================================================================
function onMIDISuccess(midiAccess) {
    console.log(midiAccess);
    console.log('This browser supports WebMIDI!');
    var inputs = midiAccess.inputs;
    var outputs = midiAccess.outputs;
    midiconnected = (midiAccess.inputs.length > 0);
    for (var input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage;
    }
}
function getMIDIMessage(midiMessage) {
    //  console.log(midiMessage.data);
    parsemidi(midiMessage.data);
}
function onMIDIFailure() {
    console.log('Could not access your MIDI devices.');
}
//=================================================================================================================
//=================================================================================================================
$(function () {
    navigator.requestMIDIAccess()
        .then(onMIDISuccess, onMIDIFailure);

    $.getJSON('/js/puzzler/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        //gui.add(guiData, 't').name('Description');
        gui.add(guiData, 'cwidth', 0, 4096).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096).name('height').onFinishChange(updatescreen);;
        //var maskgui = gui.addFolder('Mask');
        gui.add(guiData, 'SVG_filename').name('File name');
        gui.add(guiData, 'SVG_edgedist', 1, 30).name('edge density').onFinishChange(loadImage);;
        gui.add(guiData, 'maskfile').name('load from SVG');
        gui.add(VData, 'SEED_npieces', 20, 300, 1).name('number of pieces').onFinishChange(startseed);
        gui.add(VData, 'SEED_autodistribute', true).name('Auto distribute').onFinishChange(vdetails);
        var vmenu = gui.addFolder('Voronoi Details')
        vmenu.add(VData, 'a1', -10, 500, 1).name('cell-force').onFinishChange(vdetails);
        vmenu.add(VData, 'a2', 0, 500, 1).name('edge-force').onFinishChange(vdetails);
        vmenu.add(VData, 'f', 0, 10,).name('force').onFinishChange(vdetails);
        vmenu.add(VData, 'a', 0, 2).name('limit').onFinishChange(vdetails);
        gui.add(guiData, 'start').name('Diffgrowth start');
        var Dmenu = gui.addFolder('Diff Details')
        Dmenu.add(DiffData, 'd1', 5, 100, 1).name('repulsionradius').onChange(diffdetails);
        Dmenu.add(DiffData, 'd2', 1, 100, 1).name('splitdistance').onChange(diffdetails);
        Dmenu.add(DiffData, 'forcetonext', 0, 100).name('forcetonext').onChange(diffdetails);
        Dmenu.add(DiffData, 'forcetopoints', 0, 1000).name('repulsion force').onChange(diffdetails);
        Dmenu.add(DiffData, 'fc', -10, 100, 1).name('force2').onChange(diffdetails);
        Dmenu.add(DiffData, 'speed', 0, 1).name('speed').onChange(diffdetails);
        Dmenu.add(DiffData, 'fmax', 0, 100).name('fmax').onChange(diffdetails);
        Dmenu.add(DiffData, 'edgeforce', 0, 1000).name('edge repulsion').onChange(diffdetails);
        gui.add(guiData, 'save').name('save to SVG');
    });
    updatescreen();
});
//========================================================================================================
//========================================================================================================
function loadImage() {
    var s1 = '/img/';
    var url = s1.concat(guiData.SVG_filename);
    if (guiData.SVG_filename.split('.')[1] == 'svg') loadSVG(url, guiData.SVG_filename);
    if (guiData.SVG_filename.split('.')[1] == null) {
        url = s1.concat(guiData.SVG_filename, '.svg')
        loadSVG(url, guiData.SVG_filename, guiData.SVG_edgedist);
        //  startseed();
    }

}

function startseed() {
    voronoi_updateparams(VData, true);
}


function vdetails() {
    voronoi_updateparams(VData, false);
}

function diffstart() {
    diffgrowth_updateparams(DiffData, true)
}

function diffdetails() {
    diffgrowth_updateparams(DiffData, false)
}
//=================================================================================================================
//=================================================================================================================




function savetoFile(data, filename, type) {
    var link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link); // Firefox workaround, see #6594
    var blob = new Blob([data], { type: type });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

//========================================================================================
function getimagedata() {
    var canvasx = cnvs();
    var offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvasx.width;
    offscreenCanvas.height = canvasx.height;
    var ctx = offscreenCanvas.getContext("2d");
    ctx.drawImage(canvasx, 0, 0);
    return ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
}
//========================================================================================
function imgtr() {
    var svgdata = ImageTracer.imagedataToSVG(getimagedata(), 'Default');
    var myWindow = window.open("", "MsgWindow");
    myWindow.document.documentElement.innerHTML = svgdata;
    savetoFile(svgdata, 'test.svg', 'image/svg+xml')
    // var loader = new SVGLoader();
    // var data = loader.parse(svgdata);
    //makem3dfromsvg(data);
}
//========================================================================================
