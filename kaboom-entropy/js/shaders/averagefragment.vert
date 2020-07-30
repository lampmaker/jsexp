varying vec2 vUv;

uniform float screenWidth;
uniform float screenHeight;
uniform sampler2D tSource;
uniform float delta;
uniform float feed;
uniform float kill;
uniform int shape;
uniform vec2 brush;
uniform float brmode;
uniform int maskmode;
uniform float masksize;
uniform int editmode;

vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
float step_x = 1.0 / screenWidth;
float step_y = 1.0 / screenHeight;
//=====================================================================================================================
void main()
{ 
  vec4 uv = texture2D(tSource, vUv).rgba;
  vec4 uv0 = texture2D(tSource, vUv + vec2(-step_x, 0.0)).rgba;
  vec4 uv1 = texture2D(tSource, vUv + vec2(step_x, 0.0)).rgba;
  vec4 uv2 = texture2D(tSource, vUv + vec2(0.0, -step_y)).rgba;
  vec4 uv3 = texture2D(tSource, vUv + vec2(0.0, step_y)).rgba;
  
  vec4 res;
  
  if (uv.r==0.0){
    res=vec4(0.0,0.0,0.0,0.0);
  }
  else
  {
    res= (uv * 2.0 + uv0 + uv1 + uv2 + uv3  )/6.0;
  }


  gl_FragColor = vec4(res.r,res.g,res.b,res.a);
}
//=====================================================================================================================