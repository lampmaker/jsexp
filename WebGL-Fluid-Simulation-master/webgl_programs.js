
import { gl, ext } from './webgl_context.js';
import { hashCode } from '/utils.js';



//https://github.com/KhronosGroup/glTF/blob/master/specification/1.0/README.md
var uniformType = {
    b: 5120,// (BYTE), 
    ub: 5121,//(UNSIGNED_BYTE),
    s: 5122,//(SHORT),
    us: 5123,//(UNSIGNED_SHORT),
    i: 5124,//(INT),
    ui: 5125,//(UNSIGNED_INT),
    f: 5126,//(FLOAT),
    v2: 35664,//(FLOAT_VEC2),
    v3: 35665,//(FLOAT_VEC3),
    v4: 35666,//(FLOAT_VEC4),
    i2: 35667,//(INT_VEC2),
    i3: 35668,//(INT_VEC3),
    i4: 35669,//(INT_VEC4),
    b: 5670,//(BOOL),
    b2: 35671,//(BOOL_VEC2),
    b3: 35672,//(BOOL_VEC3),
    b4: 35673,//(BOOL_VEC4),
    m2: 35674,//(FLOAT_MAT2),
    m3: 35675,//(FLOAT_MAT3),
    m4: 35676,//(FLOAT_MAT4), and
    s2d: 35678//(SAMPLER_2D).
}

//======================================================================================================================
//
// Creates a program with vertexShadersOUrce and fragmentshadersource.
//  if isfixed, the fragmetnshader gets compiled immediately.  Otherwise, setKeywords will have to be executed first.
//  allows for different programs with diffeerent defines (=keywords)
//  if the keywprds/defines are changed, a new program is created.  the program of existing defines/keywords is reused.
//======================================================================================================================
export class Program {
    constructor(vertexShaderSource, fragmentShaderSource, isfixed) {
        this.vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.program = null;
        this.uniforms = [];
        if (isfixed) {
            this.setKeywords();
        }
    }
    //------------------
    setKeywords(keywords) {
        let hash = 0;
        if (keywords != null) {
            for (let i = 0; i < keywords.length; i++)
                hash += hashCode(keywords[i]);
        }
        let tprogram = this.programs[hash];
        if (tprogram == null) {
            let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            tprogram = createProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = tprogram;
            console.log("New program created")
        }
        if (tprogram == this.program) return;
        this.uniforms = getUniforms(tprogram);
        this.program = tprogram;
    }
    //------------------
    bind() {
        gl.useProgram(this.program);
    }
}

/*
//--------------------------------------------------------------------------------------------------------------------
// class containing program, shaders, uniforms. 
//
export class Program {
    constructor(vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
    }
    //------------------
    bind() {
        gl.useProgram(this.program);
    }
}
*/
//--------------------------------------------------------------------------------------------------------------------
// class containing uniforms, makes it easy to set uniforms, knows which type the uniform is.
//
export class Uniform {
    constructor(type, location, name) {
        this.type = type;
        this.loc = location;
        this.name = name;
    }
    set(data) {
        switch (this.type) {
            case uniformType.i:
            case uniformType.s2d:
                gl.uniform1i(this.loc, data);
                break;
            case uniformType.f:
                gl.uniform1f(this.loc, data);
                break;
            case uniformType.v2:
                gl.uniform2f(this.loc, data[0], data[1],);
                break;
            case uniformType.v3:
                gl.uniform3f(this.loc, data[0], data[1], data[2]);
                break;
            case uniformType.v4:
                gl.uniform4f(this.loc, data[0], data[1], data[2], data[3]);
                break;
            case uniformType.s2:
                gl.uniform(this.loc, data[0], data[1], data[2], data[3]);
            default:
                console.log("Uniform conversion unknown type:", this.type, this.name)
                break;
        }
    }
}
//--------------------------------------------------------------------------------------------------------------------
export function createProgram(vertexShader, fragmentShader, compile) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.trace(gl.getProgramInfoLog(program));
    return program;
}
//--------------------------------------------------------------------------------------------------------------------

export function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniform = gl.getActiveUniform(program, i)
        uniforms[uniform.name] = new Uniform(uniform.type, gl.getUniformLocation(program, uniform.name), uniform.name);
    }

    return uniforms;
}
//=======================================================================================================================
//
// Compiles the sshader and adds the keywords (defines) first. 
//=======================================================================================================================
function compileShader(type, source, keywords) {    // keywords = DEFINES in webgl code
    source = addKeywords(source, keywords);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.trace(gl.getShaderInfoLog(shader));
    return shader;
};
//--------------------------------------------------------------------------------------------------------------------
export function addKeywords(source, keywords) {  // keywords = DEFINES in webgl code
    if (keywords == null) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}



//====================================================================================================================
// rendert het actieve programma naar de target.  als target=null, rendert naar de target FBO

//
//====================================================================================================================

export function blit(target, clear = false) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
};