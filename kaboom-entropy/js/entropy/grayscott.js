/* 
 * Gray-Scott
 *
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 */

(function () {

    // Canvas.
    var canvas;
    var canvasQ;
    var canvasWidth;
    var canvasHeight;

    var mMouseX, mMouseY;
    var mMouseDown = false;

    var mRenderer;
    var mScene;
    var mCamera;
    var mUniforms;
    var mColors;
    var mColorsNeedUpdate = true;
    var mLastTime = 0;
    var mClearMode = 2; /* First click will make it 3, which is the better simplex noise */
    var mPaintMode = 0; /* First click will make it 1, which is to paint blue */

    var mTexture1, mTexture2;
    var mGSMaterial, mScreenMaterial;
    var mScreenQuad;

    var mToggled = false;

    var mMinusOnes = new THREE.Vector2(-1, -1);

    // Some presets.
    var presets = [
        { feed: 0.098, kill: 0.0555 }, // Negative bubbles (sigma)
        { feed: 0.098, kill: 0.057 }, // Positive bubbles (rho)
        { feed: 0.085, kill: 0.059 }, // Precritical bubbles (rho/kappa)
        { feed: 0.082, kill: 0.060 }, // Worms and loops (kappa)
        { feed: 0.074, kill: 0.064 }, // Stable solitons (nu)
        { feed: 0.062, kill: 0.0609 }, // The U-Skate World (pi)
        { feed: 0.058, kill: 0.065 }, // Worms (mu)
        { feed: 0.046, kill: 0.063 }, // Worms join into maze (kappa)
        { feed: 0.046, kill: 0.0594 }, // Negatons (iota)
        { feed: 0.042, kill: 0.059 }, // Turing patterns (delta)
        { feed: 0.039, kill: 0.058 }, // Chaos to Turing negatons (beta)
        { feed: 0.037, kill: 0.06 }, // Fingerprints (theta/kappa)
        { feed: 0.0353, kill: 0.0566 }, // Chaos with negatons (beta/delta)
        { feed: 0.034, kill: 0.0618 }, // Spots and worms (eta)
        { feed: 0.03, kill: 0.063 }, // Self-replicating spots (lambda)
        { feed: 0.03, kill: 0.0565 }, // Super-resonant mazes (theta)
        { feed: 0.029, kill: 0.057 }, // Mazes (kappa)
        { feed: 0.026, kill: 0.055 }, // Mazes with some chaos (gamma)
        { feed: 0.026, kill: 0.051 }, // Chaos (beta)
        { feed: 0.025, kill: 0.06 }, // Pulsating solitons (zeta)
        { feed: 0.022, kill: 0.059 }, // Warring microbes (epsilon)
        { feed: 0.018, kill: 0.051 }, // Spots and loops (alpha)
        { feed: 0.014, kill: 0.054 }, // Moving spots (alpha)
        { feed: 0.014, kill: 0.045 }, // Waves (xi)
        { feed: 0.001, kill: 0.03 } // leave this line at the end
    ];

    // Configuration.
    var feed = presets[0].feed;
    var kill = presets[0].kill;
    var feed2 = feed;
    var kill2 = kill;

    var shader_scrf, shader_stdf, shader_stdv;
    /*
        var shaderloadingmanager = new THREE.LoadingManager();
        var loader = new THREE.FileLoader(shaderloadingmanager);
    
        shaderloadingmanager.onLoad = function ( ) {
           shader_scrf=document.getElementById('screenFragmentShader').textContent
           shader_stdf=document.getElementById('gsFragmentShader').textContent
           shader_stdv=document.getElementById('standardVertexShader').textContent
         init();  
        };
    */
    loadshaders = function () {
        loader.load("js/shaders/screenfragment.js", function (data) { shader_scrf = data; });
        loader.load("js/shaders/standardfragment.js", function (data) { shader_stdf = data; });
        loader.load("js/shaders/standardvertex.js", function (data) { shader_stdv = data; });
    };

    //==================================================================================================================================
    init = function () {
        shader_scrf = document.getElementById('screenFragmentShader').textContent
        shader_stdf = document.getElementById('gsFragmentShader').textContent
        shader_stdv = document.getElementById('standardVertexShader').textContent

        init_controls();

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
            delta: { type: "f", value: 1.0 },
            feed: { type: "f", value: feed },
            kill: { type: "f", value: kill },
            feed2: { type: "f", value: feed2 },
            kill2: { type: "f", value: kill2 },
            brmode: { type: "f", value: 0.0 },
            brush: { type: "v2", value: new THREE.Vector2(-10, -10) },
            color1: { type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0) },
            color2: { type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2) },
            color3: { type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21) },
            color4: { type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4) },
            color5: { type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6) }
        };
        mColors = [mUniforms.color1, mUniforms.color2, mUniforms.color3, mUniforms.color4, mUniforms.color5];
        $("#gradient").gradient("setUpdateCallback", onUpdatedColor);
        /*
                mGSMaterial = new THREE.ShaderMaterial({
                    uniforms: mUniforms,
                    vertexShader: document.getElementById('standardVertexShader').textContent,
                    fragmentShader: document.getElementById('gsFragmentShader').textContent,
                });
        */
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

        var plane = new THREE.PlaneGeometry(1.0, 1.0);
        mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
        mScene.add(mScreenQuad);

        mColorsNeedUpdate = true;

        resize(canvas.clientWidth, canvas.clientHeight);

        render(0);
        mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
        mLastTime = new Date().getTime();
        requestAnimationFrame(render);
    }
    //==================================================================================================================================
    var resize = function (width, height) {
        // Set the new shape of canvas.
        canvasQ.width(width);
        canvasQ.height(height);

        // Get the real size of canvas.
        canvasWidth = canvasQ.width();
        canvasHeight = canvasQ.height();

        mRenderer.setSize(canvasWidth, canvasHeight);

        // TODO: Possible memory leak?
        mTexture1 = new THREE.WebGLRenderTarget(canvasWidth / 2, canvasHeight / 2,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            });
        mTexture2 = new THREE.WebGLRenderTarget(canvasWidth / 2, canvasHeight / 2,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            });
        mTexture1.texture.wrapS = THREE.RepeatWrapping;
        mTexture1.texture.wrapT = THREE.RepeatWrapping;
        mTexture2.texture.wrapS = THREE.RepeatWrapping;
        mTexture2.texture.wrapT = THREE.RepeatWrapping;

        mUniforms.screenWidth.value = canvasWidth / 2;
        mUniforms.screenHeight.value = canvasHeight / 2;
    }
    //==================================================================================================================================
    var render = function (time) {
        var dt = (time - mLastTime) / 20.0;
        if (dt > 0.8 || dt <= 0)
            dt = 0.8;
        mLastTime = time;

        mScreenQuad.material = mGSMaterial;
        mUniforms.delta.value = dt;
        mUniforms.feed.value = feed;
        mUniforms.kill.value = kill;
        mUniforms.feed2.value = feed2;
        mUniforms.kill2.value = kill2;
        for (var i = 0; i < 8; ++i) {
            if (!mToggled) {
                mUniforms.tSource.value = mTexture1;
                //mRenderer.render(mScene, mCamera, mTexture2, true);
             
                mRenderer.setRenderTarget(mTexture2.texture);
                mRenderer.clear();
                mRenderer.render(mScene, mCamera);


                mUniforms.tSource.value = mTexture2;
            }
            else {
                mUniforms.tSource.value = mTexture2;
                //mRenderer.render(mScene, mCamera, mTexture1, true);
                mRenderer.setRenderTarget(mTexture1.texture);
                mRenderer.clear();
                mRenderer.render(mScene, mCamera);
                mUniforms.tSource.value = mTexture1;
            }

            mToggled = !mToggled;
            mUniforms.brush.value = mMinusOnes;
        }

        if (mColorsNeedUpdate)
            updateUniformsColors();

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mScene, mCamera);

        requestAnimationFrame(render);
    }
    //==================================================================================================================================
    loadPreset = function (idx) {
        feed = presets[idx].feed;
        kill = presets[idx].kill;
        worldToForm();
    }
    //==================================================================================================================================
    loadPreset2 = function (idx) {
        feed2 = presets[idx].feed;
        kill2 = presets[idx].kill;
        worldToForm();
    }
    //==================================================================================================================================
    var updateUniformsColors = function () {
        var values = $("#gradient").gradient("getValuesRGBS");
        for (var i = 0; i < values.length; i++) {
            var v = values[i];
            mColors[i].value = new THREE.Vector4(v[0], v[1], v[2], v[3]);
        }

        mColorsNeedUpdate = false;
    }
    //==================================================================================================================================
    var onUpdatedColor = function () {
        mColorsNeedUpdate = true;
        updateShareString();
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

    var onMouseUp = function (e) {
        mMouseDown = false;
    }
    //==================================================================================================================================
    clean = function () {
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


    snapshot = function () {
        var dataURL = canvas.toDataURL("image/png");
        window.open(dataURL, "name-" + Math.random());
    }
    //==================================================================================================================================
    // resize canvas to fullscreen, scroll to upper left 
    // corner and try to enable fullscreen mode and vice-versa
    fullscreen = function () {

        var canv = $('#myCanvas');
        var elem = canv.get(0);

        if (isFullscreen()) {
            // end fullscreen
            if (elem.cancelFullscreen) {
                elem.cancelFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }

        if (!isFullscreen()) {
            // save current dimensions as old
            window.oldCanvSize = {
                width: canv.width(),
                height: canv.height()
            };

            // adjust canvas to screen size
            resize(screen.width, screen.height);

            // scroll to upper left corner
            $('html, body').scrollTop(canv.offset().top);
            $('html, body').scrollLeft(canv.offset().left);

            // request fullscreen in different flavours
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        }
    }
    //==================================================================================================================================
    var isFullscreen = function () {
        return document.mozFullScreenElement ||
            document.webkitCurrentFullScreenElement ||
            document.fullscreenElement;
    }
    //==================================================================================================================================
    $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function (ev) {
        // restore old canvas size
        if (!isFullscreen())
            resize(window.oldCanvSize.width, window.oldCanvSize.height);
    });
    //==================================================================================================================================
    var worldToForm = function () {
        //document.ex.sldReplenishment.value = feed * 1000;
        $("#sld_replenishment").slider("value", feed);
        $("#sld_diminishment").slider("value", kill);
    }
    //==================================================================================================================================
    var init_controls = function () {
        $("#sld_replenishment").slider({
            value: feed, min: 0, max: 0.1, step: 0.001,
            change: function (event, ui) { $("#replenishment").html(ui.value); feed = ui.value; updateShareString(); },
            slide: function (event, ui) { $("#replenishment").html(ui.value); feed = ui.value; updateShareString(); }
        });
        $("#sld_replenishment").slider("value", feed);
        $("#sld_diminishment").slider({
            value: kill, min: 0, max: 0.073, step: 0.001,
            change: function (event, ui) { $("#diminishment").html(ui.value); kill = ui.value; updateShareString(); },
            slide: function (event, ui) { $("#diminishment").html(ui.value); kill = ui.value; updateShareString(); }
        });
        $("#sld_diminishment").slider("value", kill);

        $("#sld_replenishment2").slider({
            value: feed, min: 0, max: 0.1, step: 0.001,
            change: function (event, ui) { $("#replenishment2").html(ui.value); feed2 = ui.value; updateShareString(); },
            slide: function (event, ui) { $("#replenishment2").html(ui.value); feed2 = ui.value; updateShareString(); }
        });
        $("#sld_replenishment2").slider("value", feed);
        $("#sld_diminishment2").slider({
            value: kill, min: 0, max: 0.073, step: 0.001,
            change: function (event, ui) { $("#diminishment2").html(ui.value); kill2 = ui.value; updateShareString(); },
            slide: function (event, ui) { $("#diminishment2").html(ui.value); kill2 = ui.value; updateShareString(); }
        });
        $("#sld_diminishment2").slider("value", kill);




        $('#share').keypress(function (e) {
            if (e.which == 13) {
                parseShareString();
                return false;
            }
        });

        $("#btn_clear").button({
            icons: { primary: "ui-icon-document" },
            text: false
        });
        $("#btn_snapshot").button({
            icons: { primary: "ui-icon-image" },
            text: false
        });
        $("#btn_fullscreen").button({
            icons: { primary: "ui-icon-arrow-4-diag" },
            text: false
        });

        $("#notworking").click(function () {
            $("#requirement_dialog").dialog("open");
        });
        $("#requirement_dialog").dialog({
            autoOpen: false
        });
    }

    alertInvalidShareString = function () {
        $("#share").val("Invalid string!");
        setTimeout(updateShareString, 1000);
    }

    parseShareString = function () {
        var str = $("#share").val();
        var fields = str.split(",");

        if (fields.length != 12) {
            alertInvalidShareString();
            return;
        }

        var newFeed = parseFloat(fields[0]);
        var newKill = parseFloat(fields[1]);

        if (isNaN(newFeed) || isNaN(newKill)) {
            alertInvalidShareString();
            return;
        }

        var newValues = [];
        for (var i = 0; i < 5; i++) {
            var v = [parseFloat(fields[2 + 2 * i]), fields[2 + 2 * i + 1]];

            if (isNaN(v[0])) {
                alertInvalidShareString();
                return;
            }

            // Check if the string is a valid color.
            if (! /^#[0-9A-F]{6}$/i.test(v[1])) {
                alertInvalidShareString();
                return;
            }

            newValues.push(v);
        }

        $("#gradient").gradient("setValues", newValues);
        feed = newFeed;
        kill = newKill;
        worldToForm();
    }

    updateShareString = function () {
        var str = "".concat(feed, ",", kill);

        var values = $("#gradient").gradient("getValues");
        for (var i = 0; i < values.length; i++) {
            var v = values[i];
            str += "".concat(",", v[0], ",", v[1]);
        }
        $("#share").val(str);
    }

})();
