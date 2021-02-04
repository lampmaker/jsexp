
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

export class Material {
    constructor(vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = [];
    }
    //------------------
    setKeywords(keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++)
            hash += hashCode(keywords[i]);

        let program = this.programs[hash];
        if (program == null) {
            let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            program = createProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = program;
        }

        if (program == this.activeProgram) return;

        this.uniforms = getUniforms(program);
        this.activeProgram = program;
    }
    //------------------
    bind() {
        gl.useProgram(this.activeProgram);
    }
}
//--------------------------------------------------------------------------------------------------------------------
export class Program {
    constructor(vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
        this.uniformsc = getUniformsc(this.program);
    }
    //------------------
    bind() {
        gl.useProgram(this.program);
    }
}
//--------------------------------------------------------------------------------------------------------------------
export function createProgram(vertexShader, fragmentShader) {
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
        let uniformName = uniform.name;
        console.log(uniform);
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }

    return uniforms;
}
export function getUniformsc(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniform = gl.getActiveUniform(program, i)
        uniforms[uniform.name] = new Uniform(uniform.type, gl.getUniformLocation(program, uniform.name));
    }

    return uniforms;
}
//--------------------------------------------------------------------------------------------------------------------
export function compileShader(type, source, keywords) {    // keywords = DEFINES in webgl code
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

// trying new option for uniforms. 

export class Uniform {
    constructor(type, location) {
        this.type = type;
        this.loc = location;
    }
    set(data) {
        switch (this.type) {
            case uniformType.i:
                gl.uniform1i(this.loc, data[0]);
                break;
            case uniformType.f:
                gl.uniform1f(this.loc, data[0]);
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
        }
    }
}

//bloomPrefilterProgram.uniforms.curve.set(curve0, curve1, curve2);