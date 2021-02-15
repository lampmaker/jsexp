


class Program {    constructor(vertexShader, fragmentShader) {
    this.uniforms = {};
    this.program = createProgram(vertexShader, fragmentShader);
    this.uniforms = getUniforms(this.program);
    bind()   gl.useProgram(this.program);
    

function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);



class Material {   constructor(vertexShader, fragmentShaderSource) {
            this.vertexShader = vertexShader;
            this.fragmentShaderSource = fragmentShaderSource;
            this.programs = [];
            this.activeProgram = null;
            this.uniforms = [];
        }
        //------------------
        setKeywords(keywords) {     // keywords = DEFINES in webgl code
            let hash = 0;
            for (let i = 0; i < keywords.length; i++)
                hash += hashCode(keywords[i]);
    
            let program = this.programs[hash];
            if (program == null) {
                let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);      // only compile if keywords are different,
                program = createProgram(this.vertexShader, fragmentShader);
                this.programs[hash] = program;
            }
    
            if (program == this.activeProgram) return;
    
            this.uniforms = getUniforms(program);
            this.activeProgram = program;
        }
        //------------------
        bind()  gl.useProgram(this.activeProgram);    }