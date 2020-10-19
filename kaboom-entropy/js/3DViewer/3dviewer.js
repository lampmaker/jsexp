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
var SVGdata, SVGgeometry, SVGmesh, material, texture;
//=======================================================================================================
//=======================================================================================================


export function init() {
    // init render ----------------------------------------------------------------------------------------------------
    canvasQ = $('#myCanvas');
    canvas = canvasQ.get(0);
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height()

    Renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, precision: 'highp' });
    // Renderer.toneMapping = THREE.LinearToneMapping;
    // Renderer.toneMapingExposure = 1;
    //Renderer.toneMappingWhitePoint = .9;
    Renderer.shadowMap.enabled = true;
    Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Renderer.shadowMapSoft = true;
    Scene = new THREE.Scene();
    Scene.background = new THREE.Color(0xffffff);

    //container.appendChild(renderer.domElement);   -- what i this? 
    // init camera ----------------------------------------------------------------------------------------------------
    Camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
    Camera.position.set(0, 0, 700);
    controls = new OrbitControls(Camera, Renderer.domElement);
    controls.screenSpacePanning = true;
    resize(canvasWidth, canvasHeight);    //set everything right

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
    tablemesh.position.z = -2;
    tablemesh.receiveShadow = true;
    tablemesh.castShadow = false;
    Scene.add(tablemesh);
    // init lights  ----------------------------------------------------------------------------------------------------
    var L1 = 0.5;
    //L1 = 0xFFFFFF;
    light0 = new THREE.AmbientLight(0xFFFFFF, L1);
    Scene.add(light0);

    light1 = new THREE.SpotLight(0xFFFFFF, 1);
    //const light1 = new THREE.DirectionalLight(0xFFFFFF, 1);

    light1.position.set(-500, 1000, 2000);
    light1.castShadow = true;
    light1.shadowCameraVisible = true;
    light1.shadow.mapSize.width = 16384;  // default
    light1.shadow.mapSize.height = light1.shadow.mapSize.width; // default
    light1.shadow.radius = 10;

    light1.shadow.camera.near = 0.5;       // default
    light1.shadow.camera.far = 3200;      // default
    light1.shadow.camera.fov = 80;
    light1.shadowDarkness = 11;
    light1.target.position.set(0, 0, 0);
    Scene.add(light1);


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
    var materialtop = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: 0xCCAAAA });
    var materialside = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: sidecolor });
    material = [materialtop, materialside, materialside];

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
function getsizeandpos(geo){
    geo.computeBoundingBox();
    var dimX = (geo.boundingBox.max.x - geo.boundingBox.min.x);
    var dimY = (geo.boundingBox.max.y - geo.boundingBox.min.y);
    var dimZ = (geo.boundingBox.max.z - geo.boundingBox.min.z);
    var centerX = (geo.boundingBox.max.x + geo.boundingBox.min.x) / 2;
    var centerY = (geo.boundingBox.max.y + geo.boundingBox.min.y) / 2;
    var centerZ = (geo.boundingBox.max.z + geo.boundingBox.min.z) / 2;
    var res=new Array();
    res= [dimX,dimY,dimZ,centerX,centerY,centerZ]    ;
    console.log('size:',res);
    return res;
}
//=======================================================================================================
export function loadSVG(url) {
    var loader = new SVGLoader();
    var old = Scene.getObjectByName('SVG');
    Scene.remove(old);
    console.log('OPENING SVG');
    loader.load(url, function (data) {
        var tpaths = data.paths;
        SVGdata = tpaths;
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
            //steps: 2,
            //BevelSegments: 2,
            //curveSegments: 12
        });

               
        var dims =getsizeandpos(SVGgeometry);
        SVGgeometry.translate(-dims[3], -dims[4], dims[5] + 5);
        var l = 590 / Math.max(dims[0], dims[1]);        
        SVGgeometry.scale(l, l, 1);
        dims=getsizeandpos(SVGgeometry);
        SVGmesh = new THREE.Mesh(SVGgeometry, material);
        SVGmesh.scale.y *= - 1;
        SVGmesh.castShadow = true;
        SVGmesh.receiveShadow = true
                SVGmesh.name = 'SVG';
        SVGmesh.castShadow = true;
        SVGmesh.receiveShadow = true;
        //}
        console.log('shapes loaded');
        //-- repositioning 
        
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

    // convert to ShapePath ---------------------------------------------------------------------------
    var path = new THREE.ShapePath();
    for (var i = 0; i < SVGdata.length; i++) {
        for (var j = 0; j < SVGdata[i].subPaths.length; j++) {
            path.subPaths.push(SVGdata[i].subPaths[j]);
        }
    }
    // convert to Shapes ---------------------------------------------------------------------------
    console.log('load shapes');
    var shape = path.toShapes(true, false)[0];
    console.log(shape);
    var geometry = new THREE.ExtrudeBufferGeometry(shape, {
        depth: 0.04, //= 4cm !!
        bevelEnabled: false,
        steps: 1,        
        curveSegments: 2
    });
  
    var dims =getsizeandpos(geometry);
    geometry.translate(-dims[3], -dims[4], dims[5] + 5);
    var l = 0.590 / Math.max(dims[0], dims[1]);        
    geometry.scale(l, l, 1);
    dims=getsizeandpos(geometry);
    var mat = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: 0xffAAAA });
    //var mat = new THREE.MeshBasicMaterial({  color: 0xffAAAA });

    var mesh = new THREE.Mesh(geometry,mat);//, mat);
    //-- repositioning 
    mesh.scale.y *= - 1;
    mesh.castShadow = true;
    
    Exportscene.add(mesh);

    const options = {
        binary: _binary,
        forcePowerOfTwoTextures: true,
        forceIndices: true
    };
    var exporter = new GLTFExporter();
    exporter.parse(Exportscene, function (data) {
        console.log(data);
        if (_binary) {
            savetoFile(data, 'testje.glb', 'model/gltf-binary');
        }
        else {
            savetoFile(JSON.stringify(data), 'testje.gltf', 'text/plain');
        }
    },
        options);
}

