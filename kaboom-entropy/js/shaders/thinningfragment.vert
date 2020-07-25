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
uniform int toggle;
//uniform vec4 color4;

//uniform vec4 color5;

vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
float step_x = 1.0 / screenWidth;
float step_y = 1.0 / screenHeight;
//http://fourier.eng.hmc.edu/e161/lectures/morphology/node2.html


void main()
{  
    bool points[9]; // true: on / black 
    vec4 value=texture2D(tSource, vUv);
    points[0]= (value.g < color1.a); // center point
    points[1]= (texture2D(tSource, vUv + vec2( 0.0    , step_y )).g < color1.a);
    points[2]= (texture2D(tSource, vUv + vec2( step_x , step_y )).g < color1.a);
    points[3]= (texture2D(tSource, vUv + vec2( step_x , 0.0    )).g < color1.a);
    points[4]= (texture2D(tSource, vUv + vec2( step_x ,-step_y )).g < color1.a);
    points[5]= (texture2D(tSource, vUv + vec2( 0.0    ,-step_y )).g < color1.a);
    points[6]= (texture2D(tSource, vUv + vec2(-step_x ,-step_y )).g < color1.a);
    points[7]= (texture2D(tSource, vUv + vec2(-step_x , 0.0    )).g < color1.a);
    points[8]= (texture2D(tSource, vUv + vec2(-step_x , step_y )).g < color1.a);   

    int NumNonZeroes=0;
    int NumTransitions=0;
    bool deletepixel=false;
    
    for (int i=1 ; i<9 ; i++) {
        if  (points[i])  NumNonZeroes++;
        if (i<8) {
            if ( points[i] != points[i+1] ) NumTransitions++;         
        }
    }
    if ( points[1] != points[8] ) NumTransitions++;    

    if (points[0]){ // we can skip this if already black
        deletepixel=(NumNonZeroes>=5);        
    }
    deletepixel=false;
//        if (points[0] && ( NumNonZeroes>=2 ) && ( NumNonZeroes<=6 ) && (NumTransitions==1) && (!(points[1] && points[3] && points[5]) ) && (!(points[3] && points[5] && points[7])) && points[7]) {
 //           deletepixel=true;
  //          }
    
    if (vUv.x>0.5) deletepixel=true;  // for debugging
    if (vUv.y>0.5) {value.r=1.0; value.g=1.0;}

    if (deletepixel) {       
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
    else
    {   
        gl_FragColor = value;
    }   
    
}