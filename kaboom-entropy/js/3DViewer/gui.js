
import { init, resize, loadSVG, resetview, export3D } from './3dviewer.js';
import { GUI } from '/js/three/dat.gui.module.js'
import { GLTFExporter } from '/js/three/GLTFExporter.js'

var gui, guiData, x, y;
var loaded = false;

//=================================================================================================================
guiData = {
    cwidth: 1024,
    cheight: 1024,
    maskfile: loadImage,
    maskfilename: "olifant",
    resetview: resetcam,
    _savejpg: saveasjpg,
    _export3D: export3D

};
//=================================================================================================================
//=================================================================================================================
function updatescreen() {
    //  console.log('mupdate screen')
    resize(guiData.cwidth, guiData.cheight, false, guiData.scale)
    if (!loaded) return;
}
//=================================================================================================================
function resetcam() {
    resetview(0, 0, 700);
}
//=================================================================================================================

//=================================================================================================================
$(function () {
    $.getJSON('/js/3Dviewer/presets.json', function (json) {
        //  console.log(json);
        gui = new GUI({ width: 350, load: json, preset: 'Default' });
        gui.remember(guiData);
        gui.add(guiData, 'cwidth', 0, 4096).name('width').onFinishChange(updatescreen);
        gui.add(guiData, 'cheight', 0, 4096).name('height').onFinishChange(updatescreen);;
        gui.add(guiData, 'maskfilename').name('File name');
        gui.add(guiData, 'maskfile').name('load from SVG');
        gui.add(guiData, 'resetview').name('Reset view');
        gui.add(guiData, '_savejpg').name('save jpeg');
        gui.add(guiData, '_export3D').name('save as 3D');
    });
    init();

});

//========================================================================================================
//========================================================================================================
function loadImage() {
    var s1 = '/models/';
    var url = s1.concat(guiData.maskfilename);
    if (guiData.maskfilename.split('.')[1] == 'svg') loadSVG(url);
    if (guiData.maskfilename.split('.')[1] == null) {
        url = s1.concat(guiData.maskfilename, '.svg')
        loadSVG(url);
    }
}
//========================================================================================================

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