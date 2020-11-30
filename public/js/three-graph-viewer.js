/* eslint no-use-before-define: 0 */

import * as THREE from "./build/three.module.js";
import { Interaction } from "./build/three-interaction.module.js";
import { OrbitControls } from "./examples/jsm/controls/OrbitControls.js";
import sample from "../node_modules/underscore/modules/sample.js";
import terrainData from "../terrain.js";

const SPHERE_RADIUS = 1;
const CYLINDER_RADIUS = 0.2;

const GRAPH_BOUNDARIES = {
  x: 50,
  y: 40,
  z: 50,
};

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

const NUM_NODES = 15;
const NUM_ANIMATION_FRAMES = 50;

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
  const numNeighbors = Math.floor(Math.random() * (nodeIDs.length / 3));
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

function* randomizeGraphAnimation(graph) {
  const nodeStartingPositions = getNodePositions(graph);
  const nodeDestinations = randomNodePositions(graph);

  for (let i = 0; i < NUM_ANIMATION_FRAMES; i++) {
    Object.entries(graph).forEach(([nodeID, node]) => {
      const startPosn = nodeStartingPositions[nodeID];
      const endPosn = nodeDestinations[nodeID];
      const startVec = new THREE.Vector3(startPosn.x, startPosn.y, startPosn.z);
      const endVec = new THREE.Vector3(endPosn.x, endPosn.y, endPosn.z);
      const direction = new THREE.Vector3().subVectors(endVec, startVec);

      node.posn.x += direction.x / NUM_ANIMATION_FRAMES;
      node.posn.y += direction.y / NUM_ANIMATION_FRAMES;
      node.posn.z += direction.z / NUM_ANIMATION_FRAMES;
    });

    yield graph;
  }
}

const randomGraph = generateRandomGraph(NUM_NODES);
const world = {
  graph: randomGraph,
};

let animationGenerator = randomizeGraphAnimation(world.graph);

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

  const animate = () => {
    const { value, done } = animationGenerator.next();
    if (!done) {
      world.graph = value;
      addGraphToScene(scene, world.graph);
      scene.add(spotlight);
      scene.add(ground);
    }

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
  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(0, 100, 0);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;
  return spotLight;
}

function addGraphToScene(scene, graph) {
  while (scene.children.length) {
    scene.remove(scene.children[0]);
  }
  Object.entries(graph).forEach(([nodeID, node]) => {
    addNodeToScene(scene, nodeID, node);
    addOutEdgesToScene(scene, graph, node);
  });
}

function addNodeToScene(scene, nodeID, node) {
  const { posn, texture } = node;
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
  geometry.translate(posn.x, posn.y, posn.z);

  const material = new THREE.MeshPhongMaterial();
  assignNodeTexture(material, node.texture);

  const sphere = new THREE.Mesh(geometry, material);
  sphere.on("mousedown", () => updateNodeTexture(node, sphere.material));

  scene.add(sphere);
}

function updateNodeTexture(node, material) {
  const texture = nextNodeTexture(node.texture);
  node.texture = texture;
  assignNodeTexture(material, texture);
  material.needsUpdate = true;
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

function nextNodeTexture(nodeTexture) {
  const nodeTextureIndex = NODE_TEXTURES.indexOf(nodeTexture);
  return NODE_TEXTURES[(nodeTextureIndex + 1) % NODE_TEXTURES.length];
}

function addOutEdgesToScene(scene, graph, node) {
  const { posn, neighbors } = node;
  const nodeVec = new THREE.Vector3(posn.x, posn.y, posn.z);
  neighbors.forEach((name) => {
    const neighborPosn = graph[name].posn;
    const neighborVec = new THREE.Vector3(
      neighborPosn.x,
      neighborPosn.y,
      neighborPosn.z
    );

    const geometry = new THREE.CylinderGeometry(
      CYLINDER_RADIUS,
      CYLINDER_RADIUS,
      1,
      64
    );
    const material = new THREE.MeshPhongMaterial();
    material.color = new THREE.Color(EDGE_COLOR);
    const cylinder = new THREE.Mesh(geometry, material);

    const direction = new THREE.Vector3().subVectors(neighborVec, nodeVec);
    alignEdgeWithNodes(cylinder, nodeVec, direction);

    scene.add(cylinder);
  });
}

function alignEdgeWithNodes(cylinder, nodeVec, direction) {
  cylinder.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
  cylinder.position.copy(
    new THREE.Vector3().addVectors(nodeVec, direction.multiplyScalar(0.5))
  );
  cylinder.geometry.scale(1, 2 * direction.length(), 1);
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

init();
