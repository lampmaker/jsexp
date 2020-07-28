

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
var mTexture1, mTexture2, mBrushtexture1, mBrushtexture2;
var mGSMaterial, mScreenMaterial, mBrushMaterial, mThinningMaterial;
var mScreenQuad;

//
var mColorsNeedUpdate = true;
var mLastTime = 0;
var mClearMode = 2; /* First click will make it 3, which is the better simplex noise */
var mPaintMode = 0; /* First click will make it 1, which is to paint blue */
var speedscale = 1;

var mMinusOnes = new THREE.Vector2(-1, -1);
var thinning = 0;

var recording = false;

var shader_scrf, shader_stdf, shader_stdv, shader_brush, shader_stdf_original, shader_thinning;

var shaderloadingmanager = new THREE.LoadingManager();
var loader = new THREE.FileLoader(shaderloadingmanager);

shaderloadingmanager.onLoad = function () {
    init();
};

export function loadshaders() {
    loader.load("js/shaders/screenfragment.vert", function (data) { shader_scrf = data; });
    loader.load("js/shaders/standardfragment.vert", function (data) { shader_stdf = data; shader_stdf_original = data; });
    loader.load("js/shaders/standardvertex.vert", function (data) { shader_stdv = data; });
    loader.load("js/shaders/brushfragment.vert", function (data) { shader_brush = data; });
    loader.load("js/shaders/thinningfragment.vert", function (data) { shader_thinning = data; });
};


//==================================================================================================================================
function init() {


    canvasQ = $('#myCanvas');
    canvas = canvasQ.get(0);

    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmousemove = onMouseMove;

    mRenderer = new THREE.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true });

    mScene = new THREE.Scene();
    mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    mCamera.position.z = 100;
    mScene.add(mCamera);

    mUniforms = {
        screenWidth: { type: "f", value: undefined },
        screenHeight: { type: "f", value: undefined },
        tSource: { type: "t", value: undefined },
        tBrush: { type: "t", value: undefined },
        delta: { type: "f", value: 1.0 },
        feed: { type: "f", value: .1 },
        kill: { type: "f", value: .055 },
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

    var plane = new THREE.PlaneGeometry(1.0, 1.0);
    mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
    mScene.add(mScreenQuad);

    mColorsNeedUpdate = true;
    resize(canvas.clientWidth, canvas.clientHeight, true);

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
export function resize(width, height, force) {
    // Set the new shape of canvas.

    canvasWidth = canvasQ.width();

    canvasHeight = canvasQ.height();
    if (!force && (canvasWidth == width) && (canvasHeight == height)) {
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
    mTexture1 = new newtarget(canvasWidth, canvasHeight);
    mTexture2 = new newtarget(canvasWidth, canvasHeight);
    mBrushtexture1 = new newtarget(canvasWidth, canvasHeight);
    mBrushtexture2 = new newtarget(canvasWidth, canvasHeight);

    mUniforms.screenWidth.value = canvasWidth / 2;
    mUniforms.screenHeight.value = canvasHeight / 2;
}
//==================================================================================================================================
export function testfunction(x) {
    console.log('testfunction');

    // render texture 2 to texture 1.
    //render_to_texture(mScreenMaterial, mTexture1, mTexture2);
    //  mRenderer.setRenderTarget(null);
    //  mRenderer.render(mScene, mCamera);
    ;

    //   mUniforms.tSource.value = mTexture2.texture;
    //  mScreenQuad.material = mScreenMaterial;
    //  mRenderer.setRenderTarget(mTexture1);
    //  mRenderer.render(mScene, mCamera);

    thinning = 100;
    // texture 1 bevat nu de data.
    //

    //    mRenderer.setRenderTarget(null);
    //    mRenderer.render(mScene, mCamera);


    // laat het op het scherm zien
    /*
        //for (var i = 0; i < 10; ++i) {
        mUniforms.toggle = 0;
        mUniforms.tSource.value = mBrushtexture1.texture;
        mScreenQuad.material = mThinningMaterial;
        mRenderer.setRenderTarget(mBrushtexture2);
        mRenderer.render(mScene, mCamera);
        mUniforms.toggle = 1;
        mUniforms.tSource.value = mBrushtexture2.texture;
        mRenderer.setRenderTarget(mBrushtexture1);
        mRenderer.render(mScene, mCamera);
    
        //}
        mRenderer.setRenderTarget(null);
        //renderScreen();
        //mRenderer.setRenderTarget(null);
        mRenderer.render(mScene, mCamera);
        mRenderer.setRenderTarget(null);
      */
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
    render_to_texture(mBrushMaterial, mBrushtexture1, mBrushtexture2);
    render_to_texture(mBrushMaterial, mBrushtexture2, mBrushtexture1);
    mUniforms.tBrush.value = mBrushtexture1.texture;
}
//==================================================================================================================================
function renderSystem() {
    mUniforms.toggle = 0;
    render_to_texture(mGSMaterial, mTexture1, mTexture2);
    mUniforms.toggle = 1;
    render_to_texture(mGSMaterial, mTexture2, mTexture1);
}
//==================================================================================================================================
function renderScreen() {
    render_to_texture(mScreenMaterial, mTexture1, null);
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
    renderBrush();

    if (thinning > 0) {
        mUniforms.toggle = 0;
        render_to_texture(mThinningMaterial, mTexture1, mTexture2);
        mUniforms.toggle = 1;
        render_to_texture(mThinningMaterial, mTexture2, mTexture1);
        render_to_texture(mThinningMaterial, mTexture1, null);
        thinning--
        if (thinning == 0) {
            thinning = 1;
        }
    }
    else {
        if (mUniforms.editmode.value != 1) {
            for (var i = 0; i < 4; ++i) {
                renderSystem();
            }
            mUniforms.brush.value = mMinusOnes;
            renderScreen();
        }
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
    mRenderer.setRenderTarget(mBrushtexture1);
    mRenderer.render(mScene, mCamera);
    mRenderer.setRenderTarget(null);
    mRenderer.render(mScene, mCamera);
    mScreenQuad.visible = true;
    g.visible = false;
    mRenderer.render(mScene, mCamera);
    //stophere(ffa);  
}

//==================================================================================================================================
export function updateparameters(f, k, m, s, e, b, bs, df, dk) {
    mUniforms.df.value = df;
    mUniforms.dk.value = dk;
    mUniforms.feed.value = f;
    mUniforms.kill.value = k;
    mUniforms.mode.value = m;
    mUniforms.editmode.value = e;
    mUniforms.maskmode.value = b;
    mUniforms.masksize.value = bs;
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



export function record () 
{
//	function record(canvas, time) {
	var time=4000;
    var recordedChunks = [];
    if (recording) {               
        console.log('busy');
    }
    else
    return new Promise(function (res, rej) {
        recording=true;
        var stream = canvas.captureStream(30 /*fps*/);
        var mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9"
            //mimeType: "video/webm; codecs=h264"
        });

        //ondataavailable will fire in interval of `time || 4000 ms`
        mediaRecorder.start(time || 4000);
        console.log('start');
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
            res(url);
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
    })
}