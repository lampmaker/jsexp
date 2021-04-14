import * as THREE from '/js/three/three.module.new.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import { DragControls } from '/js/3DViewer/DragControls.js';
import { SVGLoader } from '/js/three/SVGLoader.new.js';
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
var Camera, orbitControls, dragControls, light0, light1;
var Objects = [];
var SVGdata, SVGgeometry, SVGmesh, SVGgroup, material, texture, tablematerial;
var filename;
// geometry through gui
var csegments, bevel, flat, csimplify, cscale, cflip;


var animation;

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
        partindex: 0,
        partratio: 0,
        end_campos: new THREE.Vector3(0, 0, 700),
        end_camrot: new THREE.Vector3(0, 0, 0),
        start_campos: new THREE.Vector3(0, 0, 700),
        start_camrot: new THREE.Vector3(0, 0, 0),
        movecam: true
    }

    document.addEventListener('keydown', (e) => {
        if (e.keyCode === 17) {
            dragControls.activate();
        }
    })

    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 17) {
            dragControls.deactivate();
        }
    })

    dragControls.addEventListener('dragstart', function (event) {
        // event.object.material[0].emissive.set(0xaaaaaa);
        /*
        if (event.object.userData.set == null) {
            event.object.userData = { position: event.object.position, rotation: event.object.rotation, set: true }
            console.log('origin position: ', event.object.position.x, event.object.position.y, event.object.position.z);
        }
        */
    });


    dragControls.addEventListener('dragend', function (event) {
        var p2 = new THREE.Vector3;
        p2.copy(event.object.position);
        event.object.userData = { shiftedposition: p2, set: true }
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
    var table = new THREE.PlaneGeometry(1024, 1024);
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

export function getcanvas() {
    return canvasQ.get(0);
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
export function updateGeometry(c, b, f, s, sc) {
    csegments = c;
    bevel = b;
    flat = f;
    csimplify = s;
    cscale = sc;
}


export function updatebackgroundpos(x, y, r, f) {
    var S = Scene.getObjectByName('SVG');
    if (S != undefined) {
        S.position.set(x, y, S.position.z);
        S.rotation.z = r * 3.141592 / 180;
        if (f != cflip) {
            cflip = f;
            S.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
        }
    }
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
//=======================================================================================================
export function loadSVG(url, fn, whenready) {
    filename = fn;
    var loader = new SVGLoader();
    var old = Scene.getObjectByName('SVG');
    Scene.remove(old);
    console.log('OPENING SVG');
    loader.load(url, function (data) {
        SVGdata = data.paths;
        var path = new THREE.ShapePath();
        for (var i = 0; i < SVGdata.length; i++) {
            for (var j = 0; j < SVGdata[i].subPaths.length; j++) {
                if (csimplify > 0) {
                    var points = SVGdata[i].subPaths[j].getPoints();
                    var spoints = simplify(points, points, csimplify)
                    if (j == 0) {
                        console.log(points);
                        console.log(spoints);
                    }
                    var sb = new THREE.Path(spoints);
                    path.subPaths.push(sb);
                }
                else {
                    path.subPaths.push(SVGdata[i].subPaths[j]);
                }
            }
        }
        console.log('path', path);
        var shapes = path.toShapes(true, false);
        console.log('shape', shapes);
        SVGgroup = new THREE.Group();
        var SVGsubgroup = new THREE.Group();
        SVGgroup.name = 'SVG';
        //for (var j = 0; j < shapes.length; j++) {

        for (var i = 0; i < shapes.length; i++) {
            SVGgeometry = new THREE.ExtrudeGeometry(shapes[i], {
                depth: 4,
                bevelEnabled: bevel,
                bevelThickness: 0.4,
                bevelSize: 0.2,
                steps: 2,
                BevelSegments: 2,
                curveSegments: csegments
            });
            var h = 1; var w = 1;
            /*
                        var uvs = SVGgeometry.faceVertexUvs[0];
                        uvs[0][0].set(0, h);
                        uvs[0][1].set(0, 0);
                        uvs[0][2].set(w, h);
                        uvs[1][0].set(0, 0);
                        uvs[1][1].set(w, 0);
                        uvs[1][2].set(w, h);
            */
            console.log('geometry', SVGgeometry);
            SVGmesh = new THREE.Mesh(SVGgeometry, material);
            SVGmesh.scale.y *= -1;
            SVGmesh.castShadow = true;
            SVGmesh.receiveShadow = true
            SVGmesh.castShadow = true;
            SVGmesh.receiveShadow = true;
            //}
            console.log('shapes loaded');
            //-- repositioning 
            SVGsubgroup.add(SVGmesh);
        }
        var dims = getsizeandpos(SVGsubgroup);
        if (cscale != 0) {
            var l = cscale / Math.max(dims[0], dims[1]);
            SVGsubgroup.scale.set(l, l, 1);
        }
        if (flat) {
            SVGsubgroup.rotateX(-90 * Math.PI / 180);
        }
        dims = getsizeandpos(SVGsubgroup);
        SVGsubgroup.translateX(-dims[3]);
        SVGsubgroup.translateY(-dims[4]);
        SVGsubgroup.translateZ(-dims[5] + 1);
        SVGgroup.add(SVGsubgroup);
        Scene.add(SVGgroup);
        Objects.push(SVGsubgroup);







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


export function explodedview(ratio, func, h, f2) {
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
        animation.start_campos.copy(Camera.position);
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(Camera.quaternion);
        animation.start_camrot.copy(vector);
        console.log("camera start:", animation.start_campos, animation.start_camrot)
        console.log(orbitControls)
        console.log("Camera:", Camera)
    }
    if (func == 4) {
        animation.end_campos.copy(Camera.position);
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(Camera.quaternion);
        animation.end_camrot.copy(vector);
        console.log("camera end:", animation.end_campos, animation.end_camrot)

    }
    // ratio =0..100;  0..10: move down, 10..100: xy shift
    for (var i = 0; i < Objects[0].children.length; i++) {
        animatepart(i, ratio);
    }
    if (ratio > 90) animation.partindex = Objects[0].children.length - 1;
}


/*
// simple collision detection
function rt(a, b) {
    let d = [b];
    let e = a.position.clone();
    let f = a.geometry.vertices.length;
    let g = a.position;
    let h = a.matrix;
    let i = a.geometry.vertices;




    for (var vertexIndex = f - 1; vertexIndex >= 0; vertexIndex--) {
        let localVertex = i[vertexIndex].clone();
        let globalVertex = localVertex.applyMatrix4(h);
        let directionVector = globalVertex.sub(g);

        let ray = new THREE.Raycaster(e, directionVector.clone().normalize());
        let collisionResults = ray.intersectObjects(d);
        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
            return true;
        }
    }
    return false;
}

*/
function rt(a, b) {
    let d = [b];
    const positionAttribute = a.geometry.getAttribute('position');
    const localVertex = new THREE.Vector3();
    const globalVertex = new THREE.Vector3();
    for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
        localVertex.fromBufferAttribute(positionAttribute, vertexIndex);
        globalVertex.copy(localVertex).applyMatrix4(a.matrixWorld);
        var directionVector = globalVertex.sub(a.position);
        let ray = new THREE.Raycaster(a, directionVector.clone().normalize());
        let collisionResults = ray.intersectObjects(d);
        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
            return true;
        }
    }


}



function ft(a, b) {
    return rt(a, b) || rt(b, a) || (a.position.z == b.position.z && a.position.x == b.position.x && a.position.y == b.position.y)
}
// detects if object i colides with any other one.  
function touchany(i) {
    var part1 = Objects[0].children[i];
    for (var j = 0; j < Objects[0].children.length; j++) {
        if (i != j) {
            var part2 = Objects[0].children[j];
            /*
            v*r mindistance = part1.geometry.boundingSphere.radius + part2.geometry.boundingSphere.radius
            var p1 = new THREE.Vector3();
            var p2 = new THREE.Vector3();
            p1.addVectors(part1.geometry.boundingSphere.center, part1.position);
            p2.addVectors(part2.geometry.boundingSphere.center, part2.position);
            if (p1.distanceTo(p2) < mindistance) return true;
            */
            if (ft(part1, part2)) return true
        }
    }
    return false
}


export function Explode() {
    for (var i = 0; i < Objects[0].children.length; i++) {
        //for (var i = 0; i < 3; i++) {
        var angle = Math.random() * 360;
        var dx = Math.sin(angle) * 50;
        var dy = Math.cos(angle) * 50;
        var part = Objects[0].children[i];
        var x = dx, y = dy;
        var cnt = 1000;
        while (touchany(i) && (cnt-- > 0)) {

            part.position.set(x, y, 0);
            var p2 = new THREE.Vector3;
            p2.copy(part.position);
            part.userData = { shiftedposition: p2, set: true }

            x += dx;
            y += dy;
        }
    }
    animation.partindex = Objects[0].children.length - 1;
}


//============================================================================================\
// moves part i between zero position and position in userdata.  ratio = 0 (zero position) to 100  (userdata position)
// if ratiu< splitratio only z gets changed.   if ratio>splitratio, part moves in x,y
//
//============================================================================================
function animatepart(i, ratio) {
    if (i >= Objects[0].children.length) return;
    if (i < 0) return;
    var splitratio = 50;
    var distance = 0;
    var z_offset = 20;
    var z = z_offset;
    if (ratio > splitratio) {
        distance = (ratio - splitratio) / (100 - splitratio);  //(distanceratio=0.0 to 1.0)
        z = (1 - distance) * z_offset;
    }
    else {
        z = z_offset * ratio / splitratio;
    }
    var part = Objects[0].children[i]
    if (part.userData.set != null) part.position.set(distance * part.userData.shiftedposition.x, distance * part.userData.shiftedposition.y, z);
}


function animateparts() {
    if (animation.speed == 0) {
        return;
    }


    if (animation.movecam) {

        var totscale = (animation.partindex + animation.partratio / 100) / Objects[0].children.length;
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



    }

    if (animation.speed < 0) { //collapse
        animation.partratio += animation.speed / 10;
        if (animation.partratio <= 0) {
            animatepart(animation.partindex, 0);
            animation.partratio = 100  // for 
            animation.partindex--;
            if (animation.partindex < 0) animation.partindex = 0;
            //if (Objects[0].children[animation.partindex].userData.set = null) animation.partindex--;
            if (animation.partindex <= 0) {
                animation.partindex = 0;
                animatepart(animation.partindex, 0);
                animation.speed = 0; // ready                
            }
        }
        else {
            animatepart(animation.partindex, animation.partratio);
        }
    }
    else {
        animation.partratio += animation.speed / 10;
        if (animation.partratio >= 100) {
            animatepart(animation.partindex, 100);
            animation.partratio = 0;  // for
            animation.partindex++;
            if (animation.partindex > Objects[0].children.length) {
                animation.partindex = Objects[0].children.length - 1;
                animatepart(animation.partindex, 100);
                animation.speed = 0; // ready                
            }
        }
        else {
            animatepart(animation.partindex, animation.partratio);
        }
    }
}