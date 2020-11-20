// geometry through gui

var csimplify;
//========================================================================================================
//========================================================================================================

export function loadSVG(url, fn) {
    filename = fn;
    var loader = new SVGLoader();
    var old = Scene.getObjectByName('SVG');
    Scene.remove(old);
    console.log('OPENING SVG');
    loader.load(url, function (data) {
        SVGdata = data.paths;
        var path = new THREE.ShapePath();
        for (var i = 0; i < SVGdata.length; i++) {
            for (var j = 0; j < SVGdata[i].subPaths.length; j++) {
                if (csimplify > 0) {
                    var points = SVGdata[i].subPaths[j].getPoints();
                    var spoints = simplify(points, points, csimplify)
                    if (j == 0) {
                        console.log(points);
                        console.log(spoints);
                    }
                    var sb = new THREE.Path(spoints);
                    path.subPaths.push(sb);
                }
                else {
                    path.subPaths.push(SVGdata[i].subPaths[j]);
                }
            }
        }
        console.log('path', path);
        var shapes = path.toShapes(true, false);
        console.log('shape', shapes);
    });
}
//========================================================================================================