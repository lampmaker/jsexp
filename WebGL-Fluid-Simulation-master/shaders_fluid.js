
//====================================================================================================================
//
//====================================================================================================================

export const advectionShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform sampler2D uEnvironment;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;
    

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {    
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float env= texture2D(uEnvironment, vUv).g;    
        float d=dissipation;       
       // if (env <  1.0 ) d=10 .0;
        float decay = 1.0 + d * dt;
        gl_FragColor = result / decay;
    }`

//====================================================================================================================
//
//====================================================================================================================

export const divergenceShader = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        
        if (vL.x < 0.0) { L = -L; }
        if (vR.x > 1.0) { R = -R; }
        if (vT.y > 1.0) { T = -T; }
        if (vB.y < 0.0) { B = -B; }
               
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`
//====================================================================================================================
//
//====================================================================================================================

export const curlShader = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
       
        float vorticity = R - L - T + B;        
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`
//====================================================================================================================
//
//====================================================================================================================

export const vorticityShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform sampler2D uEnvironment;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).r;
        float R = texture2D(uCurl, vR).r;
        float T = texture2D(uCurl, vT).r;
        float B = texture2D(uCurl, vB).r;
        float C = texture2D(uCurl, vUv).r;
        
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        
        
        vec2 velocity = texture2D(uVelocity, vUv).xy;     
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        float env= texture2D(uEnvironment, vUv).g;     
        if (env < 1.0)  velocity*=-1.0;      

        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`
//====================================================================================================================
//
//====================================================================================================================

export const pressureShader = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;       
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
       //if (vB.y< 0.5 && vL.x < 0.5) {  gl_FragColor = vec4(pressure/10.0, 0.0, 0.0, 1.0);}
    }
`
//====================================================================================================================
//
//====================================================================================================================

export const gradientSubtractShader = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;        
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      //  if (vB.y< 0.5 && vL.x < 0.5) {  gl_FragColor = vec4(0, 0.0, 0.0, 1.0);}
    }
`
