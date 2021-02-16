export function generateColor() {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}
//====================================================================================================================
//
//====================================================================================================================

function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r,
        g,
        b
    };
}

//====================================================================================================================
//
//====================================================================================================================

export function normalizeColor(input) {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}
//====================================================================================================================
//
//====================================================================================================================

export function wrap(value, min, max) {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}
//====================================================================================================================
//
//====================================================================================================================


export function getTextureScale(texture, width, height) {
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}
//====================================================================================================================
//
//====================================================================================================================

export function scaleByPixelRatio(input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}
//====================================================================================================================
//
//====================================================================================================================

export function hashCode(s) {
    if (s.length == 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};



class SvgToPngConverter {
    constructor() {
        this._init = this._init.bind(this);
        this._cleanUp = this._cleanUp.bind(this);
        this.convertFromInput = this.convertFromInput.bind(this);
    }

    _init() {
        this.canvas = document.createElement("canvas");
        this.imgPreview = document.createElement("img");
        this.imgPreview.style = "position: absolute; top: -9999px";

        document.body.appendChild(this.imgPreview);
        this.canvasCtx = this.canvas.getContext("2d");
    }

    _cleanUp() {
        document.body.removeChild(this.imgPreview);
    }

    convertFromInput(input, callback) {
        this._init();
        let _this = this;
        this.imgPreview.onload = function () {
            const img = new Image();
            _this.canvas.width = _this.imgPreview.clientWidth;
            _this.canvas.height = _this.imgPreview.clientHeight;
            img.crossOrigin = "anonymous";
            img.src = _this.imgPreview.src;
            img.onload = function () {
                _this.canvasCtx.drawImage(img, 0, 0);
                let imgData = _this.canvas.toDataURL("image/png");
                if (typeof callback == "function") {
                    callback(imgData)
                }
                _this._cleanUp();
            };
        };

        this.imgPreview.src = input;
    }
}