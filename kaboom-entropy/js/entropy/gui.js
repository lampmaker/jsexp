
//import { getImgdata, imagedataToSVG, imagedataToTracedata } from '/js/imagetracer_V1.2.6.js';
import { loadshaders, clean, snapshot, updateUniformsColors2, updateparameters, resize, updateModifications, addGrouptoScene, updatethinning, cnvs, gettexture } from '/js/entropy/grayscott.js'
import { GUI } from '/js/three/dat.gui.module.js'
import { SVGLoader } from '/js/three/SVGLoader.js';

window.clean = clean;
window.snapshot = snapshot;         // expose functions from module


var gui, guiData, x, y;
var loaded = false;
var midiconnected = false;

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
    da:0.2097,
    db:0.105,
    shape: "round",
    maskedit: "paint",
    maskmode: 0,
    masksize: 100.0,
    maskfile: loadImage,
    imagetracer: imgtr,
    maskfilename: "olifant",
    maskfeed: 0.01,
    maskkill: 0.05,
    mod1: "",
    mod2: "",
    gclean: clean,
    c1: "#0000AA",
    c2: "#000000",
    c3: "#000000",
    mc:true,
    c1pos: 0.1,
    c2pos: 0.2,
    c3pos: 0.4,
    //ftest: testfunction,
    fthinning: 0,
    grecord: record,
    scale: 1.0,
    image_low: 0,
    image_high: 1
};
//=================================================================================================================

function scalemidi(i) {
    var s = 1;
    if (mididata.buttons[i] != 0) s = -1;
    return s * mididata.sliders[i]
}



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

    var _feed = guiData.gfeed + scalemidi(0) * 0.01;
    var _kill = guiData.gkill + scalemidi(1) * 0.01;


    console.log(_feed, _kill);
    var df = [guiData.gfx, guiData.gfxd, guiData.gfy, guiData.gfyd];
    var dk = [guiData.gkx, guiData.gkxd, guiData.gky, guiData.gkyd];
    updateparameters(_feed, _kill, shapemode, guiData.speed, editmode, guiData.maskmode, guiData.masksize, df, dk, guiData.maskfeed, guiData.maskkill, guiData.image_low, guiData.image_high,guiData.da,guiData.db);

}
//=================================================================================================================
function mupdatemodifications() {
    updateModifications(guiData.mod1, guiData.mod2);
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

function updatecolors() {
    //console.log('mupdatecolors')
    var c1 = hexToRgb(guiData.c1, guiData.c1pos);
    var c2 = hexToRgb(guiData.c2, guiData.c2pos);
    var c3 = hexToRgb(guiData.c3, guiData.c3pos);
    updateUniformsColors2(c1, c2, c3,guiData.mc);
}
//=================================================================================================================
function updatescreen() {
    //  console.log('mupdate screen')
    resize(guiData.cwidth, guiData.cheight, false, guiData.scale)
    if (!loaded) return;
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
            clean();
            break;
        default:
            if (mapmidi(m)) mupdateparameters();
            break;
    }






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

    $.getJSON('/js/entropy/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        //gui.add(guiData, 't').name('Description');
        gui.add(guiData, 'gclean').name('Start');
        gui.add(guiData, 'cwidth', 0, 4096).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096).name('height').onFinishChange(updatescreen);;
        gui.add(guiData, 'scale', 0.1, 3).name('scale').onFinishChange(updatescreen);

        gspeed = gui.add(guiData, 'speed', 0.00, 1.0).name('speed').onChange(mupdateparameters);
        gf = gui.add(guiData, 'gfeed', 0.00, 0.150).name('feed').step(.001).onChange(mupdateparameters);
        gk = gui.add(guiData, 'gkill', 0.04, .070).name('kill').step(.0002).onChange(mupdateparameters);
        var g0 = gui.addFolder('Menu');
        var g1 = g0.addFolder('Advanced');
        g1.add(guiData, 'da', 0.0, 0.5).name('Da').onChange(mupdateparameters);
        g1.add(guiData, 'db', 0.0, 0.5).name('Db').onChange(mupdateparameters);
        gfx = g1.add(guiData, 'gfx', -100, 100).name('feed-dx').onChange(mupdateparameters);
        gfxd = g1.add(guiData, 'gfxd', -100, 100).name('feed-dx-center').onChange(mupdateparameters);
        gfy = g1.add(guiData, 'gfy', -100, 100).name('feed-dy').onChange(mupdateparameters);
        gfyd = g1.add(guiData, 'gfyd', -100, 100).name('feed-dy-center').onChange(mupdateparameters);
        gkx = g1.add(guiData, 'gkx', -100, 100).name('kill-dx').onChange(mupdateparameters);
        gkxd = g1.add(guiData, 'gkxd', -100, 100).name('kill-dx-center').onChange(mupdateparameters);
        gky = g1.add(guiData, 'gky', -100, 100).name('kill-dy').onChange(mupdateparameters);
        gkyd = g1.add(guiData, 'gkyd', -100, 100).name('kill-dy-center').onChange(mupdateparameters);
        g1.add(guiData, 'mod1').name('Mod1(x,y,xd,yd,Da,Db,k,f,d)').onFinishChange(mupdatemodifications);
        g1.add(guiData, 'mod2').name('Mod2 (dst.r,dst.g)').onFinishChange(mupdatemodifications);
        var maskgui = g0.addFolder('Mask');
        maskgui.add(guiData, 'shape', ['rect', 'round']).name('Shape').onChange(mupdateparameters);;
        maskgui.add(guiData, 'maskedit', ['Paint', 'View', 'Edit', 'Off']).name('Edit mode').onChange(mupdateparameters);;
        maskgui.add(guiData, 'maskmode', 0, 10).step(1).name(' Mask mode').onChange(mupdateparameters);;
        maskgui.add(guiData, 'masksize', 0, 1000.0).name('mask size').onFinishChange(mupdateparameters);;
        maskgui.add(guiData, 'maskfilename').name('File name');
        maskgui.add(guiData, 'maskfile').name('load from SVG');
        maskgui.add(guiData, 'maskfeed', 0.00, 0.100).name('feed').step(.001).onChange(mupdateparameters);
        maskgui.add(guiData, 'maskkill', 0.04, .070).name('kill').step(.0002).onChange(mupdateparameters);
        maskgui.add(guiData, 'image_low', -1, 1).name('image-brightness').step(.001).onChange(mupdateparameters);
        maskgui.add(guiData, 'image_high', 0.1, 10).name('image-contrast').step(.001).onChange(mupdateparameters);
        var f1 = g0.addFolder('Colors');
        f1.add(guiData, 'mc').name("change").onChange(updatecolors);
        f1.addColor(guiData, 'c1').name("Color 1").onChange(updatecolors);
        f1.add(guiData, 'c1pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.addColor(guiData, 'c2').name("Color 2").onChange(updatecolors);
        f1.add(guiData, 'c2pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.addColor(guiData, 'c3').name("Color 2").onChange(updatecolors);
        f1.add(guiData, 'c3pos', 0.00, 1.0).name('position').onChange(updatecolors);
        f1.add(guiData, 'fthinning', 0, 20).name('Thinning').onChange(updatethinning);
        f1.close();
        //gui.add(guiData, 'ftest').name('test function');
        var f2 = g0.addFolder('Tools');
        f2.close();
        recbtn = f2.add(guiData, 'grecord').name('RECORD');
        f2.add(guiData, 'imagetracer').name('Trace');
        loadshaders();
        updatecolors();
        // updateparameters();
        loaded = true;
        //var canvas=cnvs();
        stream = cnvs().captureStream(15 /*fps*/);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9"
            //mimeType: "video/webm; codecs=h264"
        });
        mediaRecorder.ondataavailable = function (e) {
            recordedChunks.push(event.data);
            if (mediaRecorder.state === 'recording') {
                // after stop data avilable event run one more time
                mediaRecorder.stop();
            }
        }

        mediaRecorder.onstop = function (event) {
            console.log('stop');
            var blob = new Blob(recordedChunks, {
                type: "video/webm"
            });
            var url = URL.createObjectURL(blob);
            //res(url);
            window.open(url);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'test.webm';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        }


    });





});

//========================================================================================================
//========================================================================================================
function loadImage() {
    var s1 = '/img/';
    var url = s1.concat(guiData.maskfilename);
    if (guiData.maskfilename.split('.')[1] == 'svg') loadSVG(url);
    if (guiData.maskfilename.split('.')[1] == null) {
        url = s1.concat(guiData.maskfilename, '.svg')
        loadSVG(url);
    }
    if (guiData.maskfilename.split('.')[1] == 'png') loadpicture(url);
    if (guiData.maskfilename.split('.')[1] == 'jpg') loadpicture(url);
}

function loadpicture(url) {
    var loader = new THREE.ImageLoader();
    loader.load(url,
        // onLoad callback
        function (image) {
            var group = new THREE.Group();
            /*
            var plane = new THREE.PlaneGeometry(1, 1)
            var mesh = new THREE.Mesh(plane, image);
            group.add(mesh);
            group.position.z = 0.1;
            addGrouptoScene(group);
*/
            var tloader = new THREE.TextureLoader();
            var texture = tloader.load(url, function (tex) {
                // tex and texture are the same in this example, but that might not always be the case
                console.log(texture.image.width, texture.image.height);
                var ratio = texture.image.width / texture.image.height;
                if (ratio > 1) {
                    var planeGeometry = new THREE.PlaneGeometry(1, 1 / ratio);
                }
                else {
                    var planeGeometry = new THREE.PlaneGeometry(ratio, 1);
                }
                //var planeGeometry = new THREE.PlaneGeometry(min(1, ratio), max(1, 1 / ratio));

                var planeMaterial = new THREE.MeshLambertMaterial({ map: texture });
                //var planeMaterial = new THREE.MeshNormalMaterial({ color: 0xAAFFA1 });
                var plane = new THREE.Mesh(planeGeometry, planeMaterial);
                group.add(plane);
                group.position.z = 0.1;
                addGrouptoScene(group);
            })
        },
        // onProgress callback currently not supported
        undefined,
        // onError callback
        function () {
            console.error('An error happened.');
        }
    );
}



function loadSVG(url) {

    var loader = new SVGLoader();
    loader.load(url, function (data) {
        var tpaths = data.paths;
        var group = new THREE.Group();
        var path = new THREE.ShapePath();
        for (var i = 0; i < tpaths.length; i++) {
            for (var j = 0; j < tpaths[i].subPaths.length; j++) {
                path.subPaths.push(tpaths[i].subPaths[j]);
            }
        }
        var material = new THREE.MeshNormalMaterial({ color: 0xAAAAAA });
        var shapes = path.toShapes(true, false);
        for (var j = 0; j < shapes.length; j++) {
            var shape = shapes[j];
            var geometry = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false });
            var mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
        }

        //-- repositioning  and scaling
        group.scale.y *= - 1;
        var box = new THREE.BoxHelper(group, 0xffff00);
        box.geometry.computeBoundingBox();
        var dimX = (box.geometry.boundingBox.max.x - box.geometry.boundingBox.min.x);
        var dimY = (box.geometry.boundingBox.max.y - box.geometry.boundingBox.min.y);
        var dimZ = (box.geometry.boundingBox.max.z - box.geometry.boundingBox.min.z);

        var S = Math.max(dimX, dimY) * 1.05;
        group.scale.x *= (1 / S);
        group.scale.y *= (1 / S);
        group.scale.z *= (1 / S);
        box.update();
        box.geometry.computeBoundingBox();
        var centerX = (box.geometry.boundingBox.max.x + box.geometry.boundingBox.min.x) / 2;
        var centerY = (box.geometry.boundingBox.max.y + box.geometry.boundingBox.min.y) / 2;
        var centerZ = (box.geometry.boundingBox.max.z + box.geometry.boundingBox.min.z) / 2;
        group.position.x = -centerX;
        group.position.y = -centerY;
        group.position.z = 0.1;
        box.geometry.computeBoundingBox();
        dimX = (box.geometry.boundingBox.max.x - box.geometry.boundingBox.min.x);
        dimY = (box.geometry.boundingBox.max.y - box.geometry.boundingBox.min.y);
        dimZ = (box.geometry.boundingBox.max.z - box.geometry.boundingBox.min.z);

        addGrouptoScene(group)
    });
}

//=================================================================================================================
//=================================================================================================================




function record() {
    if (mediaRecorder.state == 'recording') {
        // after stop data avilable event run one more time
        mediaRecorder.stop();
        recbtn.name('RECORD');
        return;
    }
    var recordedChunks = [];
    mediaRecorder.start(40000);
    console.log('start');
    recbtn.name('STOP');
}


function makem3dfromsvg(data) {
    var tpaths = data.paths;
    var group = new THREE.Group();
    var path = new THREE.ShapePath();
    for (var i = 0; i < tpaths.length; i++) {
        for (var j = 0; j < tpaths[i].subPaths.length; j++) {
            path.subPaths.push(tpaths[i].subPaths[j]);
        }
    }
    /*
    var material = new THREE.MeshBasicMaterial( {
        color: new THREE.Color().setStyle( fillColor ),
        opacity: path.userData.style.fillOpacity,
        transparent: path.userData.style.fillOpacity < 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: guiData.fillShapesWireframe
    } );
    */

    var texture = new THREE.TextureLoader().load("img/plywood1.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.005, 0.005);
    texture.center.x = 40;
    texture.center.y = 0;
    //texture.offset=(0,0);
    //var material= new THREE.MeshNormalMaterial();
    var material = [
        new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: 0xffffff }),
        new THREE.MeshStandardMaterial({ map: texture, color: 0x202020 }),
        new THREE.MeshStandardMaterial({ map: texture, color: 0x202020 }),
    ];
    var shapes = path.toShapes(true, false);
    for (var j = 0; j < shapes.length; j++) {
        var shape = shapes[j];
        var geometry = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
    //-- repositioning 
    group.castShadow = true;
    group.scale.y *= - 1;
    var box = new THREE.BoxHelper(group, 0xffff00);
    box.geometry.computeBoundingBox();
    var dimX = (box.geometry.boundingBox.max.x - box.geometry.boundingBox.min.x);
    var dimY = (box.geometry.boundingBox.max.y - box.geometry.boundingBox.min.y);
    var dimZ = (box.geometry.boundingBox.max.z - box.geometry.boundingBox.min.z);

    var S = Math.max(dimX, dimY) * 1.05;
    group.scale.x *= (1 / S);
    group.scale.y *= (1 / S);
    group.scale.z *= (1 / S);
    box.update();
    box.geometry.computeBoundingBox();
    var centerX = (box.geometry.boundingBox.max.x + box.geometry.boundingBox.min.x) / 2;
    var centerY = (box.geometry.boundingBox.max.y + box.geometry.boundingBox.min.y) / 2;
    var centerZ = (box.geometry.boundingBox.max.z + box.geometry.boundingBox.min.z) / 2;
    group.position.x = -centerX;
    group.position.y = -centerY;
    group.position.z = -0.3;
    box.geometry.computeBoundingBox();
    dimX = (box.geometry.boundingBox.max.x - box.geometry.boundingBox.min.x);
    dimY = (box.geometry.boundingBox.max.y - box.geometry.boundingBox.min.y);
    dimZ = (box.geometry.boundingBox.max.z - box.geometry.boundingBox.min.z);

    addGrouptoScene(group)
}

function savetoFile(data, filename, type) {
    var link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link); // Firefox workaround, see #6594
    var blob = new Blob([data], { type: type });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
function imgtr() {
    var canvasx = cnvs();

    var offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvasx.width;
    offscreenCanvas.height = canvasx.height;
    var ctx = offscreenCanvas.getContext("2d");

    ctx.drawImage(canvasx, 0, 0);
    var imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // console.log(imageData);
    //  console.log(svgdata);
    var svgdata = ImageTracer.imagedataToSVG(imageData, 'Default');
    var myWindow = window.open("", "MsgWindow");
    myWindow.document.documentElement.innerHTML = svgdata;
    savetoFile(svgdata, 'test.svg', 'image/svg+xml')

    // var loader = new SVGLoader();
    // var data = loader.parse(svgdata);
    //makem3dfromsvg(data);


}
