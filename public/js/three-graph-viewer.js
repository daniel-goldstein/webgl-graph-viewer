/* eslint no-use-before-define: 0 */

import * as THREE from "./build/three.module.js";
import { Interaction } from "./build/three-interaction.module.js";
import { OrbitControls } from "./examples/jsm/controls/OrbitControls.js";
import sample from "../node_modules/underscore/modules/sample.js";
import terrainData from "../terrain.js";
import { STLLoader } from "./build/STLLoader.js";

const NUM_NODES = 20;
const GRAPH_BOUNDARIES = {
  x: 80,
  y: 40,
  z: 80,
};

const SPHERE_RADIUS = 1;
const CYLINDER_RADIUS = 0.2;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

const BACKGROUND_FILEPATH = "space-low.jpg";
const STAINLESS_STEEL_FILEPATH = "stainless-steel.jpg";
const LAVA_FILEPATH = "lava.jpg";

const BLUE = 0x1987f8;
const RED = 0xe9533b;
const GREEN = 0x26ebaf;

const EDGE_COLOR = RED;
const NODE_TEXTURES = [
  new THREE.Color(BLUE),
  new THREE.Color(RED),
  new THREE.Color(GREEN),
  new THREE.TextureLoader().load(STAINLESS_STEEL_FILEPATH),
  new THREE.TextureLoader().load(LAVA_FILEPATH),
];

const NUM_ANIMATION_FRAMES = 50;

const MOVEMENT_KEYS = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
const FORCE_LAYOUT_KEY = 16;
const exampleGraph = {
  A: {
    neighbors: ["B", "C", "D", "E"],
    posn: {
      x: 10,
      y: 10,
      z: 10,
    },
    texture: NODE_TEXTURES[0],
  },
  B: {
    neighbors: ["C", "E"],
    posn: {
      x: -10,
      y: 10,
      z: 0,
    },
    texture: NODE_TEXTURES[0],
  },
  C: {
    neighbors: [],
    posn: {
      x: -15,
      y: 0,
      z: -5,
    },
    texture: NODE_TEXTURES[0],
  },
  D: {
    neighbors: [],
    posn: {
      x: 10,
      y: 0,
      z: -5,
    },
    texture: NODE_TEXTURES[0],
  },
  E: {
    neighbors: [],
    posn: {
      x: -15,
      y: 20,
      z: -10,
    },
    texture: NODE_TEXTURES[0],
  },
};

function generateOriginOverlappingGraph(numNodes) {
  const nodeIDs = new Array(numNodes);
  for (let i = 0; i < numNodes; i++) {
    nodeIDs[i] = i;
  }

  return nodeIDs.reduce((graph, nodeID) => {
    graph[nodeID] = {
      posn: { x: 0, y: 0, z: 0 },
      neighbors: randomNeighbors(nodeIDs),
      texture: NODE_TEXTURES[0],
      mesh: undefined,
      edgeMeshes: {},
    };
    return graph;
  }, {});
}

function generateRandomGraph(numNodes) {
  const nodeIDs = new Array(numNodes);
  for (let i = 0; i < numNodes; i++) {
    nodeIDs[i] = i;
  }

  return nodeIDs.reduce((graph, nodeID) => {
    graph[nodeID] = {
      posn: randomPosition(),
      neighbors: randomNeighbors(nodeIDs),
      texture: NODE_TEXTURES[0],
      mesh: undefined,
      edgeMeshes: {},
    };
    return graph;
  }, {});
}

function randomPosition() {
  return {
    x: Math.random() * GRAPH_BOUNDARIES.x - GRAPH_BOUNDARIES.x / 2,
    y: Math.random() * GRAPH_BOUNDARIES.y,
    z: Math.random() * GRAPH_BOUNDARIES.z - GRAPH_BOUNDARIES.z / 2,
  };
}

function randomNeighbors(nodeIDs) {
  const numNeighbors = Math.max(
    Math.floor(Math.random() * (nodeIDs.length / 4)),
    1
  );
  if (numNeighbors === 1) {
    return [sample(nodeIDs)];
  }
  return sample(nodeIDs, numNeighbors);
}

function getNodePositions(graph) {
  let positions = {};
  Object.entries(graph).forEach(([nodeID, node]) => {
    positions[nodeID] = node.posn;
  });
  return positions;
}

function randomNodePositions(graph) {
  let positions = {};
  Object.entries(graph).forEach(([nodeID, _]) => {
    positions[nodeID] = randomPosition();
  });
  return positions;
}

// Adapted from the first algorithm in Spring Systems and Electrical Forces
// here: http://cs.brown.edu/people/rtamassi/gdhandbook/chapters/force-directed.pdf
// To preserve the approximate size of the graph while "spreading out" the nodes
// as much as possible, the distance of a node from the origin is fixed, but is
// rotated based on the forces exerted by other nodes.
function forceDirectedLayout(graph) {
  const nodeVectors = posnsToVectors(getNodePositions(graph));
  const maxIterations = 2500;
  const c1 = 200;
  const c2 = 1;
  const c3 = 100;
  const c4 = 1;
  const epsilon = 0.001; // a little jitter to prevent divide by zero

  const nodeIDs = Object.keys(graph);
  for (let i = 0; i < maxIterations; i += 1) {
    const forceOnNode = nodeIDs.reduce((forceOn, nodeID) => {
      forceOn[nodeID] = new THREE.Vector3();
      return forceOn;
    }, {});

    // calculate forces between every pair of nodes
    for (let j = 0; j < nodeIDs.length; j += 1) {
      const nodeID = nodeIDs[j];
      const nodeVec = nodeVectors[nodeID];
      for (let k = j + 1; k < nodeIDs.length; k += 1) {
        const otherID = nodeIDs[k];
        const otherVec = nodeVectors[otherID];
        const force = new THREE.Vector3()
          .subVectors(otherVec, nodeVec)
          .normalize();

        let scale;
        if (
          graph[nodeID].neighbors.includes(otherID) ||
          graph[otherID].neighbors.includes(nodeID)
        ) {
          // if they're neighbors, there is an attractive spring force between them
          scale = c1 * Math.log((nodeVec.distanceTo(otherVec) + epsilon) / c2);
        } else {
          // there is a repulsive force proportional to the inverse squared distance
          scale = -(c3 / (nodeVec.distanceToSquared(otherVec) + epsilon));
        }
        force.multiplyScalar(scale * c4);

        forceOnNode[nodeID].add(force);
        forceOnNode[otherID].add(force.multiplyScalar(-1));
      }
    }

    // act on node positions by forces on them
    Object.entries(forceOnNode).forEach(([nodeID, force]) => {
      const v = nodeVectors[nodeID];
      // preserve distance of node to origin so that the graph doesn't expand
      const prevLength = v.length();
      v.add(force).multiplyScalar(prevLength / v.length());
    });
  }

  return vectorsToPosns(nodeVectors);
}

function posnsToVectors(posns) {
  return Object.entries(posns).reduce((vecs, [nodeID, posn]) => {
    vecs[nodeID] = new THREE.Vector3(posn.x, posn.y, posn.z);
    return vecs;
  }, {});
}

function vectorsToPosns(vecs) {
  return Object.entries(vecs).reduce((posns, [nodeID, v]) => {
    posns[nodeID] = { x: v.x, y: v.y, z: v.z };
    return posns;
  }, {});
}

function* randomizeGraphAnimation(graph, layoutAlgorithm) {
  const nodeStartingPositions = getNodePositions(graph);
  const nodeDestinations = layoutAlgorithm(graph);

  for (let i = 0; i < NUM_ANIMATION_FRAMES; i++) {
    Object.entries(graph).forEach(([nodeID, node]) => {
      const startPosn = nodeStartingPositions[nodeID];
      const endPosn = nodeDestinations[nodeID];
      const startVec = new THREE.Vector3(startPosn.x, startPosn.y, startPosn.z);
      const endVec = new THREE.Vector3(endPosn.x, endPosn.y, endPosn.z);
      const direction = new THREE.Vector3().subVectors(endVec, startVec);

      const xOffset = direction.x / NUM_ANIMATION_FRAMES;
      const yOffset = direction.y / NUM_ANIMATION_FRAMES;
      const zOffset = direction.z / NUM_ANIMATION_FRAMES;

      node.posn.x += xOffset;
      node.posn.y += yOffset;
      node.posn.z += zOffset;

      node.mesh.geometry.translate(xOffset, yOffset, zOffset);
      node.mesh.geometry.verticesNeedUpdate = true; // re-render this node on the next animate loop
    });

    Object.values(graph).forEach((node) => {
      Object.entries(node.edgeMeshes).forEach(([neighborName, cylinder]) => {
        alignEdgeWithNodes(cylinder, node.posn, graph[neighborName].posn);
        cylinder.geometry.verticesNeedUpdate = true;
      });
    });

    yield graph;
  }
}

const world = {
  graph: generateOriginOverlappingGraph(NUM_NODES),
};

let animationGenerator;
document.addEventListener("keyup", (event) => {
  const k = event.keyCode;
  if (!Object.values(MOVEMENT_KEYS).includes(k)) {
    const algorithm =
      k === FORCE_LAYOUT_KEY ? forceDirectedLayout : randomNodePositions;
    animationGenerator = randomizeGraphAnimation(world.graph, algorithm);
  }
});

function init() {
  const scene = initScene();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = 75;

  const controls = new OrbitControls(camera, renderer.domElement);
  const interaction = new Interaction(renderer, scene, camera);

  const spotlight = initSpotlight();
  const ground = initGroundMesh();
  scene.add(spotlight);
  scene.add(ground);

  initStarMesh(scene);

  initGraphThreeObjects(world.graph);
  addGraphToScene(scene, world.graph);
  animationGenerator = randomizeGraphAnimation(
    world.graph,
    randomNodePositions
  );

  const animate = () => {
    // Move the animation forward if there is one ongoing
    animationGenerator.next();

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

function initScene() {
  const scene = new THREE.Scene();
  const texture = new THREE.TextureLoader().load(BACKGROUND_FILEPATH);
  scene.background = texture;
  return scene;
}

function initSpotlight() {
  const spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2);
  spotLight.position.set(0, 100, 0);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;
  return spotLight;
}

function initGroundMesh() {
  const geometry = new THREE.PlaneGeometry(60, 60, 199, 199);
  for (let i = 0; i < geometry.vertices.length; i++) {
    geometry.vertices[i].z = (terrainData[i] / 65535) * 25;
  }
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -30, 0);

  const material = new THREE.MeshPhongMaterial({
    color: 0x875b3b,
    wireframe: true,
  });

  return new THREE.Mesh(geometry, material);
}

function initStarMesh(scene) {
  const loader = new STLLoader();
  loader.load("You_Tried.stl", function (geometry) {
    const material = new THREE.MeshPhongMaterial({
      color: 0xff5533,
      specular: 0x111111,
      shininess: 200,
    });
    const starMesh = new THREE.Mesh(geometry, material);

    starMesh.position.set(-80, 20, 0);
    starMesh.rotation.set(0, Math.PI / 2, 0);

    starMesh.castShadow = true;
    starMesh.receiveShadow = true;
    scene.add(starMesh);
  });
}

function addGraphToScene(scene, graph) {
  Object.values(graph).forEach((node) => {
    scene.add(node.mesh);
    Object.values(node.edgeMeshes).forEach((edge) => scene.add(edge));
  });
}

function initGraphThreeObjects(graph) {
  Object.values(graph).forEach((node) => {
    initNodeMesh(node);
    initOutEdgeMeshes(graph, node);
  });
}

function initNodeMesh(node) {
  const { posn, texture } = node;
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
  geometry.translate(posn.x, posn.y, posn.z);

  const material = new THREE.MeshPhongMaterial();
  assignNodeTexture(material, texture);

  const sphere = new THREE.Mesh(geometry, material);
  sphere.on("mouseup", () => updateNodeTexture(node, sphere.material));
  node.mesh = sphere;
}

function updateNodeTexture(node, material) {
  const texture = nextNodeTexture(node.texture);
  node.texture = texture;
  assignNodeTexture(material, texture);
  material.needsUpdate = true;
}

function nextNodeTexture(nodeTexture) {
  const nodeTextureIndex = NODE_TEXTURES.indexOf(nodeTexture);
  return NODE_TEXTURES[(nodeTextureIndex + 1) % NODE_TEXTURES.length];
}

function assignNodeTexture(material, texture) {
  if (texture instanceof THREE.Color) {
    material.map = undefined;
    material.color = texture;
  } else {
    material.color = undefined;
    material.map = texture;
  }
}

function initOutEdgeMeshes(graph, node) {
  const { posn, neighbors } = node;
  neighbors.forEach((neighborName) => {
    const geometry = new THREE.CylinderGeometry(
      CYLINDER_RADIUS,
      CYLINDER_RADIUS,
      1,
      64
    );
    const material = new THREE.MeshPhongMaterial();
    material.color = new THREE.Color(EDGE_COLOR);
    const cylinder = new THREE.Mesh(geometry, material);
    alignEdgeWithNodes(cylinder, posn, graph[neighborName].posn);

    node.edgeMeshes[neighborName] = cylinder;
  });
}

function alignEdgeWithNodes(cylinder, posn, neighborPosn) {
  const nodeVec = new THREE.Vector3(posn.x, posn.y, posn.z);
  const neighborVec = new THREE.Vector3(
    neighborPosn.x,
    neighborPosn.y,
    neighborPosn.z
  );
  const direction = new THREE.Vector3().subVectors(neighborVec, nodeVec);
  cylinder.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
  cylinder.position.copy(
    new THREE.Vector3().addVectors(nodeVec, direction.multiplyScalar(0.5))
  );
  cylinder.scale.set(1, 2 * direction.length(), 1);
}

init();
