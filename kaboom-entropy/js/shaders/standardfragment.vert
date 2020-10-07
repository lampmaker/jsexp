
varying vec2 vUv;

uniform float screenWidth;
uniform float screenHeight;
uniform sampler2D tSource;
uniform sampler2D tMask;
uniform float delta;
uniform float feed;
uniform float kill;
uniform float maskfeed;
uniform float maskkill;

uniform int shape;

uniform vec2 brush;
uniform float brmode;
uniform int maskmode;
uniform int editmode;
uniform vec4 df;
uniform vec4 dk;
uniform vec2 imgscale;


vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
float step_x = 1.0 / screenWidth;
float step_y = 1.0 / screenHeight;

//=====================================================================================================================
/* Simplex noise function */
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
//============================================================================================================
float snoise(vec2 v)
{
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                          dot(x12.zw, x12.zw)),
               0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
//=====================================================================================================================
vec2 homogen_uv()
{
  float sqrt_F = sqrt(feed);
  float U = 1.0;
  float V = 0.0;
  if (kill < (sqrt_F - 2.0 * feed) / 2.0)
  {
    float A = sqrt_F / (feed + kill);
    U = (A - sqrt(A * A - 4.0)) / (2.0 * A);
    U = clamp(U, 0.0, 1.0);
    V = sqrt_F * (A + sqrt(A * A - 4.0)) / 2.0;
    V = clamp(V, 0.0, 1.0);
  } // else, (U,V) already set to (1,0)
  return vec2(U, V);
}

//=====================================================================================================================
/* This means the "clear" command was just given */
void clearcommand(){
    vec2 huv = homogen_uv();
    if (brush.y < -5.0)
    {
      // Set to red state
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); /* u=1, v=0, -, opaque */
    }
    else if (brush.y < 0.0)
    {
      // set to blue state
      gl_FragColor = vec4(huv.r, huv.g, 0.0, 1.0);
    }
    else if (brush.y == 2.0)
    {
      // let's do some noise
      // float t = 0.5*(snoise(0.21*vUv/texel) + snoise(0.34*vUv/texel));
      float t = 0.5 * (snoise(0.1 * vUv / texel) + snoise(0.16 * vUv / texel));
      gl_FragColor = vec4(clamp(huv.r - t, 0.0, 1.0),
                          clamp(huv.g + t, 0.0, 1.0), 0.0, 1.0);
    }
    else
    {
      // works for most of the presets, but is worse for a couple of them
      float t1 = 0.5 * (snoise(0.1 * vUv / texel) + snoise(0.16 * vUv / texel));
      float t2 = 0.5 * (snoise(0.3 - 0.13 * vUv / texel) + snoise(0.7 - 0.21 * vUv / texel));
      gl_FragColor = vec4(clamp(huv.r - 0.25 + t1, 0.0, 1.0),
                          clamp(huv.g - 0.25 + t2, 0.0, 1.0), 0.0, 1.0);
    }
}
//=====================================================================================================================
vec2 paint(){
    vec2 dst1;
    vec2 diff = (vUv - brush) / texel;
    float dist = dot(diff, diff);
    if (dist < 5.0)
    {
      dst1.g = 0.9;
      if (brmode > 0.0)
      {
        /* paint blue */
        dst1.r = 0.0;
        dst1.g = 0.9; /* set u=0, v=0.9 */
      }
      else
      {
        /* paint red */
        dst1.r = 1.0;
        dst1.g = 0.0; /* set u=1, v=0 */
      }
    }
    return dst1;
}
//  ==================================================================================================
vec2  laplace() {
  vec2 uv = texture2D(tSource, vUv).rg;
  vec2 uv0 = texture2D(tSource, vUv + vec2(-step_x, 0.0)).rg;
  vec2 uv1 = texture2D(tSource, vUv + vec2(step_x, 0.0)).rg;
  vec2 uv2 = texture2D(tSource, vUv + vec2(0.0, -step_y)).rg;
  vec2 uv3 = texture2D(tSource, vUv + vec2(0.0, step_y)).rg;
  return  (uv0 + uv1 + uv2 + uv3 - 4.0 * uv); //10485.76;
}
//=====================================================================================================================
//=====================================================================================================================
//===                                                                                                               ===
//===                                                                                                               ===
//===                                                                                                               ===
//===                                                                                                               ===
//=====================================================================================================================
//=====================================================================================================================
void main()
{
  if (brush.x < -5.0)
  {
    clearcommand();
    return;
  }

  vec2 uv = texture2D(tSource, vUv).rg;
  vec2 lapl = laplace().rg; //10485.76;
  
  // position variables ---------------------------------------------------------------------------------------------------
  float x=vUv.x;                                                                   // x
  float y=vUv.y;                                                                   //y
  float R = sqrt((vUv.x - 0.5) * (vUv.x - 0.5) + (vUv.y - 0.5) * (vUv.y - 0.5));   // radius
  float xd = abs(vUv.x - 0.5)*2.0;                                                 // distance from center
  float yd = abs(vUv.y - 0.5)*2.0;                                                 // distance from center

  // main parameters variables ---------------------------------------------------------------------------------------------------
  float Da = 0.2097;  // diffusion rate A
  float Db= 0.105;  // diffusion rate B 
  float f=feed;
  float k=kill;
  float d=delta;

  // feed, kill gradients vs position -------------------------------------------------------------------------------------
   f= f + ((x - 0.5) * df.r + xd * df.g + (y - 0.5) * df.b + yd * df.a) * 0.0005;
   k= k + ((x - 0.5) * dk.r + xd * dk.g + (y - 0.5) * dk.b + yd * dk.a) * 0.0005;

  // 7,8 -> use maskfeed, maskkill -----------------------------------------------------------------------------------------
  vec2 buv = texture2D(tMask, vUv).rg  ;
  if ( (maskmode == 7 ) && ( buv.g >  0.0 )) { f=maskfeed; k=maskkill;   }
  if ( (maskmode == 8 ) && ( buv.g ==  0.0 )) { f=maskfeed; k=maskkill;   }

  // 9,10: use for images --------------------------------------------------------------------------------------------------- 
  if ((maskmode==9)||(maskmode==10)) {          /// ALLOWS FOR GRADIENT SLOPE OF MASK
  vec3 buv3 = texture2D(tMask, vUv).rgb  ;
    float i=(buv3.r + buv3.g + buv3.b)/ 3.0;   // i=0..1
    i = imgscale.r + i * imgscale.g;
    if (i<0.0) i=0.0;
    if (i>1.0) i=1.0;
    if (maskmode==10) i=1.0-i;
    f=f+(maskfeed-f)*i;
    k=k+(maskkill-k)*i;
  }

  /*MOD1*/  // mod inserted here

  float du =  (Da * lapl.r) - (uv.r * uv.g * uv.g) + f * (1.0 - uv.r);
  float dv =  (Db * lapl.g) + (uv.r * uv.g * uv.g) - (f + k) * uv.g;
  vec2 dst = uv + d * vec2(du, dv);
  
  if (shape==1){  //circle
    if ((R > 0.49))
    {
      dst.r = 1.0;
      dst.g = 1.0;
      //dv=0.00;
    }
  }

/*MOD2*/  // mod will be inserted here. 

  // for painting with cursor ------------------------------------------------------------------------------------------------
  if ((editmode==0) && (brush.x > 0.0))
  {
    vec2 diff = (vUv - brush) / texel;
    float dist = dot(diff, diff);
    if (dist < 5.0)
    {
      dst.g = 0.9;
      if (brmode > 0.0)
      {
        //paint blue 
        dst.r = 0.0;
        dst.g = 0.9; // set u=0, v=0.9
      }
      else
      {
        // paint red 
        dst.r = 1.0;
        dst.g = 0.0; // set u=1, v=0 
      }
    }
  }

  // apply mask --------------------------------------------------------------------------------------------------------------------
  buv = texture2D(tMask, vUv).rg;  
  if ( (maskmode == 0 ) && ( buv.g >  0.0 )) { dst.r=0.8;    dst.g=0.8;   }
  if ( (maskmode == 1 ) && ( buv.g >  0.0 )) { dst.r=0.0;    dst.g=0.0;   }
  if ( (maskmode == 2 ) && ( buv.g == 0.0 )) { dst.r=0.8;    dst.g=0.8;   }
  if ( (maskmode == 3 ) && ( buv.g == 0.0 )) { dst.r=0.0;    dst.g=0.0;   }
  if ( (maskmode == 4 ) && ( buv.g == 0.0 )) { dst.r=0.8;    dst.g=0.0;   }
  if ( (maskmode == 5 ) && ( buv.g == 0.0 )) { dst.r=0.0;    dst.g=0.8;   }
  if ( (maskmode == 6 ) && ( buv.g == 0.0 )) { dst.r=0.8;    dst.g=0.8;   }

  gl_FragColor = vec4(dst.r, dst.g, 1.0, 0.0);
}
//=====================================================================================================================