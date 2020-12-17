
import { loadshaders,resize } from '/js/gputest/gputest.js'
import { GUI } from '/js/three/dat.gui.module.js'
//import { SVGLoader } from '/js/three/SVGLoader.js';

//window.clean = clean;
//window.snapshot = snapshot;         // expose functions from module


var gui, guiData, x, y;
var loaded = false;

//=================================================================================================================
guiData = {
    cwidth: 1024,
    cheight: 1024,
    t: 'Default',
};
//=================================================================================================================

function scalemidi(i) {
    var s = 1;
    if (mididata.buttons[i] != 0) s = -1;
    return s * mididata.sliders[i]
}

function mupdateparameters() {
}
//=================================================================================================================
function updatescreen() {
    //  console.log('mupdate screen')
    var scale=1;
    resize(guiData.cwidth, guiData.cheight, false, scale)
    if (!loaded) return;
}
//=================================================================================================================

//=================================================================================================================
//=================================================================================================================
$(function () {
    $.getJSON('/js/gputest/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        gui.add(guiData, 't').name('Description');
        gui.add(guiData, 'cwidth', 0, 4096).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096).name('height').onFinishChange(updatescreen);;        
        loadshaders();
    });
});

//========================================================================================================
//========================================================================================================
