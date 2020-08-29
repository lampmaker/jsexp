

// Canvas.
var canvas;
var canvasQ;
var canvasWidth;
var canvasHeight;
var mMouseX, mMouseY;
var mMouseDown = false;

// scene stuff
var mRenderer;
var mScene;
var mCamera;

// webgl 
var mUniforms;
var mColors; //for gradient
//var mTexture1, mTexture2, mBrushtexture1, mBrushtexture2, mThinningTexture1, mThinningTexture2;
var mRDTexture, mBrushtexture, mThinningTexture, mTempTexture;
var mRD0Texture, mTemp0Texture, mEmtpytexture;
var mGSMaterial, mScreenMaterial, mBrushMaterial, mThinningMaterial, mAverageMaterial;
var mScreenQuad;

//
var mColorsNeedUpdate = true;
var mLastTime = 0;
var mClearMode = 2; /* First click will make it 3, which is the better simplex noise */
var mPaintMode = 0; /* First click will make it 1, which is to paint blue */
var speedscale = 1;
var scale0 = 1.0;

var mMinusOnes = new THREE.Vector2(-1, -1);
var thinning = 0;

var shader_scrf, shader_stdf, shader_stdv, shader_brush, shader_stdf_original, shader_thinning, shader_average;

var shaderloadingmanager = new THREE.LoadingManager();
var loader = new THREE.FileLoader(shaderloadingmanager);

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
        tMask: { type: "t", value: undefined },
        delta: { type: "f", value: 1.0 },
        feed: { type: "f", value: .1 },
        kill: { type: "f", value: .055 },
        maskfeed: { type: "f", value: .1 },
        maskkill: { type: "f", value: .055 },
        l0feed: { type: "f", value: .1 },
        l0kill: { type: "f", value: .055 },
        df: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0.1) },
        dk: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0.1) },
        brmode: { type: "f", value: 0.0 },
        mode: { type: "i", value: 0 },
        brush: { type: "v2", value: new THREE.Vector2(-10, -10) },
        editmode: { type: "i", value: 0 },
        maskmode: { type: "i", value: 0 },
        masksize: { type: "f", value: 100.0 },
        color1: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0.1) },
        color2: { type: "v4", value: new THREE.Vector4(1, 1, 1, 0.2) },
        color3: { type: "v4", value: new THREE.Vector4(0.5, 0.5, 0.5, 0.24) },
        toggle: { type: "i", value: 0 }
    };
    mColors = [mUniforms.color1, mUniforms.color2, mUniforms.color3];
    loader.load("js/shaders/screenfragment.vert", function (data) { shader_scrf = data; });
    loader.load("js/shaders/standardfragment.vert", function (data) { shader_stdf = data; shader_stdf_original = data; });
    loader.load("js/shaders/standardvertex.vert", function (data) { shader_stdv = data; });
    loader.load("js/shaders/brushfragment.vert", function (data) { shader_brush = data; });
    loader.load("js/shaders/thinningfragment.vert", function (data) { shader_thinning = data; });
    loader.load("js/shaders/averagefragment.vert", function (data) { shader_average = data; });
};


//==================================================================================================================================
function init() {
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmousemove = onMouseMove;
    mRenderer = new THREE.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true });
    mScene = new THREE.Scene();
    mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    mCamera.position.z = 100;
    mScene.add(mCamera);


    mGSMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_stdf,
    });
    mScreenMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_scrf,
    });
    mBrushMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_brush,
    });

    mThinningMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_thinning,
    });

    mAverageMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_average,
    });

    var plane = new THREE.PlaneGeometry(1.0, 1.0);
    mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
    mScene.add(mScreenQuad);

    mColorsNeedUpdate = true;
    resize(canvas.clientWidth, canvas.clientHeight, true, 1, 1);

    render(0);
    mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
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
export function resize(width, height, force, mscale0, scale) {
    // Set the new shape of canvas.
    scale0 = mscale0;
    canvasWidth = canvasQ.width();

    canvasHeight = canvasQ.height();
    if (!force && (canvasWidth == width) && (canvasHeight == height) && (scale == 1) && (scale0 == 1)) {
        console.log('nothign to do')
        return;
    }
    if (width == 0) width = canvasWidth;
    if (height == 0) width = canvasHeight;

    canvasQ.width(width);
    canvasQ.height(height);

    // Get the real size of canvas.
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height();

    mRenderer.setSize(canvasWidth, canvasHeight);

    // TODO: Possible memory leak?
    //var scale = 1;
    /*
    mTexture1 = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mTexture2 = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mBrushtexture1 = new newtarget(canvasWidth, canvasHeight);
    mBrushtexture2 = new newtarget(canvasWidth, canvasHeight);
    mThinningTexture1 = new newtarget(canvasWidth, canvasHeight);
    mThinningTexture2 = new newtarget(canvasWidth, canvasHeight);
    */
    mTemp0Texture = new newtarget(canvasWidth * scale, canvasHeight * scale0 * scale);
    mRD0Texture = new newtarget(canvasWidth * scale, canvasHeight * scale0 * scale);

    mRDTexture = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mBrushtexture = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mEmtpytexture = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mThinningTexture = new newtarget(canvasWidth * scale, canvasHeight * scale);
    mTempTexture = new newtarget(canvasWidth * scale, canvasHeight * scale);

    mUniforms.screenWidth.value = canvasWidth * scale / 2;
    mUniforms.screenHeight.value = canvasHeight * scale / 2;
}
//==================================================================================================================================
export function updatethinning(x) {
    thinning = x;
}
//==================================================================================================================================
function render_to_texture(material, source, target) {
    mScreenQuad.material = material;
    mUniforms.tSource.value = source.texture;
    mRenderer.setRenderTarget(target);
    mRenderer.render(mScene, mCamera);
}
//==================================================================================================================================
function renderBrush() {
    render_to_texture(mBrushMaterial, mBrushtexture, mTempTexture);
    render_to_texture(mBrushMaterial, mTempTexture, mBrushtexture);
    mUniforms.tMask.value = mBrushtexture.texture;
}
//==================================================================================================================================
function renderSystem() {
    mUniforms.toggle = 0;
    render_to_texture(mGSMaterial, mRDTexture, mTempTexture);
    mUniforms.toggle = 1;
    render_to_texture(mGSMaterial, mTempTexture, mRDTexture);
}
//==================================================================================================================================
function renderScreen() {
    render_to_texture(mScreenMaterial, mRDTexture, null);
}
//==================================================================================================================================
//==================================================================================================================================
//==================================================================================================================================
var render = function (time) {
    var dt = (time - mLastTime) / 20.0;
    if (dt > 0.8 || dt <= 0)
        dt = 0.8;
    mLastTime = time;
    mUniforms.delta.value = dt * speedscale;
    mRenderer.clear();

    //  if (scale0 == 1) 

    if (scale0 != 1) {   // maak mask van feed & kill vormen         
        var w0 = mUniforms.screenWidth.value;
        var h0 = mUniforms.screenHeight.value;
        var f0 = mUniforms.feed;
        var k0 = mUniforms.kill;
        mUniforms.kill = mUniforms.l0kill;
        mUniforms.feed = mUniforms.l0feed;
        mUniforms.screenWidth.value = w0 * scale0;
        mUniforms.screenHeight.value = h0 * scale0;

        for (var i = 0; i < 4; ++i) {
            mUniforms.toggle = 0;
            render_to_texture(mGSMaterial, mRD0Texture, mTemp0Texture);
            mUniforms.toggle = 1;
            render_to_texture(mGSMaterial, mTemp0Texture, mRD0Texture);
        }
        // render_to_texture(mGSMaterial, mRD0Texture, mRDTexture);

        mUniforms.kill = k0;
        mUniforms.feed = f0;
        mUniforms.screenWidth.value = w0;
        mUniforms.screenHeight.value = h0;
        mUniforms.brush.value = mMinusOnes;
        //mUniforms.tMask.value = mEmtpytexture;
        render_to_texture(mScreenMaterial, mRD0Texture, mBrushtexture);

    }
    renderBrush();

    if (mUniforms.editmode.value != 1) {
        for (var i = 0; i < 4; ++i) {
            renderSystem();
        }
        mUniforms.brush.value = mMinusOnes;
    }

    renderScreen();

    if (thinning > 0) {
        render_to_texture(mScreenMaterial, mRDTexture, mThinningTexture);
        for (i = 0; i < thinning; i++) {
            mUniforms.toggle = 0;
            render_to_texture(mThinningMaterial, mThinningTexture, mTempTexture);
            mUniforms.toggle = 1;
            render_to_texture(mThinningMaterial, mTempTexture, mThinningTexture);
        }
        render_to_texture(mAverageMaterial, mThinningTexture, null);
    }
    requestAnimationFrame(render);
}
//==================================================================================================================================
//==================================================================================================================================
//==================================================================================================================================
export function addGrouptoScene(g) {
    console.log('add group to scene');
    //   var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
    //    camera.position.set( 0, 0, 200 );
    //mScene.background = new THREE.Color( 0xb0b0b0 );
    mScene.add(g);
    console.log(mScene);
    mScreenQuad.visible = false;
    mRenderer.setRenderTarget(mBrushtexture);
    mRenderer.render(mScene, mCamera);
    mRenderer.setRenderTarget(null);
    mRenderer.render(mScene, mCamera);
    mScreenQuad.visible = true;
    g.visible = false;
    mRenderer.render(mScene, mCamera);
    //stophere(ffa);  
}

//==================================================================================================================================
export function updateparameters(f, k, m, s, e, b, bs, df, dk, mf, mk, l0f, l0k) {
    mUniforms.df.value = df;
    mUniforms.dk.value = dk;
    mUniforms.feed.value = f;
    mUniforms.kill.value = k;
    mUniforms.maskfeed.value = mf;
    mUniforms.maskkill.value = mk;
    mUniforms.mode.value = m;
    mUniforms.editmode.value = e;
    mUniforms.maskmode.value = b;
    mUniforms.masksize.value = bs;
    mUniforms.l0feed = l0f;
    mUniforms.l0kill = l0k;

    speedscale = s;
}

//==================================================================================================================================
export function updateUniformsColors2(c0, c1, c2) {
    mColors[0].value = new THREE.Vector4(c0[0], c0[1], c0[2], c0[3]);
    mColors[1].value = new THREE.Vector4(c1[0], c1[1], c1[2], c1[3]);
    mColors[2].value = new THREE.Vector4(c2[0], c2[1], c2[2], c2[3]);
}

export function updateModifications(mod1, mod2) {
    shader_stdf = shader_stdf_original.replace("/*MOD1*/", mod1);
    shader_stdf = shader_stdf.replace("/*MOD2*/", mod2);
    //init();
    //mGSMaterial.fragmentShader = shader_stdf;
    //mGSMaterial.dispose();
    mGSMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: shader_stdv,
        fragmentShader: shader_stdf,
    });

}


//==================================================================================================================================
var onMouseMove = function (e) {
    var ev = e ? e : window.event;

    mMouseX = ev.pageX - canvasQ.offset().left; // these offsets work with
    mMouseY = ev.pageY - canvasQ.offset().top; //  scrolled documents too

    if (mMouseDown) {
        // Send brush command to paint pixels near mouse position
        mUniforms.brush.value = new THREE.Vector2(mMouseX / canvasWidth,
            1 - mMouseY / canvasHeight);
    }
}

//==================================================================================================================================
var onMouseDown = function (e) {
    var ev = e ? e : window.event;
    e
    mMouseDown = true;
    mPaintMode = (mPaintMode + 1) % 2;
    mUniforms.brmode.value = mPaintMode ? 1.0 : 0.0;

    // Send brush command to paint pixels near mouse position
    mUniforms.brush.value = new THREE.Vector2(mMouseX / canvasWidth,
        1 - mMouseY / canvasHeight);
}
//==================================================================================================================================
var onMouseUp = function (e) {
    mMouseDown = false;
}
//==================================================================================================================================
export function clean() {
    mClearMode = (mClearMode + 1) % 5;
    // Send brush command to erase screen
    if (mClearMode == 0) {
        // Clear to red state
        mUniforms.brush.value = new THREE.Vector2(-10, -10);
    } else if (mClearMode == 1) {
        // Draw a single blue spot
        mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
        mUniforms.brmode.value = 1.0;
    } else if (mClearMode == 2) {
        // Clear to blue state
        mUniforms.brush.value = new THREE.Vector2(-10, -1);
    } else if (mClearMode == 3) {
        // Use earlier simpler noise function
        mUniforms.brush.value = new THREE.Vector2(-10, 2);
    } else {
        // Use noise with 2 degrees of freedom
        mUniforms.brush.value = new THREE.Vector2(-10, 1);
    }
}
//==================================================================================================================================
export function snapshot() {
    var dataURL = canvas.toDataURL("image/png");
    window.open(dataURL, "name-" + Math.random());
}


export function cnvs() {
    return canvas;
}
