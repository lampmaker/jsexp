//======================================================================================================
// VORONOI STUFF
//======================================================================================================
var seeds;

function add_random(count, size_w, size_h) {
    for (var n = 0; n < count; n++) {
        seeds[seeds.length] = { x: Math.random() * size_w, y: Math.random() * size_h };
    }
}

function Vertex(x, y) {
    this.x = x;
    this.y = y;
}





function voronoi_setup() {
    seeds = new Array();
    add_random(90, width, height);

}

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
    mySvg = loadImage("beer.svg");
}

export function setup() {
    example2_setup();
    createCanvas(1000, 1000);
    background(200);
    stroke('#000000');
    voronoi_setup();
    voronoi_render();
}

export function draw() {

}

window.preload = preload
window.setup = setup;
window.draw = draw;