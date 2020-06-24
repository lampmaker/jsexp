function createGUI() {
    if ( gui ) gui.destroy();
    gui = new GUI( { width: 350 } );
    gui.add( guiData, 'currentURL', {
        "Tiger": 'models/svg/tiger.svg',
        "Three.js": 'models/svg/threejs.svg',
        "Joins and caps": 'models/svg/lineJoinsAndCaps.svg',
        "Hexagon": 'models/svg/hexagon.svg',
        "Test 1": 'models/svg/tests/1.svg',
        "Test 2": 'models/svg/tests/2.svg',
        "Test 3": 'models/svg/tests/3.svg',
        "Test 4": 'models/svg/tests/4.svg',
        "Test 5": 'models/svg/tests/5.svg',
        "Test 6": 'models/svg/tests/6.svg',
        "Test 7": 'models/svg/tests/7.svg',
        "kaboom": 'models/svg/sample.svg',
        "Units": 'models/svg/tests/units.svg'
    } ).name( 'SVG File' ).onChange( update );
    gui.add( guiData, 'drawStrokes' ).name( 'Draw strokes' ).onChange( update );
    gui.add( guiData, 'drawFillShapes' ).name( 'Draw fill shapes' ).onChange( update );
    gui.add( guiData, 'strokesWireframe' ).name( 'Wireframe strokes' ).onChange( update );
    gui.add( guiData, 'fillShapesWireframe' ).name( 'Wireframe fill shapes' ).onChange( update );

    function update() {
        loadSVG( guiData.currentURL );
    }
    

        import * as THREE from '../three.module.js';
        import Stats from './stats.module.js';
        import { GUI } from './dat.gui.module.js';
        import { OrbitControls } from './OrbitControls.js';
        import { SVGLoader } from './SVGLoader.js';

        var renderer, stats, scene, camera, gui, guiData;

        init();
        animate();

        //

        function init() {
            var container = document.getElementById( 'container' );

            //
            camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
            camera.position.set( 0, 0, 200 );
            //
            renderer = new THREE.WebGLRenderer( { antialias: true } );
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( window.innerWidth, window.innerHeight );
            container.appendChild( renderer.domElement );
        //

            var controls = new OrbitControls( camera, renderer.domElement );
            controls.screenSpacePanning = true;
            //
            stats = new Stats();
            container.appendChild( stats.dom );

        //
            window.addEventListener( 'resize', onWindowResize, false );

            guiData = {
                currentURL: 'models/svg/sample.svg',
                drawFillShapes: true,
                drawStrokes: true,
                fillShapesWireframe: false,
                strokesWireframe: false
            };

            loadSVG( guiData.currentURL );

            createGUI();

        }


        function loadSVG( url ) {
        //
            scene = new THREE.Scene();
            scene.background = new THREE.Color( 0xb0b0b0 );
            //
            var helper = new THREE.GridHelper( 160, 10 );
            helper.rotation.x = Math.PI / 2;
            scene.add( helper );
            //

            var loader = new SVGLoader();
            loader.load( url, function ( data ) {
                var paths = data.paths;
                var group = new THREE.Group();
                group.scale.multiplyScalar( 0.25 );
                group.position.x = -50;//- 70;
                group.position.y = -50;//70;
                group.scale.y *= - 1;

                for ( var i = 0; i < paths.length; i ++ ) {

                    var path = paths[ i ];

                    var fillColor = path.userData.style.fill;

                    if ( guiData.drawFillShapes){//} && fillColor !== undefined && fillColor !== 'none' ) {

                        var material = new THREE.MeshBasicMaterial( {
                            color: new THREE.Color().setStyle( fillColor ),
                            opacity: path.userData.style.fillOpacity,
                            transparent: path.userData.style.fillOpacity < 1,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            wireframe: guiData.fillShapesWireframe
                        } );

                        var shapes = path.toShapes( true );

                        for ( var j = 0; j < shapes.length; j ++ ) {

                            var shape = shapes[ j ];

                            var geometry = new THREE.ShapeBufferGeometry( shape );
                            var mesh = new THREE.Mesh( geometry, material );
                            group.add( mesh );

                        }

                    }

                    

                    var strokeColor = path.userData.style.stroke;

                    if ( guiData.drawStrokes && strokeColor !== undefined && strokeColor !== 'none' ) {

                        var material = new THREE.MeshBasicMaterial( {
                            color: new THREE.Color().setStyle( strokeColor ),
                            opacity: path.userData.style.strokeOpacity,
                            transparent: path.userData.style.strokeOpacity < 1,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            wireframe: guiData.strokesWireframe
                        } );

                        for ( var j = 0, jl = path.subPaths.length; j < jl; j ++ ) {

                            var subPath = path.subPaths[ j ];

                            var geometry = SVGLoader.pointsToStroke( subPath.getPoints(), path.userData.style );

                            if ( geometry ) {

                                var mesh = new THREE.Mesh( geometry, material );

                                group.add( mesh );

                            }

                        }

                    }

                }

                scene.add( group );

            } );

        }

        function onWindowResize() {

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        function animate() {

            requestAnimationFrame( animate );

            render();
            stats.update();

        }

        function render() {

            renderer.render( scene, camera );

        }

    
}