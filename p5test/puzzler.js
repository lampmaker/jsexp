import * as THREE from '/three.module.js';
import { SVGLoader } from '/SVGLoader.js';


var busy = false;


//======================================================================================================
// GPU.jS STUFF
//======================================================================================================
const gpu = new GPU();
var GPUmatrix = []
const MAXLINES = 264;
const MAXPOINTS = 1024 // points per line
const GPUMATRIXLENGTH = 2 + MAXPOINTS * 2;

function initializeGPumatrix(l, p) {
    for (var i = 0; i < l; i++) {
        GPUmatrix[i] = []
        for (var j = 0; j < p * 2 + 2; j++) {
            GPUmatrix[i][j] = 0;
        }
    }
}

/*
eerste point in elke lijn:
x = aantal punten in de lijn.

0 1  2  3  4  5  6  7 
n w x1 y1 x2 y2  x3 y3 
*/

const settings =
{
    maxlines: MAXLINES,
    maxpoints: MAXPOINTS,
    forcetonext: 10,
    forcetopoints: 10,
    forcetoborder: 20,
    speed: 1
}


// ==========================================================================================================
// Calculate attraction or repulsion force.  a=strength, p=power ()
// ==========================================================================================================

function force(p1, p2, a, p) {
    var F = new Vertex(0, 0);
    var D = Vdist(p1, p2);
    if (D == 0) return F;
    var V = new Vertex((p1.x - p2.x) / D, (p1.y - p2.y) / D);  // direction vector
    F.x = a * V.x / Math.pow(D, p);
    F.y = a * V.y / Math.pow(D, p);
    if (F.x == null || F.y == null) {
        return new Vertex(0, 0);
    }
    var l = Vlen(F);
    if (l > 1) F = Vscale(F, 1 / l);

    return F;
}
// ==========================================================================================================



const GPUtest = gpu.createKernel(function (_a) {
    var i = 3;
    return i + _a;
}).setOutput([3, 3])

const GPUtest2 = gpu.createKernel(function (_m, _a) {
    var CP = _m[this.thread.y][this.thread.x] + _a // current point
    return CP
}).setOutput([settings.maxpoints, settings.maxlines])



//======================================================================================================
// VORONOI STUFF
//======================================================================================================
var seeds;
var lines;
var border, borderpoints;
var borderloaded = false;
var phase = 1;


//======================================================================================================
function Vertex(x, y) {
    this.x = x;
    this.y = y;
}
function Vadd(a, b) {
    return new Vertex(a.x + b.x, a.y + b.y);
}

function Vlen(a) {
    return sqrt(a.x * a.x + a.y * a.y);
}

//  Vdistance between points p1 p2
function Vdist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}

function Vscale(p1, a) {
    return new Vertex(p1.x * a, p1.y * a);
}
//======================================================================================================
// true if pint x,y is in shapepath
//======================================================================================================
function inpath(P, vs) {
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x,
            yi = vs[i].y;
        var xj = vs[j].x,
            yj = vs[j].y;
        var intersect = ((yi > P.y) != (yj > P.y)) &&
            (P.x < (xj - xi) * (P.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// helper function for intersect-point
function ud(A1, A2, B1, B2) {
    return ((B2.x - B1.x) * (A1.y - B1.y) - (B2.y - B1.y) * (A1.x - B1.x)) / ((B2.y - B1.y) * (A2.x - A1.x) - (B2.x - B1.x) * (A2.y - A1.y));
}
//================================================================================================
// calculates intersection between lines A1-A2 and B1-B2.   null if intersection is not in-between those points
function intersect_point(A1, A2, B1, B2) {
    var ua = ud(A1, A2, B1, B2);
    var ub = ud(B1, B2, A1, A2);
    if ((ua >= 0) && (ua <= 1) && (ub >= 0) && (ub <= 1)) {
        var x = A1.x + ua * (A2.x - A1.x);
        var y = A1.y + ua * (A2.y - A1.y);
        return [x, y, ua, ub]
    }
    return null;
}
//================================================================================================
// trim lines outside of shape.  P contains line (4 points), b contains border
//================================================================================================
function trimlines(l, b) {
    var p1_inside = inpath(l[0], b);
    var p2_inside = inpath(l[1], b);
    if (p1_inside && p2_inside) return l;  //  both lines are inside
    if (!p1_inside && !p2_inside) {
        //   console.log("both poitns outside")

        return null;  // both lines are outside - possible that line in-between them still intersects with border!
    }
    if (!p1_inside) {  // make sure l[0] is always inside
        var tmp = l[0];
        l[0] = l[1];
        l[1] = tmp;
    }
    var i = 0;
    var min = 10;
    var isc;
    var fisc;
    for (var i = 0; i < b.length - 1; i++) {
        isc = intersect_point(l[0], l[1], b[i], b[(i + 1)]);
        if (isc != null) {
            if (isc[2] < min) {
                min = isc[2] // find closest one.  isc2 is Vdistance on p1-p2 line.
                fisc = isc;
            }
        }
    }
    if (min < 1) {  // if not, no valid intersection was found.        
        l[1].x = fisc[0];
        l[1].y = fisc[1];
        return l;
    }
    return null
}


//================================================================================================
//subdivides a path by inserting points between two adjacent points that are more than 2*maxd apart
// maxd=minimum Vdistance between points.  Actual will vary between maxd and 2*maxd.
//================================================================================================
function subdivpath(P, maxd) {
    var i = 0;
    var ready = false;
    while (!ready) {
        var P1 = P[i];
        var P2 = P[i + 1];
        var D = Vdist(P1, P2);

        if (D > 2 * maxd) {  //.. Vdistance is too large, need to insert point(s)
            var numinserts = Math.floor((D - maxd) / maxd); // number of points to be inserted
            if (numinserts > 500) numinserts = 500;
            var dx = (P2.x - P1.x) / (numinserts + 1);
            var dy = (P2.y - P1.y) / (numinserts + 1);
            for (var j = 1; j <= numinserts; j++) {
                var newpoint = new Vertex(P1.x + dx * j, P1.y + dy * j);
                P.splice(i + j, 0, newpoint);  // insert point
            }
        }
        i++;
        ready = (i >= (P.length - 1) || i > 2000);
    }
    return P;
}


//================================================================================================
// VORONOI - Vdistributepoints evenly within shape
// calculate average between points.   Need to lower in order to Vdistribute more evenly
//================================================================================================
function even_spread_totalVdistance(S, p) {
    var TD = 0;
    var mi = 10000000000000;
    for (var i = 0; i < S.length; i++) {
        var mind = 10000000000;
        for (var j = 0; j < S.length; j++) {
            if (j != i) {
                var D = Vdist(S[i], S[j]);
                if (D < mind) mind = D;
            }
        }
        for (var j = 0; j < p.length; j++) {
            var D = Vdist(S[i], p[j]) * 3;
            if (D < mind) mind = D;
        }
        TD = TD + mind;
        if (mind < mi) mi = mind;
    }
    return { avg: TD / S.length, min: mi };
}


// ==========================================================================================================

// ==========================================================================================================
function attractionvector(Si, S, p, a1, a2) {
    var Fa = new Vertex(0, 0);
    for (var j = 0; j < S.length; j++) {        // compare to other seeds        
        var f = force(Si, S[j], a1, 2);
        Fa = Vadd(Fa, f);
    }
    var Vdisttoedge = 10000;
    var Fb = new Vertex(0, 0);
    if (p != null) {
        for (var j = 0; j < p.length - 1; j++) {    // compare with border
            var ls = Vdist(p[j], p[j + 1]); // length of line segment
            var D = Vdist(p[j], Si);
            if (D < 10) { ls = ls * 100 };
            var f = force(Si, p[j], a2 * ls, 3);
            Fb = Vadd(Fb, f);
        }
    }
    if (Vdisttoedge < 5) {
        Fa.x = 0; Fa.y = 0;
    }
    var F = Vadd(Fa, Fb);
    // line(Si.x, Si.y, Si.x + F.x * 50, Si.y + F.y * 50) // vector
    return F;
}


//================================================================================================
// VORONOI SEED - move point from closest neighbotr. reVdistribute
// a = Vdistance with zero force
// f = force
//================================================================================================


function moveaway(S, p, a1, a2, f, a) {
    var ready = true
    var t = 0;
    for (var i = 0; i < S.length; i++) {
        var V = attractionvector(S[i], S, p, a1, a2);
        t = t + Math.sqrt((V.x * V.x) + (V.y * V.y));
        S[i].x = S[i].x + V.x * f;
        S[i].y = S[i].y + V.y * f;
    }
    return (t < a)
}
//================================================================================================
// main function, spreads all th points within shape
// moves every point a fraction away from the closest neighbor
//================================================================================================
function evenly_spread(S, p, a1, a2, f, a) {
    var ready = true;
    var avgVdist = even_spread_totalVdistance(S, p);
    ready = moveaway(S, p, a1, a2, f, a);
    return ready;
}




//==================================================================================================
//  a: attraction force to both neighbor points
//  b: repulsion force other points
//  c: repulsion force border
//  s: stepsize
//==================================================================================================
function diffgrowth(lines, a, b, c, p, s) {
    var tl = lines;
    for (var l = 0; l < 2; l++) {

        for (var i = 1; i < lines[l].length - 1; i++) {   // don't do this for the edge nodes
            var fa = new Vertex(0, 0);
            var fb = new Vertex(0, 0);
            var fc, f;
            var fa1 = force(lines[l][i], lines[l][i - 1], a, 2);
            var fa2 = force(lines[l][i], lines[l][i + 1], a, 2);
            fa = Vadd(fa1, fa2);
            //---------------------------------
            for (var j = 0; j < lines.length; j++) {
                fb = Vadd(fb, attractionvector(lines[l][i], lines[j], p, b, 0));
            }
            //---------------------------------
            var f = Vadd(fa, fb);
            //     stroke('#FF0000')
            //   circle(lines[l][i].x, lines[l][i].y, 10);
            //line(lines[l][i].x, lines[l][i].y, lines[l][i].x + f.x * s, lines[l][i].y + f.y * s);
            tl[l][i].x += f.x, 1 * s;
            tl[l][i].y += f.y, 1 * s;
            stroke('#FFFFFF')
        }
    }
    return tl;
}
































//======================================================================================================
//VORONOI
//Vadds[count] random points within range[size_w, size_h] and within shape defined by[path]
//======================================================================================================
function Vadd_random(count, size_w, size_h, path) {
    var n = 0
    while (n < count) {
        var P = new Vertex(Math.random() * size_w, Math.random() * size_h);
        if (path == null) {
            seeds[seeds.length] = P;
            n++
        }
        else {
            if (inpath(P, path.getPoints())) {
                seeds[seeds.length] = P;
                n++
            }
        }
    }
}
//======================================================================================================
//VORONOI
//Iniitializes voronoi with 100 points
//======================================================================================================
function voronoi_setup() {
    seeds = new Array();
    Vadd_random(50, width, height, border);
}
//======================================================================================================
//VORONOI
// Renders voronoi shape
//======================================================================================================
function voronoi_render(b) {
    var bbox = { xl: 0, xr: width, yt: 0, yb: height };
    var voronoi = new Voronoi();
    var result = voronoi.compute(seeds, bbox);
    var polys = new Array();   // array of line segments. 
    for (var cell = 0; cell < result.cells.length; cell++) {
        for (var edge = 0; edge < result.cells[cell].halfedges.length - 1; edge++) {
            var p = result.cells[cell].halfedges[edge].getStartpoint();
            var q = result.cells[cell].halfedges[edge].getEndpoint();
            if (q == null || p == null) {
                console.log("error", cell, edge)
            }
            var Vadd = true;  // only Vadd lines that do not exist yet
            var i = 0;
            while ((Vadd == true) && (i < polys.length)) {
                if ((polys[i].x1 == p.x) && (polys[i].y1 == p.y) && (polys[i].x2 == q.x) && (polys[i].y2 == q.y)) Vadd = false;
                if ((polys[i].x1 == q.x) && (polys[i].y1 == q.y) && (polys[i].x2 == p.x) && (polys[i].y2 == p.y)) Vadd = false;
                i++;
            }
            if (Vadd) {
                var l = new Array();
                l[0] = new Vertex(p.x, p.y);
                l[1] = new Vertex(q.x, q.y);
                //                var l = new Vline(p.x, p.y, q.x, q.y);             
                if (b != null) l = trimlines(l, b);
                if (l != null) {
                    polys[polys.length] = l;
                }
            }
        }
    }
    return polys;

}
//======================================================================================================
// draw the path defined by P
//======================================================================================================
function showpath(P) {
    var points = P.getPoints();
    for (var k = 1; k < points.length; k++) {
        var x1 = (points[k - 1].x);
        var y1 = (points[k - 1].y);
        var x2 = (points[k].x);
        var y2 = (points[k].y);
        //line(x1, y1, x2, y2);
        point(x1, y1);
        // console.log(x1, y1, x2, y2);
    }
}
function drawlines(P, l) {
    for (var i = 0; i < P.length; i++) {
        for (var j = 0; j < P[i].length - 1; j++) {
            if (l >= 1) {
                line(P[i][j].x, P[i][j].y, P[i][j + 1].x, P[i][j + 1].y)
            }
            else {
                point(P[i][j].x, P[i][j].y);
            }
            if (l > 1) {
                circle(P[i][j].x, P[i][j].y, 3)
            }
        }
    }
}
//======================================================================================================
// loads SVG with dimensions mx,my
//======================================================================================================
function loadsvg(mx, my) {
    var minx = 100000000, maxx = -100000000, miny = 100000000, maxy = -100000000;
    var loader = new SVGLoader();
    var scale;
    loader.load('beer.svg', function (data) {
        var SVGdata = data.paths;
        // for (var j = 0; j < SVGdata[0].subPaths.length; j++) {
        var points = SVGdata[0].subPaths[0].getPoints();
        for (var k = 0; k < points.length; k++) {
            if (points[k].x < minx) minx = points[k].x;
            if (points[k].y < miny) miny = points[k].y;
            if (points[k].x > maxx) maxx = points[k].x;
            if (points[k].y > maxy) maxy = points[k].y;
        }
        // }
        var cwidth = maxx - minx;
        var cheight = maxy - miny;
        var x0 = (minx + maxx) / 2
        var y0 = (miny + maxy) / 2;
        scale = Math.min(mx / cwidth, my / cheight);
        console.log(cwidth, cheight, x0, y0, scale);
        //for (var j = 0; j < SVGdata[0].subPaths.length; j++) {
        var points = SVGdata[0].subPaths[0].getPoints(1);
        points - subdivpath(points, 1);
        for (var k = 0; k < points.length; k++) {
            var x1 = (points[k].x - x0) * scale + mx / 2;
            var y1 = (points[k].y - y0) * scale + my / 2;
            if (k == 0) {
                border.moveTo(x1, y1)
            }
            else {
                border.lineTo(x1, y1);
            }
        }
        //   borderpoints = border.getPoints();
        borderloaded = true;
        borderpoints = border.getPoints();



        voronoi_setup();
        //  }
    })
}





//======================================================================================================
// p5 TESTS
//======================================================================================================
function example1_setup() {
    let d = 70;
    let p1 = d;
    let p2 = p1 + d;
    let p3 = p2 + d;
    let p4 = p3 + d;
    // Sets the screen to be 720 pixels wide and 400 pixels high
    createCanvas(1024, 1024);
    background('#000000');
    noSmooth();
    translate(140, 0);

    // Draw gray box
    stroke('#ff0000');
    line(p3, p3, p2, p3);
    line(p2, p3, p2, p2);
    line(p2, p2, p3, p2);
    line(p3, p2, p3, p3);

    // Draw white points
    stroke('#ffffff');
    point(p1, p1);
    point(p1, p3);
    point(p2, p4);
    point(p3, p1);
    point(p4, p2);
    point(p4, p4);
}
var mySvg;
//======================================================================================================
function example2_setup() {

    createCanvas(1000, 1000);
    background(255);
    imageMode(CENTER);
    mySvg.resize(1000, 0);
    image(mySvg, width / 2, height / 2);
    console.log(mySvg);
}
//======================================================================================================
//======================================================================================================
//======================================================================================================

export function preload() {
    //  mySvg = loadImage("beer.svg");

}

export function setup() {
    // example2_setup();

    initializeGPumatrix(settings.maxlines, settings.maxpoints);


    var test = [];
    test[0] = new Vertex(0, 0);
    test[1] = new Vertex(100, 100);
    test = subdivpath(test, 10);

    lines = [];
    createCanvas(1000, 1000);
    background(0);
    stroke('#FFFFFF');
    border = new THREE.Path;
    loadsvg(1000, 1000);
    //imageMode(CENTER);
    //mySvg.resize(1000, 0);
    //image(mySvg, width / 2, height / 2);    
}



//======================================================================================================
const GPU_movepoints = gpu.createKernel(function (_matrix, fa, fb, fc, sp, mxl) {
    var CP = _matrix[this.thread.y][this.thread.x] // current point    

    if (this.thread.x == 0) return CP;  // x=1: length     - no calculation required
    if (this.thread.x == 1) return CP;  // x=1: weight     - no calculation required
    if (_matrix[this.thread.y][0] == 0) return CP;  // empty row
    if (_matrix[this.thread.y][1] == 0) return CP;  // weight=0, dont move point
    if (this.thread.x > _matrix[this.thread.y][0] * 2 + 2) return CP;

    var p1 = [0.0, 0.0];
    var weight = _matrix[this.thread.y][1];
    var p2 = [0.0, 0.0];
    var Dist = 0.0;
    var V = [0.0, 0.0]; // direction vector 
    var F = [0.0, 0.0]; //force
    var Ftot = [0.0, 0.0]; //force
    const power = 2;
    var even = true;
    if (this.thread.x % 2 == 0) {
        p1[0] = _matrix[this.thread.y][this.thread.x];  // x
        p1[1] = _matrix[this.thread.y][this.thread.x + 1]; // y
    }
    else {
        p1[1] = _matrix[this.thread.y][this.thread.x];   // y
        p1[0] = _matrix[this.thread.y][this.thread.x - 1]; // x
        even = false;
    }
    for (var i = 0; i < mxl; i++) {
        if (_matrix[i][0] > 0) {
            for (var j = 2; j <= _matrix[i][0]; j += 2) {
                p2[0] = _matrix[i][j];
                p2[1] = _matrix[i][j + 1];
                Dist = Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));  // distance between points
                V = [(p1[0] - p2[0]) / Dist, (p1[1] - p2[1]) / Dist];  // direction vector
                if (V[0] != 0 && V[1] != 0) {
                    F[0] = V[0] / Math.pow(Dist, power);
                    F[1] = V[1] / Math.pow(Dist, power);
                    Ftot[0] += F[0];
                    Ftot[1] += F[1];
                }
                else
                    return CP;
            };
        }
    }

    Ftot[0] = Ftot[0] * fa * weight;
    Ftot[1] = Ftot[1] * fa * weight;
    p1[0] += 1;//Ftot[0] * sp;
    p1[1] += 0;//Ftot[1] * sp;
    if (even) { return p1[0] } else { return p1[1] }

}).setOutput([GPUMATRIXLENGTH, MAXLINES])

// adds a single line to the GPU matrix
function add_line_to_gpumatrix(line, offset, w) {
    var mx = line.length;
    if (line.length * 2 > settings.maxpoints - 2) {
        console.log("maxpoints TOO SMALL", line.length, settings.maxpoints / 2);
        mx = settings.maxpoints / 2 - 2;
    }
    GPUmatrix[offset][0] = mx;
    GPUmatrix[offset][1] = w;
    for (var j = 0; j < mx; j++) {
        GPUmatrix[offset][j * 2 + 2] = line[j].x;
        GPUmatrix[offset][j * 2 + 3] = line[j].y;
    }
}
// adds multiple lines to the GPU matrix
function add_lines_to_gpumatrix(lines, offset, w) {
    var count = lines.length;
    if (count + offset > settings.maxlines) {
        console.log("maxlines TOO SMALL", lines.length, settings.maxlines);
        count = settings.maxlines - offset;
    }
    if (count > 0) {
        for (var i = 0; i < count; i++) {
            var io = i + offset;
            add_line_to_gpumatrix(lines[i], io, w);
        }
    }
}

function get_lines_from_gpumatrix() {
    lines = []
    for (var i = 0; i < settings.maxlines; i++) {
        var linelength = GPUmatrix[i][0];
        if (linelength == 0) return lines;
        lines[i] = new Array();
        for (var j = 0; j < linelength; j++) {
            lines[i][j] = new Vertex(GPUmatrix[i][j * 2 + 2], GPUmatrix[i][j * 2 + 3]);
        }
    }
    return lines;
}

function get_line_count_from_gpumatrix(G) {
    for (var i = 0; i < settings.maxlines; i++) {
        var linelength = G[i][0];
        if (linelength == 0) return i;
    }
    return i;
}


function processGPU() {
    var lc = lines.length;
    add_lines_to_gpumatrix(lines, 0, 1);
    var lc1 = get_line_count_from_gpumatrix(GPUmatrix)

    GPUmatrix = GPU_movepoints(
        GPUmatrix,
        settings.forcetonext,
        settings.forcetopoints,
        settings.forcetoborder,
        settings.speed,
        min(lines.length, MAXLINES));

    lines = get_lines_from_gpumatrix();
}


export function draw() {
    if (borderloaded) {
        background(0);
        stroke('#FFFFFF');
        showpath(border)
        if (phase == 1) {
            stroke('#00FF00');
            lines = voronoi_render(borderpoints);
            drawlines(lines, 1);
            if (evenly_spread(seeds, borderpoints, 100, 80, 10, 0.5)) { phase = 2 }
            for (var i = 0; i < seeds.length; i++) {
                point(seeds[i].x, seeds[i].y);
            }
        }
        if (phase == 2) {
            // add_line_to_gpumatrix(borderpoints, 0, 0);
            stroke('#FFFFFF')
            for (var i = 0; i < lines.length; i++) {
                lines[i] = subdivpath(lines[i], 30);
            }
            //drawlines(lines, 2);;            
            phase = 3;
        }
        if (phase == 3) {
            processGPU();
            //  lines = diffgrowth(lines, 100, 100, 10000, borderpoints, 1);
            for (var i = 0; i < lines.length; i++) {
                lines[i] = subdivpath(lines[i], 40);
            }
            drawlines(lines, 2);;
        }
    }
}

window.preload = preload
window.setup = setup;
window.draw = draw; 