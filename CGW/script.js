let isSwiping = false;
let startX;
let startY;
let currentX = 0;
let currentY = 0;
let sensivity = 30 / 10000
let swipeDelta = [0, 0]
let viewPosition = [0, 0, -50]
let scale = [1.0, 1.0, 1.0]
let figureColor = [1.0, 1.0, 1.0]
let b = 1
let c = 1
let maxX = 10
let deltaX = 0.1
let deltaAngle = 10

let lightColor = [1.0, 1.0, 1.0]
let lightDirection = [0.0, -1.0, 0.0]
let lightIntensity = 0.4

let ambientColor = [0.0, 0.0, 0.0]
let shininess = 1

let lightOscillationLength = 1;
let animationDirection = 0;
let animationSpeed = 0.05;

let canvas
let gl

const vsSource = `
    attribute vec3 a_Position;
    attribute vec3 a_Color;
    attribute vec3 a_Normal;

    uniform mat4 u_Pmatrix;
    uniform mat4 u_Mmatrix;
    uniform mat4 u_Vmatrix;

    uniform vec3 u_LightDirection;
    uniform vec4 u_LightColor;
    uniform vec4 u_AmbientColor;
    uniform vec3 u_ViewPosition;
    uniform float u_LightIntensity;
    uniform float u_Shininess;

    varying vec3 v_Color;
    varying vec3 v_Normal;
    varying vec3 v_Position;

    void main(void) {
        vec4 transformedNormal = u_Mmatrix * vec4(a_Normal, 0.0);
        v_Normal = normalize(transformedNormal.xyz);

        vec4 worldPosition = u_Mmatrix * vec4(a_Position, 1.0);
        v_Position = vec3(worldPosition.xyz);

        float nDotL = max(dot(v_Normal, normalize(u_LightDirection)), 0.0);
        vec3 diffuse = u_LightColor.rgb * a_Color * nDotL * u_LightIntensity;

        vec3 ambient = u_AmbientColor.rgb * a_Color;

        vec3 viewDir = normalize(u_ViewPosition - v_Position);
        vec3 reflectDir = reflect(-normalize(u_LightDirection), v_Normal);  
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_Shininess);
        vec3 specular = u_LightColor.rgb * spec * u_LightIntensity;

        v_Color = ambient + diffuse + specular;
        gl_Position = u_Pmatrix * u_Vmatrix * worldPosition;
    }`;

const fsSource = `
    precision mediump float;
    varying vec3 v_Color;
    void main(void) {
        gl_FragColor = vec4(v_Color,1.0);
    }`;

function calculateVertices() {
    const vertices = [];
    const originSinusoid = [];

    for (let x = 0; x <= maxX; x += deltaX) {
        const y = b * Math.sin(c * x);
        originSinusoid.push(x, y, 0);
    }

    for (let index = 0; index < originSinusoid.length; index += 3) {
        for (let angle = 0; angle < 360; angle += deltaAngle) {
            const x = originSinusoid[index];
            const y = originSinusoid[index + 1];
            const z = originSinusoid[index + 2];
            const rotPoint = rotatePointAroundY(x, y, z, angle);
            vertices.push(rotPoint[0], rotPoint[1], rotPoint[2]);
            vertices.push(figureColor[0], figureColor[1], figureColor[2]);
        }
    }

    const [faces, averagedNormals] = generateFaces(vertices, vertices.length / 3.5, 360 / deltaAngle);

    return [vertices, faces, averagedNormals];
}

function generateFaces(vertices, numGroups, segmenst) {
    const faces = [];
    const normals = new Array(vertices.length / 6).fill(null).map(() => []);

    let start = 0;
    let end = 1;

    for (let i = 0; i < segmenst; i++) {
        start++;
        end++;
        faces.push(0, start, end);
        addFaceNormal(vertices, normals, 0, start, end);
    }

    start = 1;

    faces.push(0, start, end);
    addFaceNormal(vertices, normals, 0, start, end);

    for (let i = 0; i < numGroups - segmenst; i += 2) {
        faces.push(start, start + 1, end + 1);
        addFaceNormal(vertices, normals, start, start + 1, end + 1);

        faces.push(start, end, end + 1);
        addFaceNormal(vertices, normals, start, end, end + 1);

        start++;
        end++;
    }

    const averagedNormals = normals.map(averageNormals);

    return [faces, averagedNormals];
}

function addFaceNormal(vertices, normals, v1, v2, v3) {
    const normal = calculateNormal(
        [vertices[v1 * 6], vertices[v1 * 6 + 1], vertices[v1 * 6 + 2]],
        [vertices[v2 * 6], vertices[v2 * 6 + 1], vertices[v2 * 6 + 2]],
        [vertices[v3 * 6], vertices[v3 * 6 + 1], vertices[v3 * 6 + 2]]
    );

    normals[v1].push(normal);
    normals[v2].push(normal);
    normals[v3].push(normal);
}

function calculateNormal(v1, v2, v3) {
    let edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    let edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    let nx = edge1[1] * edge2[2] - edge1[2] * edge2[1];
    let ny = edge1[2] * edge2[0] - edge1[0] * edge2[2];
    let nz = edge1[0] * edge2[1] - edge1[1] * edge2[0];

    let length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return [nx / length, ny / length, nz / length];
}

function averageNormals(normals) {
    let sum = normals.reduce((acc, n) => [acc[0] + n[0], acc[1] + n[1], acc[2] + n[2]], [0, 0, 0]);

    let count = normals.length;
    return [sum[0] / count, sum[1] / count, sum[2] / count];
}

function initProgram(vertices, faces, averagedNormals) {
    canvas = document.getElementById("webgl-canvas");
    canvas.width = 2000;
    canvas.height = 2000;
    gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("WebGL не підтримується на цьому пристрої.");
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const facesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, facesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);

    const normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(averagedNormals.flat()), gl.STATIC_DRAW);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);
    gl.enable(gl.DEPTH_TEST);

    return [shaderProgram, vertexBuffer, facesBuffer, normalsBuffer];
}

function drawModel(shaderProgram, vertexBuffer, facesBuffer, faces, normalsBuffer) {
    var u_Pmatrix = gl.getUniformLocation(shaderProgram, 'u_Pmatrix');
    var u_Mmatrix = gl.getUniformLocation(shaderProgram, 'u_Mmatrix');
    var u_Vmatrix = gl.getUniformLocation(shaderProgram, 'u_Vmatrix');

    const distance = viewPosition[2];
    var PROJMATRIX = mat4.ortho(-distance, distance, -distance, distance, 0.1, 1000);

    var VIEWMATRIX = mat4.create();
    var MODELMATRIX = mat4.create();

    currentX += swipeDelta[0]
    currentY += swipeDelta[1]

    mat4.identity(VIEWMATRIX);
    mat4.identity(MODELMATRIX);

    mat4.translate(VIEWMATRIX, viewPosition);

    mat4.rotateX(MODELMATRIX, -sensivity * currentY);
    mat4.rotateY(MODELMATRIX, sensivity * currentX);
    mat4.scale(MODELMATRIX, scale);

    gl.uniformMatrix4fv(u_Pmatrix, false, PROJMATRIX);
    gl.uniformMatrix4fv(u_Mmatrix, false, MODELMATRIX);
    gl.uniformMatrix4fv(u_Vmatrix, false, VIEWMATRIX);

    const u_LightDirection = gl.getUniformLocation(shaderProgram, 'u_LightDirection');
    const u_LightColor = gl.getUniformLocation(shaderProgram, 'u_LightColor');
    const u_LightIntensity = gl.getUniformLocation(shaderProgram, 'u_LightIntensity');
    gl.uniform3f(u_LightDirection, lightDirection[0], lightDirection[1], lightDirection[2]);
    gl.uniform4f(u_LightColor, lightColor[0], lightColor[1], lightColor[2], 1.0);
    gl.uniform1f(u_LightIntensity, lightIntensity);

    const u_AmbientColor = gl.getUniformLocation(shaderProgram, 'u_AmbientColor');
    const u_ViewPosition = gl.getUniformLocation(shaderProgram, 'u_ViewPosition');
    const u_Shininess = gl.getUniformLocation(shaderProgram, 'u_Shininess');
    gl.uniform4f(u_AmbientColor, ambientColor[0], ambientColor[1], ambientColor[2], 1.0);
    gl.uniform3f(u_ViewPosition, viewPosition[0], viewPosition[1], viewPosition[2]);
    gl.uniform1f(u_Shininess, shininess);

    const a_Position = gl.getAttribLocation(shaderProgram, 'a_Position');
    const a_Color = gl.getAttribLocation(shaderProgram, 'a_Color');
    const a_Normal = gl.getAttribLocation(shaderProgram, 'a_Normal');

    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_Color);
    gl.enableVertexAttribArray(a_Normal);

    gl.clearColor(0.06, 0.02, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);

    const byteCount = 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, byteCount * (3 + 3), 0);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, byteCount * (3 + 3), 3 * byteCount);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, facesBuffer);
    gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);

    if (document.getElementById('animation').checked)
        drawBox([0, 10, 0], [0.1, lightOscillationLength * 10, 0.1], [1.0, 1.0, 0.0], PROJMATRIX, MODELMATRIX, VIEWMATRIX);
}

function processEvents(setup) {
    canvas.addEventListener('mousedown', (e) => {
        isSwiping = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isSwiping = false;
        swipeDelta = [0, 0]
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isSwiping) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        startX = currentX
        startY = currentY

        swipeDelta = [deltaX, deltaY]
        setup();
    });

    canvas.addEventListener('wheel', (event) => {
        if (event.deltaY > 0) {
            viewPosition = [0, 0, viewPosition[2] - 1]

        } else if (event.deltaY < 0) {
            viewPosition = [0, 0, viewPosition[2] + 1]
        }
        setup();
    });

    const sliderPrefix = 'slider';
    const sliderValuePrefix = 'slider-value';

    for (let i = 1; i <= 25; i++) {
        const sliderId = `${sliderPrefix}${i}`;
        const sliderValueId = `${sliderValuePrefix}${i}`;

        const slider = document.getElementById(sliderId);
        const sliderValue = document.getElementById(sliderValueId);

        if (slider == null) {
            console.log("Slider with id " + sliderId + " not found");
        } else {
            slider.addEventListener('input', (e) => {
                const sliderVal = parseFloat(e.target.value).toFixed(1);
                sliderValue.textContent = sliderVal;
                if (i < 4) {
                    scale[i - 1] = sliderVal;
                    lightOscillationLength = Math.sqrt(scale[0] * scale[0] + scale[1] * scale[1] + scale[2] * scale[2])
                }
                else if (i < 7)
                    figureColor[i - 4] = sliderVal;
                else if (i == 7)
                    b = sliderVal;
                else if (i == 8)
                    c = sliderVal;
                else if (i == 9)
                    maxX = sliderVal;
                else if (i == 10)
                    deltaX = Number(sliderVal);
                else if (i == 11)
                    deltaAngle = Number(sliderVal);
                else if (i == 12)
                    sensivity = sliderVal / 10000;
                else if (i < 16)
                    lightDirection[i - 13] = sliderVal;
                else if (i < 19)
                    lightColor[i - 16] = sliderVal;
                else if (i < 22)
                    ambientColor[i - 19] = sliderVal;
                else if (i == 22)
                    lightIntensity = Number(sliderVal);
                else if (i == 23)
                    shininess = Number(sliderVal);
                else if (i == 24) {
                    let value = Number(sliderVal)
                    sliderValue.textContent = value == 0 ? "X" : value == 1 ? "Y" : "Z"
                    animationDirection = value
                }
                else if (i == 25) {
                    const val = parseFloat(e.target.value).toFixed(2);
                    sliderValue.textContent = val;
                    animationSpeed = Number(val)
                }

                setup();
            });
        }
    }
}

onload = function () {
    setup = function () {
        const [vertices, faces, averagedNormals] = calculateVertices();
        const [shaderProgram, vertexBuffer, facesBuffer, normalsBuffer] = initProgram(vertices, faces, averagedNormals);
        drawModel(shaderProgram, vertexBuffer, facesBuffer, faces, normalsBuffer);
    }
    setup();
    processEvents(setup);

    let time = 0;

    function render() {
        if (document.getElementById('animation').checked) {
            const index = animationDirection + 13;
            const slider = document.getElementById('slider' + index);
            const sliderValue = document.getElementById('slider-value' + index);
            const value = Math.round(Math.sin(time) * 100) / 100
            slider.value = value
            sliderValue.textContent = value
            lightDirection[0] = value
            time += animationSpeed
            setup();
        }

        requestAnimationFrame(render)
    }

    requestAnimationFrame(render)

    document.getElementById("switch-button").addEventListener("click", function () {
        var div1 = document.getElementById("figure-settings");
        var div2 = document.getElementById("light-settings");
        var button = document.getElementById("switch-button");

        if (div1.style.display === "none") {
            div1.style.display = "flex";
            div2.style.display = "none";
            button.textContent = "Світло";
        } else {
            div1.style.display = "none";
            div2.style.display = "flex";
            button.textContent = "Фігура";
        }
    });
}

function rotatePointAroundY(x, y, z, angle) {
    const angleRadians = angle * Math.PI / 180.0;

    const x1 = x * Math.cos(angleRadians) - z * Math.sin(angleRadians);
    const z1 = x * Math.sin(angleRadians) + z * Math.cos(angleRadians);

    return [x1, y, z1];
}