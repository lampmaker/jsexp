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

//http://jaredgerschler.blog/2018/02/25/the-zhang-suen-thinning-algorithm-introduction-and-applications/
void main()
{  
    bool points[11]; // true: on / black 
    vec4 value=texture2D(tSource, vUv);
    float limit=0.5;

    // points: true = black: needs thinning.  False: white; nothing to be done.
    points[1]= (value.g < limit); // center point
    points[2]= (texture2D(tSource, vUv + vec2( 0.0    , step_y )).g < limit);
    points[3]= (texture2D(tSource, vUv + vec2( step_x , step_y )).g < limit);
    points[4]= (texture2D(tSource, vUv + vec2( step_x , 0.0    )).g < limit);
    points[5]= (texture2D(tSource, vUv + vec2( step_x ,-step_y )).g < limit);
    points[6]= (texture2D(tSource, vUv + vec2( 0.0    ,-step_y )).g < limit);
    points[7]= (texture2D(tSource, vUv + vec2(-step_x ,-step_y )).g < limit);
    points[8]= (texture2D(tSource, vUv + vec2(-step_x , 0.0    )).g < limit);
    points[9]= (texture2D(tSource, vUv + vec2(-step_x , step_y )).g < limit);   
    points[10]=points[2];

    int NumBlackPixels=0;
    int NumTransitions=0;
    for (int i=2 ; i<10 ; i++) {
        if  (points[i])  NumBlackPixels++;        
        if ( points[i] != points[i+1] ) NumTransitions++;                 
    }
   //---------------------------------------------------
    if (points[1]) {         
        bool c=false;
        c= (NumBlackPixels>=2) && (NumBlackPixels<=6);
        c = (c && (NumTransitions==2));
        if (toggle==1){
            c = (c && (!(points[2] && points[4] && points [6])));
            c = (c && (!(points[4] && points[6] && points [8])));
        }
        else {
            c = (c && (!(points[2] && points[4] && points [8])));
            c = (c && (!(points[2] && points[6] && points [8])));
        }        
        if (c) points[1]=false;        
    }
    
    if (points[1]) {       
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // black
    }
    else
    {   
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0); // white
    }   
    
}