
export function setup() {

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

export function draw() {

}

window.setup = setup;
window.draw = draw;