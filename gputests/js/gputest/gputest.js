
// Canvas.
var canvas;
var canvasQ;
var canvasWidth;
var canvasHeight;
var scale;

// scene stuff
var mRenderer;
var mScene;
var mCamera;
var mCamera0;
var mLastTime = 0;

// webgl 
var mUniforms;
var mRDTexture, mTempTexture; 
var mGSMaterial;
var mScreenQuad;

//
var shader_stdf, shader_stdv; // shaders
var shaderloadingmanager = new THREE.LoadingManager();
var loader = new THREE.FileLoader(shaderloadingmanager);
var offscreenCanvas;
var shaderdata;

shaderloadingmanager.onLoad = function () {
    init();
};

export function getuniforms() {
    return mUniforms;
}

export function setUniforms(M) {
    mUniforms = M;
}

export function loadshaders() {
    canvasQ = $('#myCanvas');
    canvas = canvasQ.get(0);
    mUniforms = {
        screenWidth: { type: "f", value: undefined },
        screenHeight: { type: "f", value: undefined },
        tSource: { type: "t", value: undefined },
        delta: { type: "f", value: 1.0 },
        feed: { type: "f", value: .1 },
        kill: { type: "f", value: .055 },
        df: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0.1) },
        dk: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0.1) },        
        toggle: { type: "i", value: 0 },

    };    
    loader.load("js/shaders/standardfragment.vert", function (data) { shader_stdf = data;  });
    loader.load("js/shaders/standardvertex.vert", function (data) { shader_stdv = data; });    
};

export function gettexture() {
    return mRDTexture;
}

//==================================================================================================================================
function init() {
    //canvas.onmousedown = onMouseDown;
    //canvas.onmouseup = onMouseUp;
    //canvas.onmousemove = onMouseMove;
    offscreenCanvas = document.createElement("canvas");
    mRenderer = new THREE.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true });
    mScene = new THREE.Scene();
    mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    mCamera.position.z = 100;
    mCamera0 = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    mCamera.position.z = 100;
    mScene.add(mCamera);
    mScene.add(mCamera0);
    var light = new THREE.AmbientLight(0x404040); // soft white light
    mScene.add(light);
    mScene.background = new THREE.Color(0x000000FF);

    mGSMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_stdf,
    });

    var plane = new THREE.PlaneGeometry(1.0, 1.0);
    mScreenQuad = new THREE.Mesh(plane, mGSMaterial);
    mScene.add(mScreenQuad);
    resize(canvas.clientWidth, canvas.clientHeight, true, 1, 1);
    render(0);
    mLastTime = new Date().getTime();
    requestAnimationFrame(render);
}

function newtarget(w, h) {
    var X = new THREE.WebGLRenderTarget(w / 2, h / 2,
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

//==================================================================================================================================
export function resize(width, height, force, _scale) {
    // Set the new shape of canvas.
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height();
    if (!force && (canvasWidth == width) && (canvasHeight == height) && (scale == _scale)) {
        console.log('nothign to do')
        return;
    }
    if (width == 0) width = canvasWidth;
    if (height == 0) width = canvasHeight;
    scale = _scale;
    canvasQ.width(width);
    canvasQ.height(height);
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height();
    mRenderer.setSize(canvasWidth, canvasHeight);
    mRDTexture = new newtarget(canvasWidth * scale*2, canvasHeight * scale*2);
    mTempTexture = new newtarget(canvasWidth * scale*2, canvasHeight * scale*2)
    mUniforms.screenWidth.value = canvasWidth * scale ;
    mUniforms.screenHeight.value = canvasHeight * scale ;
}
//==================================================================================================================================
//==================================================================================================================================
function render_to_texture(material, source, target) {   // 
    mScreenQuad.material = material;
    mUniforms.tSource.value = source.texture;
    mRenderer.setRenderTarget(target);
    mRenderer.render(mScene, mCamera0);
}
//==================================================================================================================================
function renderSystem() {
    mUniforms.toggle.value = 0;
    render_to_texture(mGSMaterial, mRDTexture, mTempTexture);
    mUniforms.toggle.value = 1;
    render_to_texture(mGSMaterial, mTempTexture, mRDTexture);
}
//==================================================================================================================================
function renderScreen(sm) {
    mRenderer.setRenderTarget(null);
    mRenderer.render(mScene, mCamera);
}

//==================================================================================================================================
//==================================================================================================================================
//  MAIN RENDERING 
//==================================================================================================================================
var render = function (time) {
    var dt = (time - mLastTime) / 20.0;
    if (dt > 0.8 || dt <= 0)
        dt = 0.8;
    mLastTime = time;
    mUniforms.delta.value = dt;
    mRenderer.clear();
    for (var i = 0; i < 4; ++i) {         // render the system 4 times before displaying to screen
        renderSystem();
    }
    renderScreen();     // render to canvas
    requestAnimationFrame(render);
    shaderdata=getrawshaderdata(); // get 2d image data

}
//==================================================================================================================================



//==================================================================================================================================
export function cnvs() {
    return canvas;
}

function getrawshaderdata() {
    var canvasx = cnvs();   
    offscreenCanvas.width = canvasx.width;
    offscreenCanvas.height = canvasx.height;
    var ctx = offscreenCanvas.getContext("2d");
    ctx.drawImage(canvasx, 0, 0);
    return ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
}