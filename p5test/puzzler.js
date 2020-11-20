import * as THREE from '/three.module.js';
import { SVGLoader } from '/SVGLoader.js';
//======================================================================================================
// VORONOI STUFF
//======================================================================================================
var seeds;
var border;
//======================================================================================================
function Vertex(x, y) {
    this.x = x;
    this.y = y;
}


//======================================================================================================
// true if pint x,y is in shapepath
//======================================================================================================
function inpath(x, y, shapepath) {
    var vs = shapepath.getPoints();
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

function dist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}
//================================================================================================
// calculate average between points.   Need to lower in order to distribute more evenly
//================================================================================================

function even_spread_totaldistance(S) {
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
        TD = TD + mind;
        if (mind < mi) mi = mind;
    }
    return { avg: TD / S.length, min: mi };
}

// moves every point a fraction away from the closest neighbor
function moveaway(S, fraction, a) {
    for (var i = 0; i < S.length; i++) {
        var closestindex = 0;
        var closestdistance = 100000000;
        for (var j = 0; j < S.length; j++) {
            if (j != i) {
                var D = dist(S[i], S[j]);
                if (D < closestdistance) {
                    closestdistance = D;
                    closestindex = j
                }
            }
        }
        if (closestdistance < a * 0.9) {
            var dx = (S[closestindex].x - S[i].x);
            var dy = (S[closestindex].y - S[i].y);
            S[i].x = S[i].x - dx * fraction;
            S[i].y = S[i].y - dy * fraction;
        }

    }
}


function evenly_spread(S) {
    for (var i = 0; i < 30; i++) {
        for (var j = 0; j < S.length; j++) {
            point(S[j].x, S[j].y);
        }
        var avgdist = even_spread_totaldistance(S);
        console.log(avgdist);
        moveaway(S, 0.2, avgdist.avg);
    }
}


//======================================================================================================
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
            if (inpath(x, y, border)) {
                seeds[seeds.length] = { x, y };
                n++
            }
        }
    }
}
//======================================================================================================
//======================================================================================================
function voronoi_setup() {
    seeds = new Array();
    add_random(150, width, height, border);
    var TD = even_spread_totaldistance(seeds);
    console.log(TD);
    evenly_spread(seeds);

}
//======================================================================================================
//======================================================================================================
function voronoi_render() {
    var size_factor = 0.05;
    var edge_factor = 0.05;
    var join_factor = 0.1;

    var bbox = { xl: 0, xr: width, yt: 0, yb: height };
    var voronoi = new Voronoi();
    var result = voronoi.compute(seeds, bbox);
    var polys = new Array();

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

}
//======================================================================================================
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
        var points = border.getPoints();
        showpath(border)
        voronoi_setup();
        voronoi_render();
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

}

window.preload = preload
window.setup = setup;
window.draw = draw;