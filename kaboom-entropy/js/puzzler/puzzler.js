import * as THREE from '/js/three/three.module.js';
import { SVGLoader } from '/js/three/SVGLoader.js';

var csimplify, cfilename, svgDocument;
var _filename;
var canvasWidth = 1024;
var canvasHeight = 1024;
var busy = false;

const gpu = new GPU();
var GPUmatrix = []
const MAXLINES = 1600;
const MAXPOINTS = 1024 // points per line
const GPUMATRIXLENGTH = 2 + MAXPOINTS * 2;

var seeds;
var vlines, lines;
var border, borderpoints;
var borderloaded = false;
var phase = 0;



//==================================================================
var mouseboxEnum = {
    small: 10,
    large: 20
}
var mousebox = mouseboxEnum.small;
//==================================================================
var stageEnum = {
    idle: 0,
    voronoi_show: 1,
    voronoi_auto: 2,
    diffgrowthstart: 3,
    diffgrowth: 4
}
var STAGE = stageEnum.idle;
//==================================================================
var VData
VData = {
    SEED_npieces: 50,
    SEED_autodistribute: true,
    a1: 100,
    a1: 80,
    f: 10,
    a: 0.5
}
//==================================================================
var DiffData;
DiffData = {
    d1: 5,
    d2: 3,
    forcetonext: .21,
    forcetopoints: 600,
    power1: 2,
    power2: 2,
    speed: .07,
    fmax: 1,
    edgeforce: 100,
    showcircles: false
}

//========================================================================================================

export function init(size_w, size_h) {
    resizeCanvas(size_w, size_h);
    /*
    
    
        var canvasQ = $('#myCanvas');
        canvasWidth = canvasQ.width();
        canvasHeight = canvasQ.height();
        canvasQ.width(size_w);
        canvasQ.height(size_h);
        */
    /*
        svgDocument = document.getElementById("svgSurface");
        svgDocument.style.width = size_w;
        svgDocument.style.height = size_h;
        while (svgDocument.childNodes.length) {
            svgDocument.removeChild(svgDocument.childNodes[0]);
        }
        var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shape.setAttributeNS(null, "x", 0);
        shape.setAttributeNS(null, "y", 0);
        shape.setAttributeNS(null, "width", size_w);
        shape.setAttributeNS(null, "height", size_h);
        shape.setAttributeNS(null, "fill", "white");
        svgDocument.appendChild(shape);
    */
}
//========================================================================================================

function setup() {
    //  createCanvas(1024, 1024);
}

window.preload = preload
window.setup = setup2;
window.draw = draw;
window.mousedown

export function preload() {

}

export function setup2() {
    setup;
    createCanvas(canvasWidth, canvasHeight);
    background(0);
    stroke('#FFFFFF');
    frameRate(25);

    var nu = new Date;
    var straks = new Date(2021, 0, 23, 17, 2, 0);

    console.log(nu, straks);
    var countdown = straks - nu;
    console.log(countdown);



}

//======================================================================================================
//spreads points in a path so that the max distance between points is dist.  and the minimum number of points is used
//======================================================================================================
function spread_path(p, dist, mxp) {
    p = subdivpath(p, dist / 2, 0, mxp);
    var k = 0;
    var j = 0;
    var p2 = [];
    var d;
    p2[j] = p[k]
    while (k < p.length - 1) {
        d = 0;
        while (d < dist && k < p.length - 1) {
            k++;
            d += Math.sqrt((p[k].x - p[k - 1].x) * (p[k].x - p[k - 1].x) + (p[k].y - p[k - 1].y) * (p[k].y - p[k - 1].y));
        }
        j++;
        p2[j] = p[k];

    }
    return p2;
}
//======================================================================================================
// loads SVG with dimensions mx,my
//======================================================================================================
export function loadSVG(url, fn, density) {
    border = new THREE.Path;

    _filename = fn;
    var mx = width; var my = height;
    var minx = 100000000, maxx = -100000000, miny = 100000000, maxy = -100000000;
    var loader = new SVGLoader();
    var scale;
    loader.load(url, function (data) {
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
        scale = Math.min(mx / cwidth, my / cheight) * 0.95;
        console.log(cwidth, cheight, x0, y0, scale);
        //for (var j = 0; j < SVGdata[0].subPaths.length; j++) {
        var points = SVGdata[0].subPaths[0].getPoints(12);

        points = subdivpath(points, 100, 0, MAXPOINTS * 10);
        points = subdivpath(points, 50, 0, MAXPOINTS * 10);
        points = subdivpath(points, 20, 0, MAXPOINTS * 10);
        points = subdivpath(points, 10, 0, MAXPOINTS * 10);
        points = subdivpath(points, density, 0, MAXPOINTS * 10);

        var circum = 0;
        for (var k = 0; k < points.length - 1; k++) {
            circum += Math.sqrt((points[k].x - points[k + 1].x) * (points[k].x - points[k + 1].x) + (points[k].y - points[k + 1].y) * (points[k].y - points[k + 1].y))
        }
        if (circum / density > MAXPOINTS) {
            density = circum / MAXPOINTS;
        }

        points = spread_path(points, density);
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
    })
}


//======================================================================================================
//VORONOI
//Vadds[count] random points within range[size_w, size_h] and within shape defined by[path]
//======================================================================================================
function Vadd_random(count, size_w, size_h, path) {
    var n = 0
    var failed = 0;
    while (n < count && failed < 100) {
        var P = new Vertex(Math.random() * size_w, Math.random() * size_h);
        if (path == null || path.length == 0) {
            seeds[seeds.length] = P;
            n++;
            failed = 0;
        }
        else {
            if (inpath(P, path.getPoints())) {
                seeds[seeds.length] = P;
                n++
                failed = 0;
            }
            else
                failed++
        }
    }
}

// checks ifd all seeds are still within path. if not, add.
function V_Check(size_w, size_h, path) {
    var outside = 0;
    for (var i = 0; i < seeds.length; i++) {
        if (!inpath(seeds[i], path.getPoints())) {
            var P = new Vertex(Math.random() * size_w, Math.random() * size_h);
            seeds[i] = P;
            outside++;
        }
    }
    return outside;
}




//======================================================================================================
//VORONOI
//Iniitializes voronoi with 100 points
//======================================================================================================

export function voronoi_updateparams(v, restart) {
    lines = [];
    VData = v;
    if (border == null) return;
    if (restart) {
        seeds = new Array();
        Vadd_random(VData.SEED_npieces, width, height, border);
    }
    if (VData.SEED_autodistribute) STAGE = stageEnum.voronoi_auto
    else STAGE = stageEnum.voronoi_show;
}


export function diffgrowth_updateparams(v, restart) {
    VData = v;
    if (VData.d2 == 0) VData.d2 = 10000;
    if (STAGE == stageEnum.idle) return;
    if (restart || STAGE != stageEnum.diffgrowth) {
        lines = vlines;
        initializeGPumatrix(MAXLINES, MAXPOINTS);
        lines = deldupes(lines);
        //for (var i = 0; i < lines.length; i++) {
        //    console.log(lines[i][0].x, lines[i][0].y, lines[i][1].x, lines[i][1].y)
        // }        
        for (var i = 0; i < lines.length; i++) {
            lines[i] = subdivpath(lines[i], VData.d2, 0, MAXPOINTS);
        }
    }

    STAGE = stageEnum.diffgrowth;
}


let sketch = function (p) {
    p.setup = function () {
        p.createCanvas(1024, 1024, p.SVG)
        p.noLoop();
    };

    p.draw = function () {
        p.background('#FFFFFF');
        p.stroke('#FF0000');
        p.strokeWeight(1);
        p.noFill();
        var points = border.getPoints();
        /*
        for (var k = 1; k < points.length; k++) {
            var x1 = (points[k - 1].x);
            var y1 = (points[k - 1].y);
            var x2 = (points[k].x);
            var y2 = (points[k].y);
            p.line(x1, y1, x2, y2);
        }
        */
        p.beginShape();
        for (var k = 0; k < points.length; k++) {
            var x = (points[k].x);
            var y = (points[k].y);
            p.vertex(x, y);
        }
        p.endShape();
        p.stroke('#000000');


        for (var i = 0; i < lines.length; i++) {
            p.beginShape();
            p.vertex(lines[i][0].x, lines[i][0].y);
            for (var j = 0; j < lines[i].length; j++) {
                p.curveVertex(lines[i][j].x, lines[i][j].y);
            }
            p.vertex(lines[i][lines[i].length - 1].x, lines[i][lines[i].length - 1].y);
            p.endShape();
        }

    };
}

export function savesvg() {
    let myp5 = new p5(sketch);
    myp5.type = "SVG"
    //myp5.draw();
    myp5.save("mySVG.svg",); // give file name
    myp5.remove();
}



//======================================================================================================
// GPU.jS STUFF
//======================================================================================================

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
}).setOutput([MAXPOINTS, MAXLINES])



//======================================================================================================
// VORONOI STUFF
//======================================================================================================


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
function trimlines2(l, b) {
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

    var min = 10;
    var fisc;
    for (var i = 0; i < b.length - 1; i++) {
        var isc = intersect_point(l[0], l[1], b[i], b[(i + 1)]);
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
// trim lines outside of shape.  P contains line (4 points), b contains border
//================================================================================================
function trimlines(l, b) {
    var p0_inside = inpath(l[0], b);
    var p1_inside = inpath(l[1], b);
    if (p0_inside && p1_inside) return l;  //  both lines are inside

    if (!p0_inside) {
        var min = 100;
        var fisc;
        for (var i = 0; i < b.length - 1; i++) {
            var isc = intersect_point(l[0], l[1], b[i], b[(i + 1)]);
            if (isc != null) {
                if (isc[2] < min) {
                    min = isc[2] // find closest one.  isc2 is Vdistance on p1-p2 line.
                    fisc = isc;
                }
            }
        }
        if (min <= 1) {  // if not, no valid intersection was found.        
            l[0].x = fisc[0];
            l[0].y = fisc[1];
        }
        else {
            return null;
        }
    }

    if (!p1_inside) {
        var min = 10;
        var fisc;
        for (var i = 0; i < b.length - 1; i++) {
            var isc = intersect_point(l[0], l[1], b[i], b[(i + 1)]);
            if (isc != null) {
                if (isc[2] < min) {
                    min = isc[2] // find closest one.  isc2 is Vdistance on p1-p2 line.
                    fisc = isc;
                }
            }
        }
        if (min <= 1) {  // if not, no valid intersection was found.        
            l[1].x = fisc[0];
            l[1].y = fisc[1];
        }
        else {
            /// console.log("trim:null")
            return null
                ;
        }
    }

    return l
}


//================================================================================================
//subdivides a path by inserting points between two adjacent points that are more than 2*maxd apart
// maxd=minimum Vdistance between points.  Actual will vary between maxd and 2*maxd.
//================================================================================================
function subdivpath(P, maxd, r, mxp) {
    var i = 0;
    var ready = false;
    if (P.length > mxp) return P;
    while (!ready) {
        var P1 = P[i];
        var P2 = P[i + 1];
        var D = Vdist(P1, P2);

        if (D > 2 * maxd) {  //.. Vdistance is too large, need to insert point(s)
            var numinserts = Math.floor((D - maxd) / maxd); // number of points to be inserted
            numinserts = 1;
            if (numinserts + P.length + 2 > mxp) numinserts = mxp - P.length - 2;
            var dx = (P2.x - P1.x) / (numinserts + 1);
            var dy = (P2.y - P1.y) / (numinserts + 1);
            for (var j = 1; j <= numinserts; j++) {
                var newpoint = new Vertex(
                    P1.x + dx * j + r * (Math.random() - 0.5),
                    P1.y + dy * j + r * (Math.random() - 0.5)
                );
                P.splice(i + j, 0, newpoint);  // insert point
            }
        }
        i++;
        ready = (i >= (P.length - 1));// || i > 20000);
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
        var f = force(Si, S[j], a1, 3);
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


function moveaway(S, p, V) {
    var ready = true
    var t = 0;
    for (var i = 0; i < S.length; i++) {
        var Q = attractionvector(S[i], S, p, V.a1, V.a2);
        t = Math.max(t, Math.sqrt((Q.x * Q.x) + (Q.y * Q.y)));
        S[i].x = S[i].x + Q.x * V.f;
        S[i].y = S[i].y + Q.y * V.f;
    }
    return (1000 * t < V.a)
}
//================================================================================================
// main function, spreads all th points within shape
// moves every point a fraction away from the closest neighbor
//================================================================================================
function evenly_spread(S, p, V) {
    var ready = true;
    //var avgVdist = even_spread_totalVdistance(S, p);
    ready = moveaway(S, p, V);





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
































//====================================================================================================
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
                if ((polys[i][0].x == p.x) && (polys[i][0].y == p.y) && (polys[i][1].x == q.x) && (polys[i][1].y == q.y)) Vadd = false;
                if ((polys[i][0].x == q.x) && (polys[i][0].y == q.y) && (polys[i][1].x == p.x) && (polys[i][1].y == p.y)) Vadd = false;
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
//deldupes
// Renders voronoi shape
//======================================================================================================

function issame(p1, p2) {
    var accuracy = 0.5;
    return ((Math.abs(p1.x - p2.x) < accuracy) && (Math.abs(p1.y - p2.y) < accuracy));
}

function deldupes(line) {
    var polys = [];
    for (var j = 0; j < line.length; j++) {
        var p = line[j][0];
        var q = line[j][1];
        var Vadd = true;  // only Vadd lines that do not exist yet
        var i = 0;
        while ((Vadd == true) && (i < polys.length)) {
            if (issame(polys[i][0], p) && issame(polys[i][1], q)) Vadd = false;
            if (issame(polys[i][0], q) && issame(polys[i][1], p)) Vadd = false;
            i++;
        }
        if (Vadd) {
            var l = new Array();
            l[0] = new Vertex(p.x, p.y);
            l[1] = new Vertex(q.x, q.y);
            polys[polys.length] = l;
        }
    }
    console.log("Deldupes: from ", line.length, " to ", polys.length);
    return polys;
}

//======================================================================================================
// draw the path defined by P
//======================================================================================================
function showpath(P, l) {
    var points = P.getPoints();
    for (var k = 1; k < points.length; k++) {
        var x1 = (points[k - 1].x);
        var y1 = (points[k - 1].y);
        var x2 = (points[k].x);
        var y2 = (points[k].y);
        if (l) line(x1, y1, x2, y2);
        else point(x1, y1);
        // console.log(x1, y1, x2, y2);
    }
}

function drawlines(P, l) {
    //noFill();
    for (var i = 0; i < P.length; i++) {
        if (l >= 1) {
            beginShape();
        }
        for (var j = 0; j < P[i].length - 1; j++) {
            if (l >= 1) {
                vertex(P[i][j].x, P[i][j].y);
            }
            else {
                point(P[i][j].x, P[i][j].y);
            }
            if (l > 1) {
                circle(P[i][j].x, P[i][j].y, l)
            }
        }
        if (l >= 1) {
            vertex(P[i][P[i].length - 1].x, P[i][P[i].length - 1].y);
            endShape();
        }
    }
}

//=================================================================
/*

X
0    \    1    \    2    \    3   \    4   \    5   \   6   \   7   \   8   \   9    \
len      wei        x         y       x       y       x        y       x        y    
4        2          1         0        2       1       3       1       4        3     \\


0    \    1    \    2    \    3   \    4   \    5   \   6   \   7   \   8   \   9    \   10    \   11   \
len      wei        si       ei        x         y       x       y       x        y       x        y    
4        2          0        0         1         0        2       1       3       1       4        3     \\

ei = end index of lines with similar coordinates.
si = start index

si=-1 : don't move start point
si=-2:  move this point as if it were a normal point. there can be only one si<0 for all poitns that have same x,y coordinates.
si>=0: index of point that drives the move (that has si<0)

*/

//======================================================================================================
const GPU_movepoints = gpu.createKernel(function (_matrix, fa, fb, pwr1, pwr2, fc, d1, sp, fmax, mxl, numpoints) {
    var CP = _matrix[this.thread.y][this.thread.x] // current point
    var row = this.thread.y;
    if (this.thread.x == 0) return CP;  // x=: length     - no calculation required
    if (this.thread.x == 1) return CP;  // x=1: weight     - no calculation required
    if (this.thread.x == 2) return CP;  // x=2: dont change si
    if (this.thread.x == 3) return CP;  // x=3: dont change ei
    var si = _matrix[row][2];  // start index
    var ei = _matrix[row][3];  // end index

    var isfirstpoint = ((this.thread.x == 4) || (this.thread.x == 5));
    if (isfirstpoint && (si == -1)) return CP;  // x=3: dont change first point  x    
    var line_numpoints = _matrix[row][0];
    var islastpoint = (this.thread.x > (line_numpoints * 2 + 1))

    var weight = _matrix[row][1];
    if (islastpoint && (ei == -1)) return CP;  // x=3: dont change last point  y


    if (si > 0) {
        return _matrix[si][this.thread.x]   // return same point as
    }

    if (ei > 0) {
        return _matrix[ei][this.thread.x]   // return same point as
    }

    if (line_numpoints == 0) return CP;;  // empty row
    if (weight <= 0) return CP;  // weight=0, dont move point

    if (si > 0) {
        return _matrix[si][this.thread.x]   // return same point as
    }

    if (ei > 0) {
        return _matrix[ei][this.thread.x]   // return same point as
    }

    var p2 = [0.0, 0.0];
    var Dist = 0.0;
    var V = [0.0, 0.0]; // direction vector    
    var Fa = [0.0, 0.0]; //force to neightbor points: attract
    var Fb = [0.0, 0.0]; //force to other point: repulse
    var even = true;
    var xindex = this.thread.x;
    var yindex = this.thread.x + 1;
    if (this.thread.x % 2 != 0) {  // odd values
        xindex = this.thread.x - 1;
        yindex = this.thread.x;
        even = false;
    }


    // contraction

    // current point
    var p1 = [_matrix[row][xindex], _matrix[row][yindex]]

    if (!(isfirstpoint || islastpoint)) {

        // average between neighbors
        var pa = [0.0, 0.0]; //: difference vector towards average of neighbor points
        pa[0] = (_matrix[row][xindex - 2] + _matrix[row][xindex + 2]) / 2 - p1[0];
        pa[1] = (_matrix[row][yindex - 2] + _matrix[row][yindex + 2]) / 2 - p1[1];
        var pad = Math.sqrt(pa[0] * pa[0] + pa[1] * pa[1]);  // distance
        // move to point in-between neighborhood points.   attraction force: dist^3
        /*    
            Fa[0] = pa[0] * Math.pow(pad, pwr1) * fa;
            Fa[1] = pa[1] * Math.pow(pad, pwr1) * fa;
        */
        Fa[0] = pa[0] * Math.pow(pad, pwr1) * fa;
        Fa[1] = pa[1] * Math.pow(pad, pwr1) * fa;
    }





    // repulsion force to all other points
    for (var i = 0; i < mxl + 1; i++) {
        if (_matrix[i][0] > 0) {
            var w = Math.abs(_matrix[i][1]);// weight factor of that row
            w = 1;  // override for debugging purposes
            for (var j = 0; j < _matrix[i][0]; j++) {

                p2[0] = p1[0] - _matrix[i][j * 2 + 2];   // vector to point 
                p2[1] = p1[1] - _matrix[i][j * 2 + 3];   // vector to point point to review
                Dist = Math.sqrt(p2[0] * p2[0] + p2[1] * p2[1]);  // distance between points                                
                if (Dist > 0) {
                    if (Dist < d1) {  // less than repulsion radius
                        var strength = Math.pow((d1 - Dist) / d1, pwr2);
                        Fb[0] += p2[0] * w * strength * fb;
                        Fb[1] += p2[1] * w * strength * fb;

                        //Fb[0] *= 1000;
                        //Fb[1] *= 1000;
                    }
                    /*
                    if (Dist < d1 * 2) {  // less than repulsion radius                        
                        p2 = [p2[0] / Dist, p2[1] / Dist];   // scale vector t0 length 1
                        Dist = Dist - d1;
                        if (Dist > 0) {
                            var strength = 1 / Math.pow(Math.abs(Dist), pwr2);
                            Fb[0] += p2[0] * w * strength * fc;
                            Fb[1] += p2[1] * w * strength * fc;
                        }
                    }
                    */
                }


            };
        }
    }

    // limit force if > fmax
    var Ftot = [Fa[0] + Fb[0], Fa[1] + Fb[1]];


    var scale = 1;
    var fm = Math.sqrt(Ftot[0] * Ftot[0] + Ftot[1] * Ftot[1]);
    if (fm > fmax)
        scale = fmax / fm;

    p1[0] += Ftot[0] * sp * scale;
    p1[1] += Ftot[1] * sp * scale;

    if (even) {
        return p1[0]
    } else {
        return p1[1]
    }

}).setOutput([GPUMATRIXLENGTH, MAXLINES])

// adds a single line to the GPU matrix
function add_line_to_gpumatrix(line, offset, w, si, ei) {
    var mx = line.length;
    if (line.length > MAXPOINTS) {
        console.log("maxpoints TOO SMALL", line.length, MAXPOINTS);
        mx = MAXPOINTS;
    }
    GPUmatrix[offset][0] = mx;
    GPUmatrix[offset][1] = w;
    GPUmatrix[offset][2] = si;   // start index; used to move start points of lines.  if 0: don't move start point.
    GPUmatrix[offset][3] = ei;  // if 0, dont' move end point
    for (var j = 0; j < mx; j++) {
        GPUmatrix[offset][j * 2 + 4] = line[j].x;
        GPUmatrix[offset][j * 2 + 5] = line[j].y;
    }
    return mx;
}
// adds multiple lines to the GPU matrix
function add_lines_to_gpumatrix(lines, offset, w) {
    var np = 0;
    var count = lines.length;
    if (count + offset > MAXLINES) {
        console.log("maxlines TOO SMALL", lines.length, MAXLINES);
        count = MAXLINES - offset;
    }
    if (count > 0) {
        var si = [];
        var ei = [];
        for (var i = 0; i < count; i++) {
            var ie = lines[i].length - 1;
            si[i] = -1;;
            ei[i] = -1;;
            if (VData.movejoints) {
                var psi = new Vertex(lines[i][0].x, lines[i][0].y);
                var pei = new Vertex(lines[i][ie].x, lines[i][ie].y);
                for (var j = 0; j < count; j++) {
                    if (j != i) {
                        var je = lines[j].length - 1;
                        var psj = new Vertex(lines[j][0].x, lines[j][0].y);
                        var pej = new Vertex(lines[j][je].x, lines[j][je].y);
                        if (issame(psi, psj)) {
                            si[j] = 0;
                            si[i] = 0;
                        }
                        if (issame(pei, pej)) {
                            ei[j] = 0;
                            ei[i] = 0;
                        }
                        if (issame(psi, pej)) {  // line with same start points
                            ei[j] = 0;
                            si[i] = 0;
                        }
                        if (issame(pei, psj)) {  // line with same start points
                            si[j] = 0;
                            ei[i] = 0;
                        }
                    }
                }
            }
        }

        for (var i = 0; i < count; i++) {
            var io = i + offset;
            np += add_line_to_gpumatrix(lines[i], io, w, si[i], ei[i]);
        }
    }
    return np;
}

function get_lines_from_gpumatrix(offset) {
    lines = []
    for (var i = 0; i < MAXLINES; i++) {
        var linelength = GPUmatrix[i + offset][0];
        if (linelength == 0) return lines;
        lines[i] = new Array();
        for (var j = 0; j < linelength; j++) {
            lines[i][j] = new Vertex(GPUmatrix[i + offset][j * 2 + 4], GPUmatrix[i + offset][j * 2 + 5]);
        }
    }
    return lines;
}

function get_line_count_from_gpumatrix(G) {
    for (var i = 0; i < MAXLINES; i++) {
        var linelength = G[i][0];
        if (linelength == 0) return i;
    }
    return i;
}

var linelengthcheck = [];

function readlinelengths() {
    for (var i = 0; i < lines.length; i++) {
        linelengthcheck[i] = lines[i].length;
    }
}

function readlinelengthcheck() {
    for (var i = 0; i < lines.length; i++) {
        if (linelengthcheck[i] != lines[i].length) {
            console.log("Line length: ", i, " expexted ", linelengthcheck[i], "got", lines[i].length);
        };
    }
}


function processGPU() {
    var numpoints = add_line_to_gpumatrix(borderpoints, 0, -VData.edgeforce);

    numpoints += add_lines_to_gpumatrix(lines, 1, 1);
    GPUmatrix = GPU_movepoints(
        GPUmatrix,
        VData.forcetonext,
        VData.forcetopoints,
        VData.power1,
        VData.power2,
        VData.fc,
        VData.d1,
        VData.speed,
        VData.fmax,
        min(lines.length + 1, MAXLINES),
        numpoints);
    lines = get_lines_from_gpumatrix(1);

}
//=============================================================================================================//=============================================================================================================
//=============================================================================================================//=============================================================================================================
//=============================================================================================================//=============================================================================================================

function mouseover(P, d) {
    return (mouseX > P.x - d && mouseX < P.x + d && mouseY > P.y - d && mouseY < P.y + d);
}
//=============================================================================================================
export function draw() {
    //clear();    /// clears the canvas.  if not done this, all original shapoes will remain., 
    if (borderloaded) {
        background(0);
        stroke('#FFFFFF');
        showpath(border, false);
        switch (STAGE) {
            //-----------------------------------------------------------------------------------------
            case stageEnum.idle: {

            }
                break;
            //-----------------------------------------------------------------------------------------
            case stageEnum.voronoi_auto:
                {
                    V_Check(width, height, border);
                    if (evenly_spread(seeds, borderpoints, VData)) {
                        while (V_Check(width, height, border) > 0);  // make sure all points are within shape!
                        STAGE = stageEnum.voronoi_show
                    }
                }
            // fall through
            case stageEnum.voronoi_show: {
                stroke('#00FF00');
                noFill();
                vlines = voronoi_render(borderpoints);
                drawlines(vlines, 1);
                for (var i = 0; i < seeds.length; i++) {
                    stroke('#FF0000');
                    fill('#000000');
                    if (mouseover(seeds[i], mousebox)) {
                        fill('#FFFFFF');
                        if (mouseIsPressed) {
                            mousebox = mouseboxEnum.large;
                            seeds[i].x = mouseX;
                            seeds[i].y = mouseY;
                            fill('#0000FF');
                        }
                        else {
                            mousebox = mouseboxEnum.small;
                        }
                    }
                    circle(seeds[i].x, seeds[i].y, 10);
                }
            }
                break;
            //-----------------------------------------------------------------------------------------
            case stageEnum.diffgrowthstart: {

            }
                break;
            //-----------------------------------------------------------------------------------------
            case stageEnum.diffgrowth: {
                processGPU();
                //  lines = diffgrowth(lines, 100, 100, 10000, borderpoints, 1);
                //   readlinelengths();
                for (var i = 0; i < lines.length; i++) {
                    lines[i] = subdivpath(lines[i], VData.d2, 2, MAXPOINTS);
                }
                //   readlinelengthcheck();
                noFill();
                if (VData.showcircles) {
                    drawlines(lines, VData.d1);;
                }
                else {
                    drawlines(lines, 1);;
                }
            }
                break;
            //-----------------------------------------------------------------------------------------

        }

    }

}