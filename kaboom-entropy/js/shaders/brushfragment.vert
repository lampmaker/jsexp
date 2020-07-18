varying vec2 vUv;

uniform float screenWidth;
uniform float screenHeight;
uniform sampler2D tSource;
uniform float delta;
uniform float feed;
uniform float kill;
uniform int mode;
uniform vec2 brush;
uniform float brmode;
uniform int brushmode;
uniform float brushsize;

vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
float step_x = 1.0 / screenWidth;
float step_y = 1.0 / screenHeight;
//=====================================================================================================================
void main()
{
  
  vec2 uv = texture2D(tSource, vUv).rg;
  vec2 dst = uv ;
  
  if ((brush.x > 0.0 ))
  {
    vec2 diff = (vUv - brush) / texel;
    float dist = dot(diff, diff);
   // dst.g=0.0;
    dst.r=0.0; 
    if ((dist < brushsize)&&(brushmode>0))
    {
      dst.g=0.0;
     if (brmode>0.0) {
       dst.g=1.0    ;
     }
     else {
       dst.g=0.0;
     }
    }
  }
  gl_FragColor = vec4(dst.r, dst.g, 0.0, 1.0);
}
//=====================================================================================================================