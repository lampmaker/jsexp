// geometry through gui
import { SVGLoader } from '/js/three/SVGLoader.js';
import * as THREE from '/js/three/three.module.js';
var csimplify, cfilename, svgDocument;
var canvasWidth, canvasHeight;
//========================================================================================================
//========================================================================================================

export function init(size_w, size_h) {
    var canvasQ = $('#myCanvas');
    canvasWidth = canvasQ.width();
    canvasHeight = canvasQ.height();
    canvasQ.width(size_w);
    canvasQ.height(size_h);
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


export function loadSVG(url, fn) {
    cfilename = fn;
    var loader = new SVGLoader();

    console.log('OPENING SVG');
    loader.load(url, function (data) {
        var SVGdata = data.paths;
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
        //svgDocument.appendChild(data);
    });
}
//========================================================================================================