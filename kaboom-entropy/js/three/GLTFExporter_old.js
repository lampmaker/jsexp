var WEBGL_CONSTANTS = {
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703
};
var THREE_TO_WEBGL = {
    1003: WEBGL_CONSTANTS.NEAREST,
    1004: WEBGL_CONSTANTS.NEAREST_MIPMAP_NEAREST,
    1005: WEBGL_CONSTANTS.NEAREST_MIPMAP_LINEAR,
    1006: WEBGL_CONSTANTS.LINEAR,
    1007: WEBGL_CONSTANTS.LINEAR_MIPMAP_NEAREST,
    1008: WEBGL_CONSTANTS.LINEAR_MIPMAP_LINEAR
};
var PATH_PROPERTIES = {
    scale: 'scale',
    position: 'translation',
    quaternion: 'rotation',
    morphTargetInfluences: 'weights'
};
THREE.GLTFExporter = function() {}
;
THREE.GLTFExporter.prototype = {
    constructor: THREE.GLTFExporter,
    parse: function(input, onDone, options) {
        var DEFAULT_OPTIONS = {
            binary: false,
            trs: false,
            onlyVisible: true,
            truncateDrawRange: true,
            embedImages: true,
            animations: [],
            forceIndices: false,
            forcePowerOfTwoTextures: false
        };
        options = Object.assign({}, DEFAULT_OPTIONS, options);
        if (options.animations.length > 0) {
            options.trs = true;
        }
        var outputJSON = {
            asset: {
                version: "2.0",
                generator: "THREE.GLTFExporter"
            }
        };
        var byteOffset = 0;
        var buffers = [];
        var pending = [];
        var nodeMap = new Map();
        var skins = [];
        var extensionsUsed = {};
        var cachedData = {
            attributes: new Map(),
            materials: new Map(),
            textures: new Map(),
            images: new Map()
        };
        var cachedCanvas;
        function equalArray(array1, array2) {
            return (array1.length === array2.length) && array1.every(function(element, index) {
                return element === array2[index];
            });
        }
        function stringToArrayBuffer(text) {
            if (window.TextEncoder !== undefined) {
                return new TextEncoder().encode(text).buffer;
            }
            var array = new Uint8Array(new ArrayBuffer(text.length));
            for (var i = 0, il = text.length; i < il; i++) {
                var value = text.charCodeAt(i);
                array[i] = value > 0xFF ? 0x20 : value;
            }
            return array.buffer;
        }
        function getMinMax(attribute, start, count) {
            var output = {
                min: new Array(attribute.itemSize).fill(Number.POSITIVE_INFINITY),
                max: new Array(attribute.itemSize).fill(Number.NEGATIVE_INFINITY)
            };
            for (var i = start; i < start + count; i++) {
                for (var a = 0; a < attribute.itemSize; a++) {
                    var value = attribute.array[i * attribute.itemSize + a];
                    output.min[a] = Math.min(output.min[a], value);
                    output.max[a] = Math.max(output.max[a], value);
                }
            }
            return output;
        }
        function isPowerOfTwo(image) {
            return THREE.Math.isPowerOfTwo(image.width) && THREE.Math.isPowerOfTwo(image.height);
        }
        function isNormalizedNormalAttribute(normal) {
            if (cachedData.attributes.has(normal)) {
                return false;
            }
            var v = new THREE.Vector3();
            for (var i = 0, il = normal.count; i < il; i++) {
                if (Math.abs(v.fromArray(normal.array, i * 3).length() - 1.0) > 0.0005)
                    return false;
            }
            return true;
        }
        function createNormalizedNormalAttribute(normal) {
            if (cachedData.attributes.has(normal)) {
                return cachedData.textures.get(normal);
            }
            var attribute = normal.clone();
            var v = new THREE.Vector3();
            for (var i = 0, il = attribute.count; i < il; i++) {
                v.fromArray(attribute.array, i * 3);
                if (v.x === 0 && v.y === 0 && v.z === 0) {
                    v.setX(1.0);
                } else {
                    v.normalize();
                }
                v.toArray(attribute.array, i * 3);
            }
            cachedData.attributes.set(normal, attribute);
            return attribute;
        }
        function getPaddedBufferSize(bufferSize) {
            return Math.ceil(bufferSize / 4) * 4;
        }
        function getPaddedArrayBuffer(arrayBuffer, paddingByte) {
            paddingByte = paddingByte || 0;
            var paddedLength = getPaddedBufferSize(arrayBuffer.byteLength);
            if (paddedLength !== arrayBuffer.byteLength) {
                var array = new Uint8Array(paddedLength);
                array.set(new Uint8Array(arrayBuffer));
                if (paddingByte !== 0) {
                    for (var i = arrayBuffer.byteLength; i < paddedLength; i++) {
                        array[i] = paddingByte;
                    }
                }
                return array.buffer;
            }
            return arrayBuffer;
        }
        function serializeUserData(object) {
            try {
                return JSON.parse(JSON.stringify(object.userData));
            } catch (error) {
                console.warn('THREE.GLTFExporter: userData of \'' + object.name + '\' ' + 'won\'t be serialized because of JSON.stringify error - ' + error.message);
                return {};
            }
        }
        function processBuffer(buffer) {
            if (!outputJSON.buffers) {
                outputJSON.buffers = [{
                    byteLength: 0
                }];
            }
            buffers.push(buffer);
            return 0;
        }
        function processBufferView(attribute, componentType, start, count, target) {
            if (!outputJSON.bufferViews) {
                outputJSON.bufferViews = [];
            }
            var componentSize;
            if (componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE) {
                componentSize = 1;
            } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
                componentSize = 2;
            } else {
                componentSize = 4;
            }
            var byteLength = getPaddedBufferSize(count * attribute.itemSize * componentSize);
            var dataView = new DataView(new ArrayBuffer(byteLength));
            var offset = 0;
            for (var i = start; i < start + count; i++) {
                for (var a = 0; a < attribute.itemSize; a++) {
                    var value = attribute.array[i * attribute.itemSize + a];
                    if (componentType === WEBGL_CONSTANTS.FLOAT) {
                        dataView.setFloat32(offset, value, true);
                    } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_INT) {
                        dataView.setUint32(offset, value, true);
                    } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
                        dataView.setUint16(offset, value, true);
                    } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE) {
                        dataView.setUint8(offset, value);
                    }
                    offset += componentSize;
                }
            }
            var gltfBufferView = {
                buffer: processBuffer(dataView.buffer),
                byteOffset: byteOffset,
                byteLength: byteLength
            };
            if (target !== undefined)
                gltfBufferView.target = target;
            if (target === WEBGL_CONSTANTS.ARRAY_BUFFER) {
                gltfBufferView.byteStride = attribute.itemSize * componentSize;
            }
            byteOffset += byteLength;
            outputJSON.bufferViews.push(gltfBufferView);
            var output = {
                id: outputJSON.bufferViews.length - 1,
                byteLength: 0
            };
            return output;
        }
        function processBufferViewImage(blob) {
            if (!outputJSON.bufferViews) {
                outputJSON.bufferViews = [];
            }
            return new Promise(function(resolve) {
                var reader = new window.FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onloadend = function() {
                    var buffer = getPaddedArrayBuffer(reader.result);
                    var bufferView = {
                        buffer: processBuffer(buffer),
                        byteOffset: byteOffset,
                        byteLength: buffer.byteLength
                    };
                    byteOffset += buffer.byteLength;
                    outputJSON.bufferViews.push(bufferView);
                    resolve(outputJSON.bufferViews.length - 1);
                }
                ;
            }
            );
        }
        function processAccessor(attribute, geometry, start, count) {
            var types = {
                1: 'SCALAR',
                2: 'VEC2',
                3: 'VEC3',
                4: 'VEC4',
                16: 'MAT4'
            };
            var componentType;
            if (attribute.array.constructor === Float32Array) {
                componentType = WEBGL_CONSTANTS.FLOAT;
            } else if (attribute.array.constructor === Uint32Array) {
                componentType = WEBGL_CONSTANTS.UNSIGNED_INT;
            } else if (attribute.array.constructor === Uint16Array) {
                componentType = WEBGL_CONSTANTS.UNSIGNED_SHORT;
            } else if (attribute.array.constructor === Uint8Array) {
                componentType = WEBGL_CONSTANTS.UNSIGNED_BYTE;
            } else {
                throw new Error('THREE.GLTFExporter: Unsupported bufferAttribute component type.');
            }
            if (start === undefined)
                start = 0;
            if (count === undefined)
                count = attribute.count;
            if (options.truncateDrawRange && geometry !== undefined && geometry.index === null) {
                var end = start + count;
                var end2 = geometry.drawRange.count === Infinity ? attribute.count : geometry.drawRange.start + geometry.drawRange.count;
                start = Math.max(start, geometry.drawRange.start);
                count = Math.min(end, end2) - start;
                if (count < 0)
                    count = 0;
            }
            if (count === 0) {
                return null;
            }
            var minMax = getMinMax(attribute, start, count);
            var bufferViewTarget;
            if (geometry !== undefined) {
                bufferViewTarget = attribute === geometry.index ? WEBGL_CONSTANTS.ELEMENT_ARRAY_BUFFER : WEBGL_CONSTANTS.ARRAY_BUFFER;
            }
            var bufferView = processBufferView(attribute, componentType, start, count, bufferViewTarget);
            var gltfAccessor = {
                bufferView: bufferView.id,
                byteOffset: bufferView.byteOffset,
                componentType: componentType,
                count: count,
                max: minMax.max,
                min: minMax.min,
                type: types[attribute.itemSize]
            };
            if (!outputJSON.accessors) {
                outputJSON.accessors = [];
            }
            outputJSON.accessors.push(gltfAccessor);
            return outputJSON.accessors.length - 1;
        }
        function processImage(image, format, flipY) {
            if (!cachedData.images.has(image)) {
                cachedData.images.set(image, {});
            }
            var cachedImages = cachedData.images.get(image);
            var mimeType = format === THREE.RGBAFormat ? 'image/png' : 'image/jpeg';
            var key = mimeType + ":flipY/" + flipY.toString();
            if (cachedImages[key] !== undefined) {
                return cachedImages[key];
            }
            if (!outputJSON.images) {
                outputJSON.images = [];
            }
            var gltfImage = {
                mimeType: mimeType
            };
            if (options.embedImages) {
                var canvas = cachedCanvas = cachedCanvas || document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                if (options.forcePowerOfTwoTextures && !isPowerOfTwo(image)) {
                    console.warn('GLTFExporter: Resized non-power-of-two image.', image);
                    canvas.width = THREE.Math.floorPowerOfTwo(canvas.width);
                    canvas.height = THREE.Math.floorPowerOfTwo(canvas.height);
                }
                var ctx = canvas.getContext('2d');
                if (flipY === true) {
                    ctx.translate(0, canvas.height);
                    ctx.scale(1, -1);
                }
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                if (options.binary === true) {
                    pending.push(new Promise(function(resolve) {
                        canvas.toBlob(function(blob) {
                            processBufferViewImage(blob).then(function(bufferViewIndex) {
                                gltfImage.bufferView = bufferViewIndex;
                                resolve();
                            });
                        }, mimeType);
                    }
                    ));
                } else {
                    gltfImage.uri = canvas.toDataURL(mimeType);
                }
            } else {
                gltfImage.uri = image.src;
            }
            outputJSON.images.push(gltfImage);
            var index = outputJSON.images.length - 1;
            cachedImages[key] = index;
            return index;
        }
        function processSampler(map) {
            if (!outputJSON.samplers) {
                outputJSON.samplers = [];
            }
            var gltfSampler = {
                magFilter: THREE_TO_WEBGL[map.magFilter],
                minFilter: THREE_TO_WEBGL[map.minFilter],
                wrapS: THREE_TO_WEBGL[map.wrapS],
                wrapT: THREE_TO_WEBGL[map.wrapT]
            };
            outputJSON.samplers.push(gltfSampler);
            return outputJSON.samplers.length - 1;
        }
        function processTexture(map) {
            if (cachedData.textures.has(map)) {
                return cachedData.textures.get(map);
            }
            if (!outputJSON.textures) {
                outputJSON.textures = [];
            }
            var gltfTexture = {
                sampler: processSampler(map),
                source: processImage(map.image, map.format, map.flipY)
            };
            outputJSON.textures.push(gltfTexture);
            var index = outputJSON.textures.length - 1;
            cachedData.textures.set(map, index);
            return index;
        }
        function processMaterial(material) {
            if (cachedData.materials.has(material)) {
                return cachedData.materials.get(material);
            }
            if (!outputJSON.materials) {
                outputJSON.materials = [];
            }
            if (material.isShaderMaterial) {
                console.warn('GLTFExporter: THREE.ShaderMaterial not supported.');
                return null;
            }
            var gltfMaterial = {
                pbrMetallicRoughness: {}
            };
            if (material.isMeshBasicMaterial) {
                gltfMaterial.extensions = {
                    KHR_materials_unlit: {}
                };
                extensionsUsed['KHR_materials_unlit'] = true;
            } else if (!material.isMeshStandardMaterial) {
                console.warn('GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.');
            }
            var color = material.color.toArray().concat([material.opacity]);
            if (!equalArray(color, [1, 1, 1, 1])) {
                gltfMaterial.pbrMetallicRoughness.baseColorFactor = color;
            }
            if (material.isMeshStandardMaterial) {
                gltfMaterial.pbrMetallicRoughness.metallicFactor = material.metalness;
                gltfMaterial.pbrMetallicRoughness.roughnessFactor = material.roughness;
            } else if (material.isMeshBasicMaterial) {
                gltfMaterial.pbrMetallicRoughness.metallicFactor = 0.0;
                gltfMaterial.pbrMetallicRoughness.roughnessFactor = 0.9;
            } else {
                gltfMaterial.pbrMetallicRoughness.metallicFactor = 0.5;
                gltfMaterial.pbrMetallicRoughness.roughnessFactor = 0.5;
            }
            if (material.metalnessMap || material.roughnessMap) {
                if (material.metalnessMap === material.roughnessMap) {
                    gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture = {
                        index: processTexture(material.metalnessMap)
                    };
                } else {
                    console.warn('THREE.GLTFExporter: Ignoring metalnessMap and roughnessMap because they are not the same Texture.');
                }
            }
            if (material.map) {
                gltfMaterial.pbrMetallicRoughness.baseColorTexture = {
                    index: processTexture(material.map)
                };
            }
            if (material.isMeshBasicMaterial || material.isLineBasicMaterial || material.isPointsMaterial) {} else {
                var emissive = material.emissive.clone().multiplyScalar(material.emissiveIntensity).toArray();
                if (!equalArray(emissive, [0, 0, 0])) {
                    gltfMaterial.emissiveFactor = emissive;
                }
                if (material.emissiveMap) {
                    gltfMaterial.emissiveTexture = {
                        index: processTexture(material.emissiveMap)
                    };
                }
            }
            if (material.normalMap) {
                gltfMaterial.normalTexture = {
                    index: processTexture(material.normalMap)
                };
                if (material.normalScale.x !== -1) {
                    if (material.normalScale.x !== material.normalScale.y) {
                        console.warn('THREE.GLTFExporter: Normal scale components are different, ignoring Y and exporting X.');
                    }
                    gltfMaterial.normalTexture.scale = material.normalScale.x;
                }
            }
            if (material.aoMap) {
                gltfMaterial.occlusionTexture = {
                    index: processTexture(material.aoMap)
                };
                if (material.aoMapIntensity !== 1.0) {
                    gltfMaterial.occlusionTexture.strength = material.aoMapIntensity;
                }
            }
            if (material.transparent || material.alphaTest > 0.0) {
                gltfMaterial.alphaMode = material.opacity < 1.0 ? 'BLEND' : 'MASK';
                if (material.alphaTest > 0.0 && material.alphaTest !== 0.5) {
                    gltfMaterial.alphaCutoff = material.alphaTest;
                }
            }
            if (material.side === THREE.DoubleSide) {
                gltfMaterial.doubleSided = true;
            }
            if (material.name !== '') {
                gltfMaterial.name = material.name;
            }
            if (Object.keys(material.userData).length > 0) {
                gltfMaterial.extras = serializeUserData(material);
            }
            outputJSON.materials.push(gltfMaterial);
            var index = outputJSON.materials.length - 1;
            cachedData.materials.set(material, index);
            return index;
        }
        function processMesh(mesh) {
            var geometry = mesh.geometry;
            var mode;
            if (mesh.isLineSegments) {
                mode = WEBGL_CONSTANTS.LINES;
            } else if (mesh.isLineLoop) {
                mode = WEBGL_CONSTANTS.LINE_LOOP;
            } else if (mesh.isLine) {
                mode = WEBGL_CONSTANTS.LINE_STRIP;
            } else if (mesh.isPoints) {
                mode = WEBGL_CONSTANTS.POINTS;
            } else {
                if (!geometry.isBufferGeometry) {
                    var geometryTemp = new THREE.BufferGeometry();
                    geometryTemp.fromGeometry(geometry);
                    geometry = geometryTemp;
                }
                if (mesh.drawMode === THREE.TriangleFanDrawMode) {
                    console.warn('GLTFExporter: TriangleFanDrawMode and wireframe incompatible.');
                    mode = WEBGL_CONSTANTS.TRIANGLE_FAN;
                } else if (mesh.drawMode === THREE.TriangleStripDrawMode) {
                    mode = mesh.material.wireframe ? WEBGL_CONSTANTS.LINE_STRIP : WEBGL_CONSTANTS.TRIANGLE_STRIP;
                } else {
                    mode = mesh.material.wireframe ? WEBGL_CONSTANTS.LINES : WEBGL_CONSTANTS.TRIANGLES;
                }
            }
            var gltfMesh = {};
            var attributes = {};
            var primitives = [];
            var targets = [];
            var nameConversion = {
                uv: 'TEXCOORD_0',
                uv2: 'TEXCOORD_1',
                color: 'COLOR_0',
                skinWeight: 'WEIGHTS_0',
                skinIndex: 'JOINTS_0'
            };
            var originalNormal = geometry.getAttribute('normal');
            if (originalNormal !== undefined && !isNormalizedNormalAttribute(originalNormal)) {
                console.warn('THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one.');
                geometry.addAttribute('normal', createNormalizedNormalAttribute(originalNormal));
            }
            for (var attributeName in geometry.attributes) {
                var attribute = geometry.attributes[attributeName];
                attributeName = nameConversion[attributeName] || attributeName.toUpperCase();
                var array = attribute.array;
                if (attributeName === 'JOINTS_0' && !(array instanceof Uint16Array) && !(array instanceof Uint8Array)) {
                    console.warn('GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                    attribute = new THREE.BufferAttribute(new Uint16Array(array),attribute.itemSize,attribute.normalized);
                }
                if (attributeName.substr(0, 5) !== 'MORPH') {
                    var accessor = processAccessor(attribute, geometry);
                    if (accessor !== null) {
                        attributes[attributeName] = accessor;
                    }
                }
            }
            if (originalNormal !== undefined)
                geometry.addAttribute('normal', originalNormal);
            if (Object.keys(attributes).length === 0) {
                return null;
            }
            if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
                var weights = [];
                var targetNames = [];
                var reverseDictionary = {};
                if (mesh.morphTargetDictionary !== undefined) {
                    for (var key in mesh.morphTargetDictionary) {
                        reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                    }
                }
                for (var i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                    var target = {};
                    var warned = false;
                    for (var attributeName in geometry.morphAttributes) {
                        if (attributeName !== 'position' && attributeName !== 'normal') {
                            if (!warned) {
                                console.warn('GLTFExporter: Only POSITION and NORMAL morph are supported.');
                                warned = true;
                            }
                            continue;
                        }
                        var attribute = geometry.morphAttributes[attributeName][i];
                        var baseAttribute = geometry.attributes[attributeName];
                        var relativeAttribute = attribute.clone();
                        for (var j = 0, jl = attribute.count; j < jl; j++) {
                            relativeAttribute.setXYZ(j, attribute.getX(j) - baseAttribute.getX(j), attribute.getY(j) - baseAttribute.getY(j), attribute.getZ(j) - baseAttribute.getZ(j));
                        }
                        target[attributeName.toUpperCase()] = processAccessor(relativeAttribute, geometry);
                    }
                    targets.push(target);
                    weights.push(mesh.morphTargetInfluences[i]);
                    if (mesh.morphTargetDictionary !== undefined)
                        targetNames.push(reverseDictionary[i]);
                }
                gltfMesh.weights = weights;
                if (targetNames.length > 0) {
                    gltfMesh.extras = {};
                    gltfMesh.extras.targetNames = targetNames;
                }
            }
            var extras = (Object.keys(geometry.userData).length > 0) ? serializeUserData(geometry) : undefined;
            var forceIndices = options.forceIndices;
            var isMultiMaterial = Array.isArray(mesh.material);
            if (isMultiMaterial && geometry.groups.length === 0)
                return null;
            if (!forceIndices && geometry.index === null && isMultiMaterial) {
                console.warn('THREE.GLTFExporter: Creating index for non-indexed multi-material mesh.');
                forceIndices = true;
            }
            var didForceIndices = false;
            if (geometry.index === null && forceIndices) {
                var indices = [];
                for (var i = 0, il = geometry.attributes.position.count; i < il; i++) {
                    indices[i] = i;
                }
                geometry.setIndex(indices);
                didForceIndices = true;
            }
            var materials = isMultiMaterial ? mesh.material : [mesh.material];
            var groups = isMultiMaterial ? geometry.groups : [{
                materialIndex: 0,
                start: undefined,
                count: undefined
            }];
            for (var i = 0, il = groups.length; i < il; i++) {
                var primitive = {
                    mode: mode,
                    attributes: attributes,
                };
                if (extras)
                    primitive.extras = extras;
                if (targets.length > 0)
                    primitive.targets = targets;
                if (geometry.index !== null) {
                    primitive.indices = processAccessor(geometry.index, geometry, groups[i].start, groups[i].count);
                }
                var material = processMaterial(materials[groups[i].materialIndex]);
                if (material !== null) {
                    primitive.material = material;
                }
                primitives.push(primitive);
            }
            if (didForceIndices) {
                geometry.setIndex(null);
            }
            gltfMesh.primitives = primitives;
            if (!outputJSON.meshes) {
                outputJSON.meshes = [];
            }
            outputJSON.meshes.push(gltfMesh);
            return outputJSON.meshes.length - 1;
        }
        function processCamera(camera) {
            if (!outputJSON.cameras) {
                outputJSON.cameras = [];
            }
            var isOrtho = camera.isOrthographicCamera;
            var gltfCamera = {
                type: isOrtho ? 'orthographic' : 'perspective'
            };
            if (isOrtho) {
                gltfCamera.orthographic = {
                    xmag: camera.right * 2,
                    ymag: camera.top * 2,
                    zfar: camera.far <= 0 ? 0.001 : camera.far,
                    znear: camera.near < 0 ? 0 : camera.near
                };
            } else {
                gltfCamera.perspective = {
                    aspectRatio: camera.aspect,
                    yfov: THREE.Math.degToRad(camera.fov) / camera.aspect,
                    zfar: camera.far <= 0 ? 0.001 : camera.far,
                    znear: camera.near < 0 ? 0 : camera.near
                };
            }
            if (camera.name !== '') {
                gltfCamera.name = camera.type;
            }
            outputJSON.cameras.push(gltfCamera);
            return outputJSON.cameras.length - 1;
        }
        function processAnimation(clip, root) {
            if (!outputJSON.animations) {
                outputJSON.animations = [];
            }
            var channels = [];
            var samplers = [];
            for (var i = 0; i < clip.tracks.length; ++i) {
                var track = clip.tracks[i];
                var trackBinding = THREE.PropertyBinding.parseTrackName(track.name);
                var trackNode = THREE.PropertyBinding.findNode(root, trackBinding.nodeName);
                var trackProperty = PATH_PROPERTIES[trackBinding.propertyName];
                if (trackBinding.objectName === 'bones') {
                    if (trackNode.isSkinnedMesh === true) {
                        trackNode = trackNode.skeleton.getBoneByName(trackBinding.objectIndex);
                    } else {
                        trackNode = undefined;
                    }
                }
                if (!trackNode || !trackProperty) {
                    console.warn('THREE.GLTFExporter: Could not export animation track "%s".', track.name);
                    return null;
                }
                var inputItemSize = 1;
                var outputItemSize = track.values.length / track.times.length;
                if (trackProperty === PATH_PROPERTIES.morphTargetInfluences) {
                    outputItemSize /= trackNode.morphTargetInfluences.length;
                }
                var interpolation;
                if (track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline === true) {
                    interpolation = 'CUBICSPLINE';
                    outputItemSize /= 3;
                } else if (track.getInterpolation() === THREE.InterpolateDiscrete) {
                    interpolation = 'STEP';
                } else {
                    interpolation = 'LINEAR';
                }
                samplers.push({
                    input: processAccessor(new THREE.BufferAttribute(track.times,inputItemSize)),
                    output: processAccessor(new THREE.BufferAttribute(track.values,outputItemSize)),
                    interpolation: interpolation
                });
                channels.push({
                    sampler: samplers.length - 1,
                    target: {
                        node: nodeMap.get(trackNode),
                        path: trackProperty
                    }
                });
            }
            outputJSON.animations.push({
                name: clip.name || 'clip_' + outputJSON.animations.length,
                samplers: samplers,
                channels: channels
            });
            return outputJSON.animations.length - 1;
        }
        function processSkin(object) {
            var node = outputJSON.nodes[nodeMap.get(object)];
            var skeleton = object.skeleton;
            var rootJoint = object.skeleton.bones[0];
            if (rootJoint === undefined)
                return null;
            var joints = [];
            var inverseBindMatrices = new Float32Array(skeleton.bones.length * 16);
            for (var i = 0; i < skeleton.bones.length; ++i) {
                joints.push(nodeMap.get(skeleton.bones[i]));
                skeleton.boneInverses[i].toArray(inverseBindMatrices, i * 16);
            }
            if (outputJSON.skins === undefined) {
                outputJSON.skins = [];
            }
            outputJSON.skins.push({
                inverseBindMatrices: processAccessor(new THREE.BufferAttribute(inverseBindMatrices,16)),
                joints: joints,
                skeleton: nodeMap.get(rootJoint)
            });
            var skinIndex = node.skin = outputJSON.skins.length - 1;
            return skinIndex;
        }
        function processNode(object) {
            if (object.isLight) {
                console.warn('GLTFExporter: Unsupported node type:', object.constructor.name);
                return null;
            }
            if (!outputJSON.nodes) {
                outputJSON.nodes = [];
            }
            var gltfNode = {};
            if (options.trs) {
                var rotation = object.quaternion.toArray();
                var position = object.position.toArray();
                var scale = object.scale.toArray();
                if (!equalArray(rotation, [0, 0, 0, 1])) {
                    gltfNode.rotation = rotation;
                }
                if (!equalArray(position, [0, 0, 0])) {
                    gltfNode.translation = position;
                }
                if (!equalArray(scale, [1, 1, 1])) {
                    gltfNode.scale = scale;
                }
            } else {
                object.updateMatrix();
                if (!equalArray(object.matrix.elements, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])) {
                    gltfNode.matrix = object.matrix.elements;
                }
            }
            if (object.name !== '') {
                gltfNode.name = String(object.name);
            }
            if (object.userData && Object.keys(object.userData).length > 0) {
                gltfNode.extras = serializeUserData(object);
            }
            if (object.isMesh || object.isLine || object.isPoints) {
                var mesh = processMesh(object);
                if (mesh !== null) {
                    gltfNode.mesh = mesh;
                }
            } else if (object.isCamera) {
                gltfNode.camera = processCamera(object);
            }
            if (object.isSkinnedMesh) {
                skins.push(object);
            }
            if (object.children.length > 0) {
                var children = [];
                for (var i = 0, l = object.children.length; i < l; i++) {
                    var child = object.children[i];
                    if (child.visible || options.onlyVisible === false) {
                        var node = processNode(child);
                        if (node !== null) {
                            children.push(node);
                        }
                    }
                }
                if (children.length > 0) {
                    gltfNode.children = children;
                }
            }
            outputJSON.nodes.push(gltfNode);
            var nodeIndex = outputJSON.nodes.length - 1;
            nodeMap.set(object, nodeIndex);
            return nodeIndex;
        }
        function processScene(scene) {
            if (!outputJSON.scenes) {
                outputJSON.scenes = [];
                outputJSON.scene = 0;
            }
            var gltfScene = {
                nodes: []
            };
            if (scene.name !== '') {
                gltfScene.name = scene.name;
            }
            outputJSON.scenes.push(gltfScene);
            var nodes = [];
            for (var i = 0, l = scene.children.length; i < l; i++) {
                var child = scene.children[i];
                if (child.visible || options.onlyVisible === false) {
                    var node = processNode(child);
                    if (node !== null) {
                        nodes.push(node);
                    }
                }
            }
            if (nodes.length > 0) {
                gltfScene.nodes = nodes;
            }
        }
        function processObjects(objects) {
            var scene = new THREE.Scene();
            scene.name = 'AuxScene';
            for (var i = 0; i < objects.length; i++) {
                scene.children.push(objects[i]);
            }
            processScene(scene);
        }
        function processInput(input) {
            input = input instanceof Array ? input : [input];
            var objectsWithoutScene = [];
            for (var i = 0; i < input.length; i++) {
                if (input[i]instanceof THREE.Scene) {
                    processScene(input[i]);
                } else {
                    objectsWithoutScene.push(input[i]);
                }
            }
            if (objectsWithoutScene.length > 0) {
                processObjects(objectsWithoutScene);
            }
            for (var i = 0; i < skins.length; ++i) {
                processSkin(skins[i]);
            }
            for (var i = 0; i < options.animations.length; ++i) {
                processAnimation(options.animations[i], input[0]);
            }
        }
        processInput(input);
        Promise.all(pending).then(function() {
            var blob = new Blob(buffers,{
                type: 'application/octet-stream'
            });
            var extensionsUsedList = Object.keys(extensionsUsed);
            if (extensionsUsedList.length > 0)
                outputJSON.extensionsUsed = extensionsUsedList;
            if (outputJSON.buffers && outputJSON.buffers.length > 0) {
                outputJSON.buffers[0].byteLength = blob.size;
                var reader = new window.FileReader();
                if (options.binary === true) {
                    var GLB_HEADER_BYTES = 12;
                    var GLB_HEADER_MAGIC = 0x46546C67;
                    var GLB_VERSION = 2;
                    var GLB_CHUNK_PREFIX_BYTES = 8;
                    var GLB_CHUNK_TYPE_JSON = 0x4E4F534A;
                    var GLB_CHUNK_TYPE_BIN = 0x004E4942;
                    reader.readAsArrayBuffer(blob);
                    reader.onloadend = function() {
                        var binaryChunk = getPaddedArrayBuffer(reader.result);
                        var binaryChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
                        binaryChunkPrefix.setUint32(0, binaryChunk.byteLength, true);
                        binaryChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_BIN, true);
                        var jsonChunk = getPaddedArrayBuffer(stringToArrayBuffer(JSON.stringify(outputJSON)), 0x20);
                        var jsonChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
                        jsonChunkPrefix.setUint32(0, jsonChunk.byteLength, true);
                        jsonChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_JSON, true);
                        var header = new ArrayBuffer(GLB_HEADER_BYTES);
                        var headerView = new DataView(header);
                        headerView.setUint32(0, GLB_HEADER_MAGIC, true);
                        headerView.setUint32(4, GLB_VERSION, true);
                        var totalByteLength = GLB_HEADER_BYTES + jsonChunkPrefix.byteLength + jsonChunk.byteLength + binaryChunkPrefix.byteLength + binaryChunk.byteLength;
                        headerView.setUint32(8, totalByteLength, true);
                        var glbBlob = new Blob([header, jsonChunkPrefix, jsonChunk, binaryChunkPrefix, binaryChunk],{
                            type: 'application/octet-stream'
                        });
                        var glbReader = new window.FileReader();
                        glbReader.readAsArrayBuffer(glbBlob);
                        glbReader.onloadend = function() {
                            onDone(glbReader.result);
                        }
                        ;
                    }
                    ;
                } else {
                    reader.readAsDataURL(blob);
                    reader.onloadend = function() {
                        var base64data = reader.result;
                        outputJSON.buffers[0].uri = base64data;
                        onDone(outputJSON);
                    }
                    ;
                }
            } else {
                onDone(outputJSON);
            }
        });
    }
};
