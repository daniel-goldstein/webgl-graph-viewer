let gl;
let webglGlobals;

let camera = {
  translation: { x: 0, y: 0, z: 50 },
  rotation: { x: 0, y: 0, z: 0 },
};

let graph = {
  A: {
    neighbors: ["B", "C"],
    posn: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  B: {
    neighbors: ["C"],
    posn: {
      x: 10,
      y: 10,
      z: 10,
    },
  },

  C: {
    neighbors: [],
    posn: {
      x: -20,
      y: 20,
      z: 20,
    },
  },
};

const fieldOfViewRadians = m4.degToRad(60);
const fieldOfViewZNear = 1;
const fieldOfViewZFar = 2000;
const lightSource = [0.4, 0.3, 0.5];

function init() {
  const canvas = document.querySelector("#canvas");
  gl = canvas.getContext("webgl");

  webglGlobals = createProgramAndFetchWebglGlobals();
  gl.enableVertexAttribArray(webglGlobals.attributeCoords);
  gl.enableVertexAttribArray(webglGlobals.attributeNormals);

  initCanvas(webglGlobals);
}

function createProgramAndFetchWebglGlobals() {
  const vertexShaderElement = document.querySelector("#vertex-shader-3d");
  const fragmentShaderElement = document.querySelector("#fragment-shader-3d");

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertexShader, vertexShaderElement.text);
  gl.shaderSource(fragmentShader, fragmentShaderElement.text);
  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.useProgram(program);
  return fetchWebGLGlobals(program);
}

function fetchWebGLGlobals(program) {
  const attributeCoords = gl.getAttribLocation(program, "a_coords");

  // const uniformResolution = gl.getUniformLocation(program, "u_resolution");
  const uniformColor = gl.getUniformLocation(program, "u_color");

  const bufferCoords = gl.createBuffer();
  const attributeNormals = gl.getAttribLocation(program, "a_normals");
  const normalBuffer = gl.createBuffer();
  const uniformWorldViewProjection = gl.getUniformLocation(
    program,
    "u_worldViewProjection"
  );
  const uniformWorldInverseTranspose = gl.getUniformLocation(
    program,
    "u_worldInverseTranspose"
  );
  const uniformReverseLightDirectionLocation = gl.getUniformLocation(
    program,
    "u_reverseLightDirection"
  );

  return {
    attributeCoords,
    uniformResolution,
    uniformColor,
    bufferCoords,
    attributeNormals,
    normalBuffer,
    uniformWorldViewProjection,
    uniformWorldInverseTranspose,
    uniformReverseLightDirectionLocation,
  };
}

function initCanvas(webGlGlobals) {
  // TODO do we need this next call?
  gl.uniform2f(
    webGlGlobals.uniformResolution,
    gl.canvas.width,
    gl.canvas.height
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function render() {
  prepareBuffers();

  const cameraMatrix = makeCameraMatrix();
  const projectionMatrix = makeProjectionMatrix();
  const viewProjectionMatrix = m4.multiply(projectionMatrix, cameraMatrix);

  gl.uniformMatrix4fv(
    webglGlobals.uniformWorldViewProjection,
    false,
    viewProjectionMatrix
  );
  gl.uniformMatrix4fv(
    webglGlobals.uniformWorldInverseTranspose,
    false,
    m4.identity()
  );

  gl.uniform3fv(
    webglGlobals.uniformReverseLightDirectionLocation,
    m4.normalize(lightSource)
  );

  graph.forEach((node) => {
    gl.uniform4f(webglGlobals.uniformColor, ...randomColor(), 1);

    let nodePositionMatrix = m4.translate(
      viewProjectionMatrix,
      node.posn.x,
      node.posn.y,
      node.posn.z
    );
    gl.uniformMatrix4fv(
      webglGlobals.uniformWorldViewProjection,
      false,
      nodePositionMatrix
    );

    renderNode();
  });
}

function prepareBuffers() {
  prepareNormalBuffer();
  prepareVertexBuffer();

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
}

function prepareVertexBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, webglGlobals.bufferCoords); // prepare buffer to populate vertices

  // configure how to consume buffer and populate
  gl.vertexAttribPointer(
    webglGlobals.attributeCoords,
    3, // size = 2 components per iteration, i.e., (x, y)
    gl.FLOAT, // type = gl.FLOAT; i.e., the data is 32bit floats
    false, // normalize = false; i.e., don't normalize
    0, // stride = 0; ==> move forward size * sizeof(type) each iteration to get the next position
    0 // offset = 0; i.e., start at beginning of buffer
  );
}

function prepareNormalBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, webglGlobals.normalBuffer);
  gl.vertexAttribPointer(
    webglGlobals.attributeNormals,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
}

function makeCameraMatrix() {
  let cameraMatrix = m4.translate(
    m4.identity(),
    camera.translation.x,
    camera.translation.y,
    camera.translation.z
  );

  const cameraPosition = [cameraMatrix[12], cameraMatrix[13], cameraMatrix[14]];
  cameraMatrix = m4.lookAt(cameraPosition, target, UP);
  cameraMatrix = m4.inverse(cameraMatrix);
  return cameraMatrix;
}

function makeProjectionMatrix() {
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  return m4.perspective(
    fieldOfViewRadians,
    aspect,
    fieldOfViewZNear,
    fieldOfViewZFar
  );
}

function randomColor() {
  return [1, 1, 1];
}

function renderNode() {}
