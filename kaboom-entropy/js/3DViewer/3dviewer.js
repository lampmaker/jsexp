import * as THREE from '/js/three/three.module.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import { SVGLoader } from '/js/three/SVGLoader.js';
import { GLTFExporter } from '/js/three/GLTFExporter.js'
import { SimplifyModifier } from '/js/three/SimplifyModifier.js';

var canvas;
var canvasQ;
var canvasWidth;
var canvasHeight;
var scale;
var mMouseX, mMouseY;
var mMouseDown = false;

// scene stuff
var Renderer;
var Scene;
var Camera, controls, light0, light1;
var SVGgeometry, SVGmesh, material, texture;
//=======================================================================================================
//=======================================================================================================


export function init() {
    // init render ----------------------------------------------------------------------------------------------------
    canvasQ = $('#myCanvas');
    canvas = canvasQ.get(0);
    Renderer = new THREE.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true, antialias: true, precision: 'highp' });
    Scene = new THREE.Scene();
    Renderer.shadowMap.enabled = true;
    Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Renderer.toneMapping = THREE.Uncharted2ToneMapping;
    Renderer.toneMapingExposure = 1;
    Renderer.toneMappingWhitePoint = .9;
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height()

    //container.appendChild(renderer.domElement);   -- what i this? 
    // init camera ----------------------------------------------------------------------------------------------------
    Camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 100, 10000);
    Camera.position.set(0, 0, 700);

    controls = new OrbitControls(Camera, Renderer.domElement);
    controls.screenSpacePanning = true;
    resize(canvasWidth, canvasHeight);    //set everything right
    // init lights  ----------------------------------------------------------------------------------------------------
    var L1 = 0x909090;
    light0 = new THREE.AmbientLight(L1);
    Scene.add(light0);

    light1 = new THREE.SpotLight(0xFFFFFF - L1);
    //const light1 = new THREE.DirectionalLight(0xFFFFFF, 1);

    light1.position.set(-500, 1000, 2000);
    light1.castShadow = true;
    light1.shadow.mapSize.width = 16384;  // default
    light1.shadow.mapSize.height = light1.shadow.mapSize.width; // default
    light1.shadow.radius = 10;
    light1.shadowDarkness = 11;
    light1.shadow.camera.near = 5;       // default
    light1.shadow.camera.far = 3000;      // default
    light1.shadow.camera.fov = 80;
    light1.target.position.set(0, 0, 0);
    Scene.add(light1);

    // init background  ----------------------------------------------------------------------------------------------------
    var tablematerial = new THREE.MeshLambertMaterial({
        color: 0xFFFFFF,
        //ide: THREE.DoubleSide,
        //map: ttexture,
        //	bump: tbump,
        depthWrite: false,
    });
    var table = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
    var tablemesh = new THREE.Mesh(table, tablematerial);
    tablemesh.position.z = -1;
    tablemesh.receiveShadow = true;
    tablemesh.castShadow = false;
    Scene.add(tablemesh);

    // init object   ----------------------------------------------------------------------------------------------------
    texture = new THREE.TextureLoader().load("img/plywood1.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.0025, 0.005);
    texture.center.x = 40;
    texture.center.y = 0;
    texture.mapping
    //texture.offset=(0,0);
    //var material= new THREE.MeshNormalMaterial();
    var sidecolor = 0x606060;
    var materialtop = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: 0xffAAAA });
    var basematerial = new THREE.MeshLambertMaterial({ color: 0xa00A0A });
    var materialside = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: sidecolor });
    material = [materialtop, materialside];

    // init others  ----------------------------------------------------------------------------------------------------
    //var helper = new THREE.GridHelper(1000, 10);
    //helper.rotation.x = Math.PI / 2;
    //scene.add(helper);
    animate();

}
//=======================================================================================================
//=======================================================================================================
export function resize(width, height) {
    canvasQ.width(width);
    canvasQ.height(height);
    // Get the real size of canvas.
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height();
    //renderer.setPixelRatio(window.devicePixelRatio);

    Renderer.setSize(canvasWidth, canvasHeight);
    Camera.aspect = canvasWidth / canvasHeight;
    Camera.updateProjectionMatrix();
}
//=======================================================================================================
//=======================================================================================================
export function updateUvTransform(ox, oy, rx, ry, rot) {
    texture.offset.set(ox, oy);
    texture.repeat.set(rx, ry);
    texture.rotation = rot; // rotation is around [ 0.5, 0.5 ]    
}
//=======================================================================================================
//=======================================================================================================






function savetoFile(data, filename, type) {
    var link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link); // Firefox workaround, see #6594
    var blob = new Blob([data], { type: type });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
//=======================================================================================================
//=======================================================================================================
export function export3D() {
    console.log('exporting')
    var _binary = true;
    var Exportscene = new THREE.Scene();

    SVGmesh.scale.x *= 0.01;
    SVGmesh.scale.y *= 0.01;
    SVGmesh.scale.z *= 0.01;
    //Exportscene.add(light0);

    Exportscene.add(SVGmesh);
    console.log("LOG: export3d");

    const options = {
        binary: _binary,
        forcePowerOfTwoTextures: false,
        forceIndices: true
    };
    var exporter = new GLTFExporter();
    exporter.parse(Exportscene, function (data) {
        console.log(data);
        if (_binary) {
            savetoFile(data, 'test.glb', 'model/gltf-binary');
        }
        else {
            savetoFile(JSON.stringify(data), 'test.gltf', 'text/plain');
        }
    },
        options);
}


//=======================================================================================================
//=======================================================================================================

export function resetview(cx, cy, cz) {
    controls.reset();
    Camera.position.set(cx, cy, cz);

    Camera.updateProjectionMatrix();
}
export function freezeview(t) {
    controls.enabled = !t
}
//=======================================================================================================
//=======================================================================================================
export function loadSVG(url) {
    var loader = new SVGLoader();
    var old = Scene.getObjectByName('SVG');
    Scene.remove(old);
    console.log('OPENING SVG');
    loader.load(url, function (data) {
        var tpaths = data.paths;
        console.log('opened', data);
        console.log('paths:', tpaths);
        var path = new THREE.ShapePath();
        for (var i = 0; i < tpaths.length; i++) {
            for (var j = 0; j < tpaths[i].subPaths.length; j++) {
                path.subPaths.push(tpaths[i].subPaths[j]);
            }
        }
        console.log('load shapes');
        var shapes = path.toShapes(true, false);

        //for (var j = 0; j < shapes.length; j++) {
        var shape = shapes[0];
        SVGgeometry = new THREE.ExtrudeBufferGeometry(shape, {
            depth: 4,
            bevelEnabled: true,
            bevelThickness: 0.4,
            bevelSize: 0.2,
            steps: 2,
            BevelSegments: 2,
            curveSegments: 12
        });
        SVGmesh = new THREE.Mesh(SVGgeometry, material);
        SVGmesh.name = 'SVG';
        SVGmesh.castShadow = true;
        SVGmesh.receiveShadow = true;
        //}
        console.log('shapes loaded');
        //-- repositioning 
        SVGmesh.scale.y *= - 1;
        SVGmesh.castShadow = true;
        var box = new THREE.BoxHelper(SVGmesh, 0xffff00);
        box.geometry.computeBoundingBox();
        var dimX = (box.geometry.boundingBox.max.x - box.geometry.boundingBox.min.x);
        var dimY = (box.geometry.boundingBox.max.y - box.geometry.boundingBox.min.y);
        var dimZ = (box.geometry.boundingBox.max.z - box.geometry.boundingBox.min.z);
        var l = Math.max(dimX, dimY);
        l = 590 / l;
        SVGmesh.scale.x *= l;
        SVGmesh.scale.y *= l;
        SVGmesh.scale.z *= 1;
        box.update();

        console.log('Breed: ', dimX * l, ' , Hoog: ', dimY * l);

        box.geometry.computeBoundingBox();
        var centerX = (box.geometry.boundingBox.max.x + box.geometry.boundingBox.min.x) / 2;
        var centerY = (box.geometry.boundingBox.max.y + box.geometry.boundingBox.min.y) / 2;
        var centerZ = (box.geometry.boundingBox.max.z + box.geometry.boundingBox.min.z) / 2;
        SVGmesh.position.x = -centerX;
        SVGmesh.position.y = -centerY;
        SVGmesh.position.z += 1;
        box.update();
        box.geometry.computeBoundingBox();
        Scene.add(SVGmesh);
    });
}

//=======================================================================================================
//=======================================================================================================
function animate() {
    requestAnimationFrame(animate);
    render();
}
//---------------------------------------------------------------------------------------------------------------------
function render() {
    Renderer.render(Scene, Camera);
}

//=======================================================================================================
//=======================================================================================================