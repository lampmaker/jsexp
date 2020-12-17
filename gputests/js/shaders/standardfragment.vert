

/*
http://learnwebgl.brown37.net/12_shader_language/glsl_mathematical_operations.html

http://learnwebgl.brown37.net/12_shader_language/glsl_builtin_functions.html


*/







varying vec2 vUv;
// - uniforms ---------------------------------
uniform float screenWidth;
uniform float screenHeight;
uniform sampler2D tSource;
uniform float delta;
uniform float feed;
uniform float kill;
uniform vec4 df;
uniform vec4 dk;
// -----------------------------------------------------------------
vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
float step_x = 1.0 / screenWidth;
float step_y = 1.0 / screenHeight;

//  ==================================================================================================
vec2  laplace() {
  vec3 weight=vec3(-4.0 , 1.0 , 0.0);// center, edge, 
  //vec3 weight=vec3(-6.0 , 1.0 , 0.5);// center, edge, corner  
  vec2 uv5 = texture2D(tSource, vUv + vec2(0.0      , 0.0)).rg;  
  vec2 uv2 = texture2D(tSource, vUv + vec2(0.0      , step_y)).rg;
  vec2 uv4 = texture2D(tSource, vUv + vec2(-step_x  , 0.0)).rg;
  vec2 uv6 = texture2D(tSource, vUv + vec2( step_x  , 0.0)).rg;
  vec2 uv8 = texture2D(tSource, vUv + vec2(0.0      , -step_y)).rg;
  vec2 L = uv5 * weight.r;
  L = L + ( uv2 + uv4 + uv6 + uv8 ) * weight.g;
  return  L;
}


//===================================================================================================
// examples
//===================================================================================================
/* Simplex noise function */
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 permute4(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
///
void examples(){
  vec2 v=vec2(3.0,3.0);
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,  -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  float U = clamp(v.r, 0.0, 1.0);

}



//=====================================================================================================================
//=====================================================================================================================
void main()
{
  vec2 uv = texture2D(tSource, vUv).rg;
  vec2 lapl = laplace().rg; //10485.76;
  
  // position variables ---------------------------------------------------------------------------------------------------
  float x=vUv.x;                                                                   // x
  float y=vUv.y;                                                                   //y

  // main parameters variables ---------------------------------------------------------------------------------------------------
  float f=feed;
  float k=kill;
  float d=delta;

  /*MOD1*/  // mod inserted here
  
  float du =  (1.0 * lapl.r) - (uv.r * uv.g * uv.g) + f * (1.0 - uv.r);
  float dv =  (1.0 * lapl.g) + (uv.r * uv.g * uv.g) - (f + k) * uv.g;
  vec2 dst;

  dst = uv + d * vec2(du, dv);
  /*MOD2*/  // mod will be inserted here. 
  
  dst.g=uv.g+0.001;
  if (dst.g>=1.0) dst.g=0.0;
  //gl_FragColor = vec4(dst.r, dst.g, dst.g, 0.0);
  //gl_FragColor =permute4(texture2D(tSource, vUv));
  gl_FragColor.g=dst.g;
}
//=====================================================================================================================
