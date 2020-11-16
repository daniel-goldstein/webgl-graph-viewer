const SPHERE_RADIUS = 5;
const CYLINDER_RADIUS = 1;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

let graph = {
  A: {
    neighbors: ["B", "C"],
    posn: {
      x: 10,
      y: 10,
      z: 10,
    },
  },
  B: {
    neighbors: ["C"],
    posn: {
      x: -10,
      y: 10,
      z: 0,
    },
  },
  C: {
    neighbors: [],
    posn: {
      x: -15,
      y: 0,
      z: -5,
    },
  },
};

function addGraphNodes(graph, scene) {
  Object.values(graph).forEach(({ neighbors, posn }) => {
    addNode(scene, posn);
    addOutEdges(scene, graph, posn, neighbors);
  });
}

function addNode(scene, posn) {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    geometry.translate(posn.x, posn.y, posn.z);

    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const sphere = new THREE.Mesh( geometry, material );
    scene.add(sphere);
}

function addOutEdges(scene, graph, posn, neighbors) {
  const nodeVec = new THREE.Vector3(posn.x, posn.y, posn.z);
  neighbors.forEach((name, i) => {
    const neighborPosn = graph[name].posn;
    const neighborVec = new THREE.Vector3(neighborPosn.x, neighborPosn.y, neighborPosn.z);
    const direction = new THREE.Vector3().subVectors(neighborVec, nodeVec);

    const geometry = new THREE.CylinderGeometry(CYLINDER_RADIUS, CYLINDER_RADIUS, direction.length(), 64);
    const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
    const cylinder = new THREE.Mesh( geometry, material );

    cylinder.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
    cylinder.position.copy(new THREE.Vector3().addVectors(nodeVec, direction.multiplyScalar(0.5)));

    scene.add(cylinder);
  });
}

function init() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  addGraphNodes(graph, scene);
  camera.position.z = 50;

  const animate = function () {
      requestAnimationFrame( animate );
      renderer.render( scene, camera );
  };
  animate();
}
init();
