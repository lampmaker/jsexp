
import { init, resize, loadSVG, resetview, freezeview, export3D, updateUvTransform, updatecolor, updateGeometry, updatebackgroundpos, updatebackground, updatelight, getcanvas, explodedview, rendertotexture } from './3dviewer.js';
import { GUI } from '/js/three/dat.gui.module.js'
import { GLTFExporter } from '/js/three/GLTFExporter.js'

var gui, guiData, x, y;
var loaded = false;


var stream, mediaRecorder, recordedChunks = [], recbtn;


//=================================================================================================================
guiData = {
    cwidth: 1024,
    cheight: 1024,
    offsetX: 1,
    offsetY: 0.5,
    repeatX: 0.0035,
    repeatY: 0.008,
    rotation: 0.0,//Math.PI / 4, // positive is counter-clockwise
    curvesegments: 2,
    scale: 0.0,
    color: '#CCAAAA',
    bevel: true,
    flat: false,
    simplify: 0.0,
    maskfile: loadImage,
    maskfilename: "olifant",
    resetview: false,
    _savejpg: saveasjpg,
    _export3D: export3D,
    bgfilename: "wall1",
    objectposx: 0.0,
    objectposy: 0.0,
    objectrot: 0,
    lightx: -500,
    lighty: 1000,
    lightz: 2000,
    lightf: 2,
    spot: '#FFFFFF',
    ambient: '#FFFFFF',
    lighti: 1.0,
    flip: false,
    Start: record,
    Frame: record_frame,
    explode: 0,
    playbackspeed: 0,
    movecam: false,
    zpos: 4.01

};
//=================================================================================================================
//=================================================================================================================
function updatescreen() {
    //  console.log('mupdate screen')
    resize(guiData.cwidth, guiData.cheight, false, guiData.scale)
    if (!loaded) return;
}
function _updatecolor() {
    updatecolor(guiData.color);
}
//=================================================================================================================
function resetcam() {
    if (guiData.resetview) resetview(0, 0, 700);
    freezeview(guiData.resetview);
}
//=================================================================================================================
function _updateUvTransform() {
    updateUvTransform(guiData.offsetX, guiData.offsetY, guiData.repeatX / 1000, guiData.repeatY / 1000, guiData.rotation); // rotation is around [ 0.5, 0.5 ] 
    updateGeometry(guiData.curvesegments, guiData.bevel, guiData.flat, guiData.simplify, guiData.scale);
}
function _updatebackgroundpos() {
    updatebackgroundpos(guiData.objectposx, guiData.objectposy, guiData.objectrot, guiData.flip, guiData.zpos);
}
function _updatebackground() {
    updatebackground(guiData.bgfilename)
}
function _updatelight() {
    updatelight(guiData.lightx, guiData.lighty, guiData.lightz, guiData.lightf, guiData.spot, guiData.ambient, guiData.lighti);
}

//=================================================================================================================
$(function () {
    $.getJSON('/js/3Dviewer/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        gui.add(guiData, 'cwidth', 0, 4096, 128).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096, 4).name('height').onFinishChange(updatescreen);;
        gui.add(guiData, 'maskfilename').name('File name');
        gui.add(guiData, 'maskfile').name('load from SVG');
        var g0 = gui.addFolder('texture');
        g0.add(guiData, 'offsetX', 0.0, 1.0, 0.001).name('offset.x').onChange(_updateUvTransform);
        g0.add(guiData, 'offsetY', 0.0, 1.0, 0.001).name('offset.y').onChange(_updateUvTransform);
        g0.add(guiData, 'repeatX', 1, 10, 0.01).name('repeat.x').onChange(_updateUvTransform);
        g0.add(guiData, 'repeatY', 1, 10, 0.01).name('repeat.y').onChange(_updateUvTransform);
        g0.add(guiData, 'rotation', - 2.0, 2.0).name('rotation').onChange(_updateUvTransform);
        g0.add(guiData, 'zpos', - 2.0, 4.01).name('zpos').onChange(_updatebackgroundpos);
        g0.addColor(guiData, 'color',).name('color').onFinishChange(_updatecolor);
        g0.add({ ren: () => { rendertotexture() } }, 'ren').name('Render to texture');

        var g1 = gui.addFolder('Geometry')
        g1.add(guiData, 'curvesegments', 1, 20, 1).name('curve segments').onChange(_updateUvTransform);
        g1.add(guiData, 'simplify', 0.0, 5.0, 0.01).name('simplify').onChange(_updateUvTransform);
        g1.add(guiData, 'bevel', true).name('curve Bevel').onChange(_updateUvTransform);
        g1.add(guiData, 'flat').onChange(_updateUvTransform)
        g1.add(guiData, 'scale', 0, 1000).name('Scale to width (mm)').onChange(_updateUvTransform);

        var g2 = gui.addFolder('Background')
        g2.add(guiData, 'bgfilename').name('Background texture').onFinishChange(_updatebackground);
        g2.add(guiData, 'objectposx', -500, 500).name('offset.x').onChange(_updatebackgroundpos);
        g2.add(guiData, 'objectposy', -500, 500).name('offset.y').onChange(_updatebackgroundpos);
        g2.add(guiData, 'objectrot', -180, 180).name('Rotation').onChange(_updatebackgroundpos);
        g2.add(guiData, 'flip').name('Flip').onChange(_updatebackgroundpos);

        var g3 = g2.addFolder('Light')
        g3.add(guiData, 'lightx', -1000, 1000).name('x').onChange(_updatelight);
        g3.add(guiData, 'lighty', -1000, 1000).name('y').onChange(_updatelight);
        g3.add(guiData, 'lightz', 500, 4000).name('Z').onChange(_updatelight);
        g3.add(guiData, 'lightf', 0, 10).name('focus').onChange(_updatelight);
        g3.addColor(guiData, 'spot').onChange(_updatelight);
        g3.addColor(guiData, 'ambient').onChange(_updatelight);;
        g3.add(guiData, 'lighti', 0, 1, 0.001).name('intensity').onChange(_updatelight);

        gui.add(guiData, 'resetview').name('Reset view').onChange(resetcam);
        //    gui.add(guiData, '_savejpg').name('save jpeg');
        gui.add(guiData, '_export3D').name('save as 3D');
        var g4 = gui.addFolder('StopMotion Recorder')
        recbtn = g4.add(guiData, 'Start');
        g4.add(guiData, 'Frame');
        g4.add(guiData, 'explode', 0, 100, 0.01).onChange(_explodedView);
        g4.add({
            fun: () => {
                _explode()
            }
        }, 'fun').name('Auto explode');
        g4.add(guiData, 'movecam').name('move camera').onChange(_animate);
        g4.add({
            fun1: () => {
                explodedview(3, 0, 0, 0);
            }
        }, 'fun1').name('Set camera position 1');
        g4.add({
            fun2: () => {
                explodedview(4, 0, 0, 0);
            }
        }, 'fun2').name('Set camera position 2');
        g4.add(guiData, 'playbackspeed', -100, 100, 1).onChange(_animate);

        init();
        //  mySvg = loadImage("beer.svg");
        stream = getcanvas().captureStream(30/*fps*/);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9"
            //mimeType: "video/webm; codecs=h264"
        });
        mediaRecorder.ondataavailable = function (e) {
            recordedChunks.push(e.data);
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
        updatescreen();
        _updateUvTransform();
        _updatecolor();
        _updatelight();
        _updatebackground();
        _updatebackgroundpos();

        resetcam();
    });
});

//========================================================================================================
//========================================================================================================
function loadImage() {
    var s1 = '/models/';
    var url = s1.concat(guiData.maskfilename);
    if (guiData.maskfilename.split('.')[1] == null) {
        url = s1.concat(guiData.maskfilename, '.svg')
    }
    loadSVG(url, guiData.maskfilename, function () {
        _updateUvTransform();
        _updatecolor();
        _updatebackgroundpos();
    });

}
//========================================================================================================

//=================================================================================================================
//=================================================================================================================



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


    // var loader = new SVGLoader();
    // var data = loader.parse(svgdata);
    //makem3dfromsvg(data);


}
//======================================================================================================
//======================================================================================================
function savetoFile(data, filename, type) {
    var link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link); // Firefox workaround, see #6594
    var blob = new Blob([data], { type: type });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

}
function saveasjpg() {
    var x = 0, y = 0;
    var heartShape = new THREE.Shape();
    heartShape.moveTo(x + 0.05, y + 0.05);
    heartShape.bezierCurveTo(x + 0.05, y + 0.05, x + 0.04, y, x, y);
    heartShape.bezierCurveTo(x - 0.06, y, x - 0.06, y + 0.07, x - 0.06, y + 0.07);
    heartShape.bezierCurveTo(x - 0.06, y + 0.11, x - 0.03, y + 0.154, x + 0.05, y + 0.19);
    heartShape.bezierCurveTo(x + 0.12, y + 0.154, x + 0.16, y + 0.11, x + 0.16, y + 0.07);
    heartShape.bezierCurveTo(x + 0.16, y + 0.07, x + 0.16, y, x + 0.10, y);
    heartShape.bezierCurveTo(x + 0.07, y, x + 0.05, y + 0.05, x + 0.05, y + 0.05);

    var geometry = new THREE.ExtrudeBufferGeometry(heartShape, {
        depth: 0.1, bevelEnabled: false,
        bevelThickness: 0.4,
        bevelSize: 0.4,
        steps: 2,
        BevelSegments: 2,
        curveSegments: 10
    });

    var material = new THREE.MeshLambertMaterial({ color: 0xa00A0A });
    var mesh = new THREE.Mesh(geometry, material);

    var scene = new THREE.Scene();
    scene.add(mesh);

    const options = {
        binary: true,
        forceIndices: true
    };

    var exporter = new GLTFExporter();

    exporter.parse(scene, function (data) {
        if (options.binary) {
            savetoFile(data, 'test.glb', 'model/gltf-binary');
        }
        else {
            savetoFile(JSON.stringify(data), 'test.gltf', 'text/plain');
        }
    },
        options);
}


function record() {
    if (mediaRecorder.state == 'recording') {
        // after stop data avilable event run one more time
        mediaRecorder.stop();
        recbtn.name('RECORD');
        return;
    }
    recordedChunks = [];
    mediaRecorder.start();
    console.log('start');
    recbtn.name('STOP');
}

function record_frame() {
    resetpositions();
    //    stream.getVideoTracks()[0].requestFrame();
}

function _explodedView() {
    explodedview(0, guiData.explode, 0);
}

function _explode() {
    explodedview(1, 0, 0);
}
function _animate() {
    explodedview(2, 0, guiData.playbackspeed, guiData.movecam);
}
