import * as THREE from '/js/three/three.module.new.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import { DragControls } from '/js/3DViewer/DragControls.js';
import { SVGLoader } from '/js/three/SVGLoader.new.js';
import { GLTFExporter } from '/js/three/GLTFExporter.js'
//import { ThreeCSG } from '/js/3DViewer/CSG.js'


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
var Camera, orbitControls, dragControls, light0, light1;
var Objects = [];
var SVGdata, SVGgeometry, SVGmesh, SVGgroup, material, texture, tablematerial;

var filename;
// geometry through gui
var csegments, bevel, flat, csimplify, cscale, cflip;


var animation, raycaster;
var texture2


export function init() {
    // init render ----------------------------------------------------------------------------------------------------
    //hreeCSG();
    canvasQ = $('#myCanvas');
    canvas = canvasQ.get(0);
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height()
    raycaster = new THREE.Raycaster();
    Renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, precision: 'highp' });
    // Renderer.toneMapping = THREE.LinearToneMapping;
    // Renderer.toneMapingExposure = 1;
    //Renderer.toneMappingWhitePoint = .9;
    Renderer.shadowMap.enabled = true;
    // Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Renderer.shadowMapSoft = true;
    Scene = new THREE.Scene();
    Scene.background = new THREE.Color(0xffffff);

    //container.appendChild(renderer.domElement);   -- what i this? 
    // init camera ----------------------------------------------------------------------------------------------------
    Camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
    Camera.position.set(0, 0, 700);
    orbitControls = new OrbitControls(Camera, Renderer.domElement);
    orbitControls.screenSpacePanning = true;
    dragControls = new DragControls(Objects, Camera, Renderer.domElement);
    dragControls.deactivate();
    resize(canvasWidth, canvasHeight);    //set everything right

    animation = {
        speed: 0,
        ratio: 0,

        numparts: 0,
        start_camMatrix: new THREE.Matrix4(),
        end_camMatrix: new THREE.Matrix4(),

        end_campos: new THREE.Vector3(0, 0, 700),
        end_camrot: new THREE.Vector3(0, 0, 0),
        start_campos: new THREE.Vector3(0, 0, 700),
        start_camrot: new THREE.Vector3(0, 0, 0),
        movecam: true
    }

    document.addEventListener('keydown', (e) => {
        if (e.key == "Control") {
            dragControls.activate();
        }
    })

    document.addEventListener('keyup', (e) => {
        if (e.key == "Control") {
            dragControls.deactivate();
        }
    })

    dragControls.addEventListener('dragstart', function (event) {
        event.object.material = material_selected2;

        /*
        if (event.object.userData.set == null) {
            event.object.userData = { position: event.object.position, rotation: event.object.rotation, set: true }
            console.log('origin position: ', event.object.position.x, event.object.position.y, event.object.position.z);
        }
        */
    });
    /*
        dragControls.addEventListener('drag', function (event) {
            
        });
    */
    dragControls.addEventListener('dragend', function (event) {
        event.object.material = material;
        var p2 = new THREE.Vector3;
        p2.copy(event.object.position);
        if (event.object.userData.set == null) animation.numparts++;
        event.object.userData = {
            shiftedposition: p2, set: true
        }
    });





    // init background  ----------------------------------------------------------------------------------------------------

    var BGtexture = new THREE.TextureLoader().load("background/wall1.jpg");
    BGtexture.repeat.set(1, 1);
    //texture.center.x = 40;
    //texture.center.y = 0;

    tablematerial = new THREE.MeshLambertMaterial({
        // color: 0xFFFFFF,
        //ide: THREE.DoubleSide,
        // map: BGtexture,
        //	bump: tbump,
        depthWrite: false,
    });
    var table = new THREE.PlaneGeometry(1600, 1600);
    var tablemesh = new THREE.Mesh(table, tablematerial);
    tablemesh.name = "background";
    tablemesh.position.z = -2;
    tablemesh.receiveShadow = true;
    tablemesh.castShadow = false;
    Scene.add(tablemesh);
    // init lights  ----------------------------------------------------------------------------------------------------
    var L1 = 0.5;
    //L1 = 0xFFFFFF;
    light0 = new THREE.AmbientLight(0xFFFFFF, 1);
    Scene.add(light0);

    light1 = new THREE.SpotLight(0xFFFFFF, 1);
    //const light1 = new THREE.DirectionalLight(0xFFFFFF, 1);

    light1.position.set(-500, 1000, 2000);
    light1.castShadow = true;
    light1.shadowCameraVisible = true;
    light1.shadow.mapSize.width = 16384;  // default
    light1.shadow.mapSize.height = light1.shadow.mapSize.width; // default
    light1.shadow.radius = 2;

    light1.shadow.camera.near = 0.5;       // default
    light1.shadow.camera.far = 3200;      // default
    light1.shadow.camera.fov = 80;
    light1.shadowDarkness = 11;
    light1.target.position.set(0, 0, 0);
    Scene.add(light1);


    // init object   ----------------------------------------------------------------------------------------------------
    texture = new THREE.TextureLoader().load("img/birchplywood.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.0025, 0.005);
    texture.center.x = 40;
    texture.center.y = 0;

    //texture.mapping
    //texture.offset=(0,0);
    //var material= new THREE.MeshNormalMaterial();
    var sidecolor = 0x606060;

    var materialtop = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: 0xCCAAAA });
    var materialside = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, color: sidecolor });


    material = [materialtop, materialside, materialside];
    var material_selected = new THREE.MeshStandardMaterial
    material_selected[0] = [materialtop, materialside, materialside]
    material_selected.emissive.set(0xaaaaaa);
    var material_selected2 = new THREE.MeshStandardMaterial
    material_selected2[0] = [materialtop, materialside, materialside]
    material_selected.emissive.set(0xBBBBBB);

    texture2 = new newtarget(canvasWidth * 4, canvasHeight * 4);
    texture2.repeat.set(1 / canvasWidth * 4, 1 / canvasHeight * 4);
    texture2.repeat.set(0.00125, 0.00125);
    // init others  ----------------------------------------------------------------------------------------------------
    //var helper = new THREE.GridHelper(1000, 10);
    //helper.rotation.x = Math.PI / 2;
    //scene.add(helper);
    animate();

}

function newtarget(w, h) {
    var X = new THREE.WebGLRenderTarget(w, h,
        {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        })
    X.texture.wrapS = THREE.RepeatWrapping;
    X.texture.wrapT = THREE.RepeatWrapping;
    return X;
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

export function getcanvas() {
    return canvasQ.get(0);
}
//=======================================================================================================
//=======================================================================================================
export function updateUvTransform(ox, oy, rx, ry, rot) {
    texture.offset.set(ox, oy);
    texture.repeat.set(rx, ry);
    texture.rotation = rot; // rotation is around [ 0.5, 0.5 ]      
    texture2.repeat.set(-rx, -ry);
    texture2.offset.set(ox, oy);
}
//=======================================================================================================
//=======================================================================================================
export function updateGeometry(c, b, f, s, sc) {
    csegments = c;
    bevel = b;
    flat = f;
    csimplify = s;
    cscale = sc;
}


export function updatebackgroundpos(x, y, r, f, z) {
    var S = Scene.getObjectByName('SVG');
    if (S != undefined) {
        S.position.set(x, y, S.position.z);
        S.rotation.z = r * 3.141592 / 180;
        if (f != cflip) {
            cflip = f;
            S.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
        }
    }
    /*
    var S2 = Scene.getObjectByName('SVGline');
    if (S2 != undefined) {
        S2.position.set(x, y, z);
        if (f != cflip) {
            cflip = f;
            S2.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
        }
    }
    */
}

export function updatebackground(bgfile) {
    var fn = "background/" + bgfile;
    var S = Scene.getObjectByName('background');
    if (bgfile == 'white') {
        S.material.map = null
    }
    else {
        var BGtexture = new THREE.TextureLoader().load(fn);
        BGtexture.repeat.set(1, 1);
        S.material.map = BGtexture;
    }

    S.material.needsUpdate = true;
    S.needsUpdate = true;
    //tablematerial.map=BGtexture;            
}

export function updatelight(x, y, z, f, spc, bgc, int) {
    light1.position.set(x, y, z);
    light1.shadow.radius = f;
    light1.color = new THREE.Color(spc)
    light0.color = new THREE.Color(bgc)
    light0.intensity = int;
    light1.intensity = int;
}

//=======================================================================================================
//=======================================================================================================

export function resetview(cx, cy, cz) {
    orbitControls.reset();
    Camera.position.set(cx, cy, cz);

    Camera.updateProjectionMatrix();
}
export function freezeview(t) {
    orbitControls.enabled = !t
}
//=======================================================================================================
function getsizeandpos(geo) {
    var bbox = new THREE.Box3;
    bbox.setFromObject(geo);
    var dimX = (bbox.max.x - bbox.min.x);
    var dimY = (bbox.max.y - bbox.min.y);
    var dimZ = (bbox.max.z - bbox.min.z);
    var centerX = (bbox.max.x + bbox.min.x) / 2;
    var centerY = (bbox.max.y + bbox.min.y) / 2;
    var centerZ = (bbox.max.z + bbox.min.z) / 2;
    var res = new Array();
    res = [dimX, dimY, dimZ, centerX, centerY, centerZ];
    console.log('size:', res);
    return res;
}


function pathtogroup(p, t, b) {
    var shapes = p.toShapes(true, false);
    var S = new THREE.Group();
    for (var i = 0; i < shapes.length; i++) {
        SVGgeometry = new THREE.ExtrudeGeometry(shapes[i], {
            depth: t,
            bevelEnabled: b,
            bevelThickness: 0.4,
            bevelSize: 0.2,
            steps: 2,
            BevelSegments: 2,
            curveSegments: csegments
        });
        SVGmesh = new THREE.Mesh(SVGgeometry, material);
        SVGmesh.scale.y *= -1;
        SVGmesh.castShadow = true;
        SVGmesh.receiveShadow = true
        SVGmesh.castShadow = true;
        SVGmesh.receiveShadow = true;
        S.add(SVGmesh);
    }
    return S;
}
///https://github.com/oathihs/ThreeCSG
//=======================================================================================================
export function loadSVG(url, fn, whenready) {
    filename = fn;
    var loader = new SVGLoader();
    var old = Scene.getObjectByName('SVG');
    Scene.remove(old);
    Objects.pop();  // remove last item (if any)
    //if (Objects.length > 0) Objects[0] = null;
    console.log('OPENING SVG');
    loader.load(url, function (data) {
        SVGdata = data.paths;
        var path = new THREE.ShapePath();
        var path2 = new THREE.ShapePath();
        for (var i = 0; i < SVGdata.length; i++) {
            console.log(i, SVGdata[i].userData.style.stroke)
            for (var j = 0; j < SVGdata[i].subPaths.length; j++) {
                var sb = new THREE.Path();
                if (csimplify > 0) {
                    var points = SVGdata[i].subPaths[j].getPoints();
                    var spoints = simplify(points, points, csimplify)
                    sb = new THREE.Path(spoints);
                }
                else {
                    sb = SVGdata[i].subPaths[j];
                }
                if (SVGdata[i].userData.style.stroke == "rgb(0, 0, 0)") {
                    path.subPaths.push(sb);
                }
                else {
                    path2.subPaths.push(sb);
                }
            }
        }

        SVGgroup = new THREE.Group();
        SVGgroup.name = 'SVG';

        var SVGsubgroup = new THREE.Group()
        var thickness = 4.0
        SVGsubgroup = pathtogroup(path, thickness, bevel);

        var linegroup = new THREE.Group();
        linegroup.name = 'SVGline'
        for (var j = 0; j < path2.subPaths.length; j++) {
            var points2 = path2.subPaths[j].getPoints();
            var geometry = new THREE.BufferGeometry().setFromPoints(points2);
            var material = new THREE.LineBasicMaterial({ color: 0x0A0A0A });
            var li = new THREE.Line(geometry, material);
            linegroup.add(li);
        }

        var dims = getsizeandpos(SVGsubgroup);
        if (cscale != 0) {
            var l = cscale / Math.max(dims[0], dims[1]);
            SVGsubgroup.scale.set(l, l, 1);
            linegroup.scale.set(l, -l, 1);
        }
        if (flat) {
            SVGsubgroup.rotateX(-90 * Math.PI / 180);
            linegroup.rotateX(-90 * Math.PI / 180);
        }

        dims = getsizeandpos(SVGsubgroup);
        SVGsubgroup.translateX(-dims[3]);
        SVGsubgroup.translateY(-dims[4]);
        SVGsubgroup.translateZ(-dims[5] + 1);
        linegroup.translateX(-dims[3]);
        linegroup.translateY(-dims[4]);
        linegroup.translateZ(-dims[5] + 1 + thickness + 0.01);
        Objects.push(SVGsubgroup);
        SVGgroup.add(SVGsubgroup);
        SVGgroup.add(linegroup);
        Scene.add(SVGgroup);
        // Scene.add(linegroup)

        whenready();
    });
}

//=======================================================================================================
//=======================================================================================================
function animate() {
    animateparts()
    requestAnimationFrame(animate);
    render();
}
//---------------------------------------------------------------------------------------------------------------------
function render() {
    Renderer.render(Scene, Camera);
}
export function updatecolor(c) {
    material[0].color = new THREE.Color(c);;
    requestAnimationFrame(animate);
    render();
}
//=======================================================================================================
//=======================================================================================================
export function rendertotexture() {
    Renderer.setRenderTarget(texture2);
    Renderer.render(Scene, Camera);
    Renderer.setRenderTarget(null);
    texture2.flipY = false;
    texture2.repeat.set(1 / canvasWidth, -1 / canvasHeight);
    material[0].map = texture2;


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
//=======================================================================================================
//=======================================================================================================
export function export3D() {
    console.log('exporting')
    var _binary = true;
    var Exportscene = new THREE.Scene();


    /*
    
        var sidecolor = 0x101010;
        var materialtop = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture });
        var materialside = new THREE.MeshStandardMaterial({  color: sidecolor });
        var mat = [materialtop, materialside, materialtop];
    
      
        SVGgroup.traverse(function(element){
                element.material=mat;
        })
    */

    var s = 1 / 1000;
    SVGgroup.scale.set(SVGgroup.scale.x * s, SVGgroup.scale.y * s, SVGgroup.scale.z * s);

    /*
        var dims = getsizeandpos(SVGgroup);
        SVGgroup.translateX(-dims[3]);
        SVGgroup.translateY(-dims[4]);
        SVGgroup.translateZ(-dims[5]+4);
    
    
    */


    /*
    
    https://github.com/google/model-viewer/pull/1714
    m taking the simple approach for now, outlined helpfully in this comment: #687 (comment), where we now have an attribute ar-placement which can be either "wall" or the default "floor".
     This also configures SceneViewer to use vertical placement. QuickLook is not configurable on the intent side as far as I'm aware.
    
    */


    Exportscene.add(SVGgroup);
    ////  Exportscene.add(light1);
    //  Exportscene.add(light0);
    const options = {
        binary: _binary,
        forceIndices: true,
        animations: false,
        onlyVisible: false,
        embedImages: true,
        truncateDrawRange: false,
        trs: false,
        forcePowerOfTwoTextures: true,
        wallplacement: false
    };

    // Exportscene.setAttribute('ar-placement', 'wall');

    var exporter = new GLTFExporter();
    exporter.parse(Exportscene, function (data) {
        console.log(data);
        if (_binary) {
            savetoFile(data, filename + '.glb', 'model/gltf-binary');
        }
        else {
            savetoFile(JSON.stringify(data), filename + '.gltf', 'text/plain');
        }
    },
        options);
}



//https://observablehq.com/@nidu/curve-simplification-with-three-js

function v2dto3d(point) {
    return new THREE.Vector3(point.x, point.y, 0);
}



function simplify(curve, points, threshold) {

    if (curve.length <= 2) return curve;

    if (curve.length != points.length) {
        throw `curve.length=${curve.length} not equals to points.length=${points.length}`;
    }
    function simplifySegment(iLeft, iRight) {
        if (iRight - iLeft <= 1) return;
        const ray = new THREE.Ray(
            v2dto3d(points[iLeft]),
            v2dto3d(points[iRight]).clone().sub(v2dto3d(points[iLeft])).normalize()
        );

        let maxDistSq = 0;
        let maxIndex = iLeft;
        for (let i = iLeft + 1; i < iRight; i++) {
            const distSq = ray.distanceSqToPoint(v2dto3d(points[i]));
            if (distSq > thresholdSq && distSq > maxDistSq) {
                maxDistSq = distSq;
                maxIndex = i;
            }
        }

        if (maxIndex != iLeft) {
            simplifySegment(iLeft, maxIndex);
            result.push(curve[maxIndex]);
            simplifySegment(maxIndex, iRight);
        }
    }
    const thresholdSq = threshold * threshold;
    const result = [curve[0]];
    simplifySegment(0, curve.length - 1);
    result.push(curve[curve.length - 1]);
    return result;
}
//=======================================================================================================================================
//=======================================================================================================================================
//=======================================================================================================================================
//=======================================================================================================================================
//=======================================================================================================================================
//=======================================================================================================================================

//============================================================================================\
// moves part i between zero position and position in userdata.  ratio = 0 (zero position) to 1  (userdata position)
// if ratiu< splitratio only z gets changed.   if ratio>splitratio, part moves in x,y
//
//============================================================================================
function animatepart(i, ratio) {
    if ((i >= Objects[0].children.length) || (i < 0)) return;
    var part = Objects[0].children[i];
    if (part.userData.set == null) return;
    var splitratio = 0.50;
    var distance = 0;
    var z_offset = 20;
    var z = z_offset;
    if (ratio > splitratio) {
        distance = (ratio - splitratio) / (1 - splitratio);  //(distanceratio=0.0 to 1.0)
        z = (1 - distance) * z_offset;
    }
    else {
        z = z_offset * ratio / splitratio;
    }
    var part = Objects[0].children[i]
    part.position.set(distance * part.userData.shiftedposition.x, distance * part.userData.shiftedposition.y, z);
}


//============================================================================================
/// sets partindex, ratio for global animation
// p=0: everything collapsed; p=1.0: everytihing exploded
//============================================================================================
function animate_setpositions(p) {
    if (p == 1) p = 0.9999999999;
    var partindex = Math.trunc(p * animation.numparts);
    var ratio = (p * animation.numparts - partindex);  // ratio =0.0 to 1.0 for each part
    var pi = 0;
    for (var i = 0; i < Objects[0].children.length; i++) {
        if (Objects[0].children[i].userData.set != null) {
            if (pi < partindex) animatepart(i, 1);
            else if (pi > partindex) animatepart(i, 0);
            else animatepart(i, ratio)
            pi++;
        }
    }
}












//============================================================================================\
// main user control functions
//============================================================================================\
export function explodedview(func, ratio, h, f2) {
    if (func == 0) {
        animate_setpositions(ratio / 100);
        return;
        // ratio =0..100;  0..10: move down, 10..100: xy shift
        for (var i = 0; i < Objects[0].children.length; i++) {
            animatepart(i, ratio / 100);
        }
        if (ratio > 90) animation.partindex = Objects[0].children.length - 1;
    }
    if (func == 1) {
        Explode();
        return;
    }
    if (func == 2) {
        animation.speed = h;
        animation.movecam = f2;
        orbitControls.enabled = !f2;
        return;
    }
    if (func == 3) {
        console.log(orbitControls)
        animation.start_camMatrix.copy(Camera.matrix)
        animation.start_campos.copy(Camera.position);
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(Camera.quaternion);
        animation.start_camrot.copy(vector);
        console.log("camera start:", animation.start_campos, animation.start_camrot)
        console.log(orbitControls)
        console.log("Camera:", Camera)
        return;
    }
    if (func == 4) {
        animation.end_camMatrix.copy(Camera.matrix)
        animation.end_campos.copy(Camera.position);
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(Camera.quaternion);
        animation.end_camrot.copy(vector);
        console.log("camera end:", animation.end_campos, animation.end_camrot)
        return;

    }

}


function rndfromseed(a, m) {
    var r = 0;
    for (var i = 0; i < a.length; i++) {
        r = (r + a.charCodeAt(i)) % m;
    }
    return r;
}

//=======================================================================================================
//=======================================================================================================
function touchpart(part1) {
    for (var j = 0; j < Objects[0].children.length; j++) {
        var part2 = Objects[0].children[j];
        if (part1.uuid != part2.uuid) {
            for (var i = 0; i < part1.geometry.parameters.shapes.curves.length; i += 10) {
                var p1 = new THREE.Vector2(part1.position.x, -part1.position.y);
                p1.add(part1.geometry.parameters.shapes.curves[i].v1);
                for (var k = 0; k < part2.geometry.parameters.shapes.curves.length; k += 10) {
                    var p2 = new THREE.Vector2(part2.position.x, -part2.position.y);
                    p2.add(part2.geometry.parameters.shapes.curves[k].v1);
                    if (p1.distanceTo(p2) < 15) return true;
                }
            }
        }
    }
    return false;
}




//============================================================================================\
// explodes the part. 
//============================================================================================\

export function Explode() { // explodes puzzle
    var nullfound = false;
    for (var i = 0; i < Objects[0].children.length; i++) {
        if (Objects[0].children[i].userData.set == null) nullfound = true;
    }
    if (!nullfound) {  // explode all, all parts were set.
        for (var i = 0; i < Objects[0].children.length; i++) {
            Objects[0].children[i].userData.set = null;
            Objects[0].children[i].position.set(0, 0, 0);
            animation.numparts = 0;
        }
    }

    var randdir = Math.random() * 1000;
    for (var i = 0; i < Objects[0].children.length; i++) {
        var part = Objects[0].children[i];
        var angle = rndfromseed(part.uuid, 360) + randdir;
        var dx = 10 * Math.sin(angle);
        var dy = 10 * Math.cos(angle);
        while (part.userData.set == null) {
            part.position.set(part.position.x + dx, part.position.y + dy, 0);
            if (!touchpart(part)) {
                var p2 = new THREE.Vector3;
                p2.copy(part.position);
                part.userData = { shiftedposition: p2, set: true }
                animation.numparts++;
                animation.partindex = Objects[0].children.length - 1;
            }
        }
    }
    animation.ratio = 1;
}




function animateparts() {
    if (animation.speed == 0) {
        return;
    }
    if (animation.movecam) {
        var totscale = animation.ratio;

        var startP = new THREE.Vector3();
        var startQ = new THREE.Quaternion();
        var startS = new THREE.Vector3();

        animation.start_camMatrix.decompose(startP, startQ, startS);

        var endP = new THREE.Vector3();
        var endQ = new THREE.Quaternion();
        var endS = new THREE.Vector3();;
        animation.end_camMatrix.decompose(endP, endQ, endS);

        var mP = new THREE.Vector3();
        var mQ = new THREE.Quaternion();
        var mS = new THREE.Vector3();
        mP.lerpVectors(startP, endP, totscale);
        mQ.slerpQuaternions(startQ, endQ, totscale);
        mS.lerpVectors(startS, endS, totscale);

        //        var m = new THREE.Matrix4();
        //       m.compose(mP, mQ, mS);

        //Camera.applyMatrix4(m);
        Camera.position.copy(mP);
        Camera.setRotationFromQuaternion(mQ);
        Camera.scale.copy(mS);

        /*
                var cp = new THREE.Vector3();
                cp.copy(animation.start_campos);
                cp.addScaledVector(animation.end_campos, totscale);
                cp.addScaledVector(animation.start_campos, -totscale);
                //console.log("totscale, cam position:", totscale, cp);
                var cr = new THREE.Vector3();
                cr.copy(animation.start_camrot);
                cr.addScaledVector(animation.end_camrot, totscale);
                cr.addScaledVector(animation.start_camrot, -totscale);
                //cr.copy(Camera.position);
                //Camera.position.set(cr);
                //  Camera.rotation.set(cr);
                console.log("camera:", totscale, cp, cr)
                //orbitControls.update();
                Camera.position.copy(cp); // Set position like this
                Camera.lookAt(cr); // Set position like this
                //Camera.lookAt(new THREE.Vector3(0, 0, 0)); // Set look at coordinate like this
                console.log(Camera.matrix, m);
                */
    }

    if (animation.speed != 0) {
        animation.ratio += animation.speed * Math.abs(animation.speed) / 5000000;
        if (animation.ratio < 0) {
            animation.ratio = 0;
            animation.speed = 0;
        }
        if (animation.ratio >= 1) {
            animation.ratio = 1;
            animation.speed = 0;
        }
        animate_setpositions(animation.ratio)
    }
}