import { loadshaders, clean, snapshot, updateUniformsColors2, updateparameters, resize, updateModifications } from '/js/entropy/grayscott.js'
import { GUI } from '/js/three/dat.gui.module.js'
window.clean = clean;
window.snapshot = snapshot;         // expose functions from module


var gui, guiData, x, y;
var loaded = false;
var midiconnected = false;


var gspeed, gf, gk, gfx, gfy, gfxd, gfyd, gkx, gky, gkxd, gkyd;

guiData = {
    cwidth: 1024,
    cheight: 1024,
    t: 'Default',
    speed: 1,
    gfeed: 0.01,
    gkill: 0.05,
    gfx: 0.0,
    gfxd: 0.0,
    gfy: 0.0,
    gfyd: 0.0,
    gkx: 0.0,
    gkxd: 0.0,
    gky: 0.0,
    gkyd: 0.0,
    shape: "round",
    maskedit: "paint",
    maskmode: 0,
    masksize: 100.0,
    mod1: "",
    mod2: "",
    gclean: clean,
    c1: "#0000AA",
    c2: "#000000",
    c3: "#000000",
    c1pos: 0.1,
    c2pos: 0.2,
    c3pos: 0.4

};


function mupdateparameters() {
    var shapemode = 0;
    if (guiData.shape == "round") shapemode = 1

    var editmode = 0;  // paint
    switch (guiData.maskedit) {
        case "View":
            editmode = 1;
            break;
        case "Edit":
            editmode = 2;
            break;
        case "Off":
            editmode = 3;
            break;
        default:
            break;
    }

    var df = [guiData.gfx, guiData.gfxd, guiData.gfy, guiData.gfyd];
    var dk = [guiData.gkx, guiData.gkxd, guiData.gky, guiData.gkyd];
    updateparameters(guiData.gfeed, guiData.gkill, shapemode, guiData.speed, editmode, guiData.maskmode, guiData.masksize, df, dk);
}

function mupdatemodifications() {
    updateModifications(guiData.mod1, guiData.mod2);
}

var hexToRgb = function (hex, a) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        [parseInt(result[1], 16) / 255.0,
        parseInt(result[2], 16) / 255.0,
        parseInt(result[3], 16) / 255.0,
            a
        ] : null;
}
function updatecolors() {
    //console.log('mupdatecolors')
    var c1 = hexToRgb(guiData.c1, guiData.c1pos);
    var c2 = hexToRgb(guiData.c2, guiData.c2pos);
    var c3 = hexToRgb(guiData.c3, guiData.c3pos);
    updateUniformsColors2(c1, c2, c3);
}

function updatescreen() {
    //  console.log('mupdate screen')
    resize(guiData.cwidth, guiData.cheight, false)
    if (!loaded) return;
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
            clean();
            break;
        case 3:   // slider 1
            gf.setRatio(value);
            break;
        case 4:   // slider 2
            gk.setRatio(value)
            break;
        case 5:   // slider 3
            break;
        case 6:   // slider 4
            break;
        case 7:   // slider 5
            break;
        case 8:   // slider 6
            break;
        case 9:   // slider 7
            break;
        case 10:   // slider 8
            break;
        case 11:   // slider V
            gspeed.setRatio(value);
            break;
        case 14: // knbob 1
            break;

        default:
            break;
    }


}

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
    console.log(midiMessage.data);
    parsemidi(midiMessage.data);
}

function onMIDIFailure() {
    console.log('Could not access your MIDI devices.');
}

$(function () {
    navigator.requestMIDIAccess()
        .then(onMIDISuccess, onMIDIFailure);

    $.getJSON('/js/entropy/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        //gui.add(guiData, 't').name('Description');
        gui.add(guiData, 'gclean').name('Start');
        gui.add(guiData, 'cwidth', 0, 4096).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096).name('height').onFinishChange(updatescreen);;
        gspeed = gui.add(guiData, 'speed', 0.00, 1.0).name('speed').onChange(mupdateparameters);
        gf = gui.add(guiData, 'gfeed', 0.00, 0.100).name('feed').onChange(mupdateparameters);
        gk = gui.add(guiData, 'gkill', 0.04, .070).name('kill').onChange(mupdateparameters);
        var g1 = gui.addFolder('Gradient');
        gfx = g1.add(guiData, 'gfx', -100, 100).name('feed-dx').onChange(mupdateparameters);
        gfxd = g1.add(guiData, 'gfxd', -100, 100).name('feed-dx-center').onChange(mupdateparameters);
        gfy = g1.add(guiData, 'gfy', -100, 100).name('feed-dy').onChange(mupdateparameters);
        gfyd = g1.add(guiData, 'gfyd', -100, 100).name('feed-dy-center').onChange(mupdateparameters);
        gkx = g1.add(guiData, 'gkx', -100, 100).name('kill-dx').onChange(mupdateparameters);
        gkxd = g1.add(guiData, 'gkxd', -100, 100).name('kill-dx-center').onChange(mupdateparameters);
        gky = g1.add(guiData, 'gky', -100, 100).name('kill-dy').onChange(mupdateparameters);
        gkyd = g1.add(guiData, 'gkyd', -100, 100).name('kill-dy-center').onChange(mupdateparameters);
        gui.add(guiData, 'mod1').name('Mod1(x,y,xd,yd,Da,Db,k,f,d)').onFinishChange(mupdatemodifications);
        gui.add(guiData, 'mod2').name('Mod2 (dst.r,dst.g)').onFinishChange(mupdatemodifications);
        var maskgui = gui.addFolder('Mask');
        gui.add(guiData, 'shape', ['rect', 'round']).name('Shape').onChange(mupdateparameters);;
        gui.add(guiData, 'maskedit', ['Paint', 'View', 'Edit', 'Off']).name('Edit mode').onChange(mupdateparameters);;
        gui.add(guiData, 'maskmode', 0, 3).name(' Mask mode').onChange(mupdateparameters);;
        gui.add(guiData, 'masksize', 0, 1000.0).name('mask size').onFinishChange(mupdateparameters);;

        var f1 = gui.addFolder('Colors');
        f1.addColor(guiData, 'c1').name("Color 1").onChange(updatecolors);
        f1.add(guiData, 'c1pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.addColor(guiData, 'c2').name("Color 2").onChange(updatecolors);
        f1.add(guiData, 'c2pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.addColor(guiData, 'c3').name("Color 2").onChange(updatecolors);
        f1.add(guiData, 'c3pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.close();
        loadshaders();
        loaded = true;
    });

});

