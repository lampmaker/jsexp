varying vec2 vUv;
uniform float screenWidth;
uniform float screenHeight;
uniform sampler2D tSource;
uniform sampler2D tBrush;
uniform float delta;
uniform float feed;
uniform float kill;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 color3;
uniform int editmode;
//uniform vec4 color4;

//uniform vec4 color5;
    int NumNonZeroes;
    int NumTransitions;
vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);

//http://fourier.eng.hmc.edu/e161/lectures/morphology/node2.html


void main()
{
    
     vec4 points[8];
     vec4 p0= texture2D(tSource, vUv);
    points[0]= texture2D(tSource, vUv + vec2( 0 , 1));
    points[1]= texture2D(tSource, vUv + vec2( 1 , 1));
    points[2]= texture2D(tSource, vUv + vec2( 1 , 0));
    points[3]= texture2D(tSource, vUv + vec2( 1 ,-1));
    points[4]= texture2D(tSource, vUv + vec2( 0 ,-1));
    points[5]= texture2D(tSource, vUv + vec2(-1 ,-1));
    points[6]= texture2D(tSource, vUv + vec2(-1 , 0));
    points[7]= texture2D(tSource, vUv + vec2(-1 , 1));


    NumTransitions=0;
    NumNonZeroes=0;

    const float lim=0.5;
    for (int i=0 ; i<8 ; i++) {
        if ( points[i].r < lim ) NumNonZeroes++;
        if (i<7) {
            if ( (points[i].r > lim) && (points[i+1].r < lim) ) NumTransitions++;
         if ( (points[i].r < lim) && (points[i+1].r > lim) ) NumTransitions++;
        }
    }
    if ( (points[0].r > lim) && (points[7].r < lim) ) NumTransitions++;
    if ( (points[0].r < lim) && (points[7].r > lim) ) NumTransitions++;


    bool R = (NumNonZeroes==0) || (NumNonZeroes==1) || (NumNonZeroes==7) || (NumNonZeroes==8) || (NumTransitions>=2);
gl_FragColor = vec4(p0.r, p0.g, p0.b, 1.0);
/*
    if (R){
        gl_FragColor = vec4(p0.r,p0,g,p0.b, 1.0);
    }
    else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
*/


    
}