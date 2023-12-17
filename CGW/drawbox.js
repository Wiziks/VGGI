function drawBox(center, size, color, PROJMATRIX, MODELMATRIX, VIEWMATRIX) {
    var x = center[0], y = center[1], z = center[2];
    var width = size[0] / 2, height = size[1] / 2, depth = size[2] / 2

    var boxVertices = [
        // Front face
        x - width, y - height, z + depth, color[0], color[1], color[2],
        x + width, y - height, z + depth, color[0], color[1], color[2],
        x + width, y + height, z + depth, color[0], color[1], color[2],
        x - width, y + height, z + depth, color[0], color[1], color[2],

        // Back face
        x - width, y - height, z - depth, color[0], color[1], color[2],
        x - width, y + height, z - depth, color[0], color[1], color[2],
        x + width, y + height, z - depth, color[0], color[1], color[2],
        x + width, y - height, z - depth, color[0], color[1], color[2],

        // Top face
        x - width, y + height, z - depth, color[0], color[1], color[2],
        x - width, y + height, z + depth, color[0], color[1], color[2],
        x + width, y + height, z + depth, color[0], color[1], color[2],
        x + width, y + height, z - depth, color[0], color[1], color[2],

        // Bottom face
        x - width, y - height, z - depth, color[0], color[1], color[2],
        x + width, y - height, z - depth, color[0], color[1], color[2],
        x + width, y - height, z + depth, color[0], color[1], color[2],
        x - width, y - height, z + depth, color[0], color[1], color[2],

        // Right face
        x + width, y - height, z - depth, color[0], color[1], color[2],
        x + width, y + height, z - depth, color[0], color[1], color[2],
        x + width, y + height, z + depth, color[0], color[1], color[2],
        x + width, y - height, z + depth, color[0], color[1], color[2],

        // Left face
        x - width, y - height, z - depth, color[0], color[1], color[2],
        x - width, y - height, z + depth, color[0], color[1], color[2],
        x - width, y + height, z + depth, color[0], color[1], color[2],
        x - width, y + height, z - depth, color[0], color[1], color[2],
    ];

    const vsSourceUnlit = `
    attribute vec3 a_Position;
    attribute vec3 a_Color;

    uniform mat4 u_Pmatrix;
    uniform mat4 u_Mmatrix;
    uniform mat4 u_Vmatrix;

    varying vec3 v_Color;

    void main(void) {
        v_Color = a_Color;
        gl_Position = u_Pmatrix * u_Vmatrix * u_Mmatrix * vec4(a_Position, 1.0);
    }`;

    const fsSourceUnlit = `
    precision mediump float;
    varying vec3 v_Color;
    void main(void) {
        gl_FragColor = vec4(v_Color,1.0);
    }`;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSourceUnlit);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSourceUnlit);
    gl.compileShader(fragmentShader);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);
    gl.enable(gl.DEPTH_TEST);

    var u_Pmatrix = gl.getUniformLocation(shaderProgram, 'u_Pmatrix');
    var u_Mmatrix = gl.getUniformLocation(shaderProgram, 'u_Mmatrix');
    var u_Vmatrix = gl.getUniformLocation(shaderProgram, 'u_Vmatrix');

    var a_Position = gl.getAttribLocation(shaderProgram, 'a_Position');
    var a_Color = gl.getAttribLocation(shaderProgram, 'a_Color');

    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_Color);

    const boxVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVertices), gl.STATIC_DRAW);

    const triangle_face = [
        // Front face
        0, 1, 2, 0, 2, 3,

        // Back face
        4, 5, 6, 4, 6, 7,

        // Top face
        8, 9, 10, 8, 10, 11,

        // Bottom face
        12, 13, 14, 12, 14, 15,

        // Right face
        16, 17, 18, 16, 18, 19,

        // Left face
        20, 21, 22, 20, 22, 23
    ];

    const TRIANGLE_FACES = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangle_face), gl.STATIC_DRAW);

    gl.uniformMatrix4fv(u_Pmatrix, false, PROJMATRIX);
    gl.uniformMatrix4fv(u_Mmatrix, false, MODELMATRIX);
    gl.uniformMatrix4fv(u_Vmatrix, false, VIEWMATRIX);

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 4 * (3 + 3), 0);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 4 * (3 + 3), 3 * 4);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    gl.drawElements(gl.TRIANGLES, triangle_face.length, gl.UNSIGNED_SHORT, 0);
}