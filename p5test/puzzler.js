import * as THREE from '/three.module.js';
import { SVGLoader } from '/SVGLoader.js';
//======================================================================================================
// VORONOI STUFF
//======================================================================================================
var seeds;
var border, borderpoints;
var borderloaded = false;
//======================================================================================================
function Vertex(x, y) {
    this.x = x;
    this.y = y;
}
function Vline(x1,y1,x2,y2){
    this.x1=x1;
    this.y1=y1;
    this.x2=x2;
    this.y2=y2;
}


//======================================================================================================
// true if pint x,y is in shapepath
//======================================================================================================
function inpath(x, y, vs) {
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x,
            yi = vs[i].y;
        var xj = vs[j].x,
            yj = vs[j].y;
        var intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
//
function dist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}

//================================================================================================
function intersect_point(point1, point2, point3, point4) {
    var ua = ((point4.x - point3.x) * (point1.y - point3.y) - (point4.y - point3.y) * (point1.x - point3.x)) /
        ((point4.y - point3.y) * (point2.x - point1.x) - (point4.x - point3.x) * (point2.y - point1.y));

    var ub = ((point2.x - point1.x) * (point1.y - point3.y) -
        (point2.y - point1.y) * (point1.x - point3.x)) /
        ((point4.y - point3.y) * (point2.x - point1.x) -
            (point4.y - point3.x) * (point2.y - point1.y));
    var x = point1.x + ua * (point2.x - point1.x);
    var y = point1.y + ua * (point2.y - point1.y);
    return [x, y, ua, ub]
}




//================================================================================================
// trim lines outside of shape.  P contains line (4 points), b contains border
//================================================================================================
function trimlines(l, b) {
    var p1=inpath(l.x1,l.y1,b);
    var p2=inpath(l.x2,l.y2,b);
    if ( p1 && p2) return l;  //  both lines are inside
    if ( !p1 && !p2) return null;  // both lines are outside
/*
                var p2 = cell[(lines + 1) % cell.length]
                var q1, q2;
                var i = 0;
                var isc = [0, 0, -1, -1];
                while (!((isc[2] > 0) && (isc[2] < 1) && (isc[3] > 0) && (isc[3] < 1)) && (i < b.length)) {   // FIND POINTS WHERE UA IS BETWEEN 0 AND 1
                    var q1 = b[i]
                    var q2 = b[((i + 1) % b.length)];
                    isc = intersect_point(q1, q2, p1, p2);
                    i++;
                }
*/
return l;
}





//================================================================================================
// VORONOI - Distributepoints evenly within shape
// calculate average between points.   Need to lower in order to distribute more evenly
//================================================================================================
function even_spread_totaldistance(S, p) {
    var TD = 0;
    var mi = 10000000000000;
    for (var i = 0; i < S.length; i++) {
        var mind = 10000000000;
        for (var j = 0; j < S.length; j++) {
            if (j != i) {
                var D = dist(S[i], S[j]);
                if (D < mind) mind = D;
            }
        }
        for (var j = 0; j < p.length; j++) {
            var D = dist(S[i], p[j]) * 3;
            if (D < mind) mind = D;
        }
        TD = TD + mind;
        if (mind < mi) mi = mind;
    }
    return { avg: TD / S.length, min: mi };
}
// moves every point a fraction away from the closest neighbor
function moveaway(S, p, fraction, a) {
    for (var i = 0; i < S.length; i++) {
        var closestdistance = 100000000;
        var dx, dy
        for (var j = 0; j < S.length; j++) {        // compare to other seeds
            if (j != i) {
                var D = dist(S[i], S[j]);
                if (D < closestdistance) {
                    closestdistance = D;
                    dx = (S[j].x - S[i].x);
                    dy = (S[j].y - S[i].y);
                }
            }
        }
        for (var j = 0; j < p.length; j++) {    // compare with border
            var D = dist(S[i], p[j]) * 3;
            if (D < closestdistance) {
                closestdistance = D;
                dx = (p[j].x - S[i].x);
                dy = (p[j].y - S[i].y);
            }
        }
        if (closestdistance < a * 0.99) {
            S[i].x = S[i].x - dx * fraction;
            S[i].y = S[i].y - dy * fraction;
        }
    }
}
// main function, spreads all teh points within shape
function evenly_spread(S, p) {
    for (var i = 0; i < 1; i++) {
        for (var j = 0; j < S.length; j++) {
            point(S[j].x, S[j].y);
        }
        var avgdist = even_spread_totaldistance(S, p);
        //    console.log(avgdist);
        moveaway(S, p, 0.05, avgdist.avg);
    }
}

//======================================================================================================
//VORONOI
//adds[count] random points within range[size_w, size_h] and within shape defined by[path]
//======================================================================================================
function add_random(count, size_w, size_h, path) {
    var n = 0
    while (n < count) {
        var x = Math.random() * size_w;
        var y = Math.random() * size_h
        if (path == null) {
            seeds[seeds.length] = { x, y };
            n++
        }
        else {
            if (inpath(x, y, path.getPoints())) {
                seeds[seeds.length] = { x, y };
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
    add_random(100, width, height, border);
}
//======================================================================================================
//VORONOI
// Renders voronoi shape
//======================================================================================================
function voronoi_render(b) {
    var bbox = { xl: 0, xr: width, yt: 0, yb: height };
    var voronoi = new Voronoi();
    var result = voronoi.compute(seeds, bbox);
    var polys = new Array();


    for (var cell = 0; cell < result.cells.length; cell++) {       
        for (var edge = 0; edge < result.cells[cell].halfedges.length - 1; edge++) {
            var p=result.cells[cell].halfedges[edge].getStartpoint();            
            var q=result.cells[cell].halfedges[edge].getEndpoint();
            if (q==null || p==null) {
                console.log("error", cell, edge)
            }
            var add=true;  // only add lines that do not exist yet
            var i=0;
            while( (add==true) && (i<polys.length)){
                if((polys[i].x1==p.x)&&(polys[i].y1==p.y)&&(polys[i].x2==q.x)&&(polys[i].y2==q.y)) add=false;
                i++;
            }            
            
            if (add){                
                var l=new Vline(p.x,p.y,q.x,q.y);
                if (b != null) l=trimlines(l, b);
                if (l!= null){
                    polys[polys.length]=l;
                    line(p.x,p.y,q.x,q.y);
                }
            }
        }
    }

/*

    // Convert to polygon array
    for (var cell = 0; cell < result.cells.length; cell++) {
        polys[cell] = new Array();
        polys[cell][0] = new Vertex(
            result.cells[cell].halfedges[0].getStartpoint().x,
            result.cells[cell].halfedges[0].getStartpoint().y
        )
        for (var edge = 0; edge < result.cells[cell].halfedges.length - 1; edge++) {
            polys[cell][edge + 1] = new Vertex(
                result.cells[cell].halfedges[edge].getEndpoint().x,
                result.cells[cell].halfedges[edge].getEndpoint().y
            )
        }
    }

    for (var poly = 0; poly < polys.length; poly++) {
        for (var v = 1; v < polys[poly].length; v++) {
            line(polys[poly][v - 1].x, polys[poly][v - 1].y, polys[poly][v].x, polys[poly][v].y)
        }
    }
    */
    
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
        line(x1, y1, x2, y2);
        // console.log(x1, y1, x2, y2);
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
        var points = SVGdata[0].subPaths[0].getPoints();
        for (var k = 0; k < points.length; k++) {
            var x1 = (points[k].x - x0) * scale + mx / 2;
            var y1 = (points[k].y - y0) * scale + my / 2;
            border.lineTo(x1, y1);
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
    createCanvas(1000, 1000);
    background(220);
    stroke('#000000');
    border = new THREE.Path;
    loadsvg(1000, 1000);
    //imageMode(CENTER);
    //mySvg.resize(1000, 0);

    //image(mySvg, width / 2, height / 2);

}

export function draw() {
    if (borderloaded) {
        background(220);
        showpath(border)
        evenly_spread(seeds, borderpoints);
        voronoi_render(borderpoints);
    }

}

window.preload = preload
window.setup = setup;
window.draw = draw;