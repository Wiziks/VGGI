let isSwiping = false;
let startX;
let startY;
let currentX = 0;
let currentY = 0;
let sensivity = 30 / 10000
let swipeDelta = [0, 0]
let viewPosition = [0, 0, -50]
let scale = [1.0, 1.0, 1.0]
let color = [1.0, 1.0, 1.0]
let b = 1
let c = 1
let maxX = 10
let deltaX = 0.1
let deltaAngle = 5
let canvas
let gl

const vsSource = `
    attribute vec3 a_Position;
    uniform mat4 u_Pmatrix;
    uniform mat4 u_Mmatrix;
    uniform mat4 u_Vmatrix;
    void main(void) {
        gl_Position = u_Pmatrix*u_Vmatrix*u_Mmatrix*vec4(a_Position, 1.0);
    }`;

const fsSource = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main(void) {
        gl_FragColor = u_FragColor;
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
            const x = originSinusoid[index]
            const y = originSinusoid[index + 1]
            const z = originSinusoid[index + 2]
            const rotPoint = rotatePointAroundY(x, y, z, angle)
            vertices.push(rotPoint[0], rotPoint[1], rotPoint[2]);
        }
    }

    return vertices;
}

function initProgram(vertices) {
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

    return [shaderProgram, vertexBuffer];
}

function drawModel(vertices, shaderProgram, vertexBuffer) {
    var u_Pmatrix = gl.getUniformLocation(shaderProgram, 'u_Pmatrix');
    var u_Mmatrix = gl.getUniformLocation(shaderProgram, 'u_Mmatrix');
    var u_Vmatrix = gl.getUniformLocation(shaderProgram, 'u_Vmatrix');

    var PROJMATRIX = mat4.perspective(40, canvas.width / canvas.height, 1, 100);
    var VIEWMATRIX = mat4.create();
    var MODELMATRIX = mat4.create();

    currentX += swipeDelta[0]
    currentY += swipeDelta[1]

    mat4.identity(VIEWMATRIX);
    mat4.identity(MODELMATRIX);

    mat4.translate(VIEWMATRIX, viewPosition);

    mat4.rotateX(MODELMATRIX, sensivity * currentY);
    mat4.rotateY(MODELMATRIX, sensivity * currentX);
    mat4.scale(MODELMATRIX, scale);

    gl.uniformMatrix4fv(u_Pmatrix, false, PROJMATRIX);
    gl.uniformMatrix4fv(u_Mmatrix, false, MODELMATRIX);
    gl.uniformMatrix4fv(u_Vmatrix, false, VIEWMATRIX);

    var u_FragColor = gl.getUniformLocation(shaderProgram, 'u_FragColor');
    gl.uniform4f(u_FragColor, color[0], color[1], color[2], 1.0);

    const vertexPosition = gl.getAttribLocation(shaderProgram, "a_Position");
    gl.enableVertexAttribArray(vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(0.06, 0.02, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length);
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

    for (let i = 1; i <= 12; i++) {
        const sliderId = `${sliderPrefix}${i}`;
        const sliderValueId = `${sliderValuePrefix}${i}`;

        const slider = document.getElementById(sliderId);
        const sliderValue = document.getElementById(sliderValueId);

        slider.addEventListener('input', (e) => {
            const sliderVal = parseFloat(e.target.value).toFixed(1);
            sliderValue.textContent = sliderVal;
            if (i < 4)
                scale[i - 1] = sliderVal;
            else if (i < 7)
                color[i - 4] = sliderVal;
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
            else
                sensivity = sliderVal / 10000;
            setup();
        });
    }
}

onload = function () {
    setup = function () {
        const vertices = calculateVertices();
        const [shaderProgram, vertexBuffer] = initProgram(vertices);
        drawModel(vertices, shaderProgram, vertexBuffer);
    }
    setup();
    processEvents(setup);
}

function rotatePointAroundY(x, y, z, angle) {
    const angleRadians = angle * Math.PI / 180.0;

    const x1 = x * Math.cos(angleRadians) - z * Math.sin(angleRadians);
    const z1 = x * Math.sin(angleRadians) + z * Math.cos(angleRadians);

    return [x1, y, z1];
}