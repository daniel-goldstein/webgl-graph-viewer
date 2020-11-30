/* eslint no-use-before-define: 0 */

import * as THREE from "./build/three.module.js";
import { Interaction } from "./build/three-interaction.module.js";
import { OrbitControls } from "./examples/jsm/controls/OrbitControls.js";

const SPHERE_RADIUS = 5;
const CYLINDER_RADIUS = 1;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

const BACKGROUND_FILEPATH = "space.jpeg";
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

const exampleGraph = {
  A: {
    neighbors: ["B", "C"],
    posn: {
      x: 10,
      y: 10,
      z: 10,
    },
    texture: NODE_TEXTURES[0],
  },
  B: {
    neighbors: ["C"],
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
};

const world = {
  graph: exampleGraph,
};

var somethingHasChanged = true;

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

  camera.position.z = 50;

  const controls = new OrbitControls(camera, renderer.domElement);
  const interaction = new Interaction(renderer, scene, camera);
  const animate = () => {
    if (somethingHasChanged) {
      addGraphToScene(scene, world.graph);
      somethingHasChanged = false;
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
  spotLight.position.set(0, 0, 100);

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
  scene.add(initSpotlight());
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
  if (texture instanceof THREE.Color) {
    material.map = undefined;
    material.color = texture;
  } else {
    material.color = undefined;
    material.map = texture;
  }

  const sphere = new THREE.Mesh(geometry, material);
  sphere.on("mousedown", () => updateNodeTexture(node));

  scene.add(sphere);
}

function updateNodeTexture(node) {
  node.texture = nextNodeTexture(node.texture);
  somethingHasChanged = true;
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
    const direction = new THREE.Vector3().subVectors(neighborVec, nodeVec);

    const geometry = new THREE.CylinderGeometry(
      CYLINDER_RADIUS,
      CYLINDER_RADIUS,
      direction.length(),
      64
    );
    const material = new THREE.MeshPhongMaterial();
    material.color = new THREE.Color(EDGE_COLOR);

    const cylinder = new THREE.Mesh(geometry, material);

    cylinder.quaternion.setFromUnitVectors(
      Y_AXIS,
      direction.clone().normalize()
    );
    cylinder.position.copy(
      new THREE.Vector3().addVectors(nodeVec, direction.multiplyScalar(0.5))
    );

    scene.add(cylinder);
  });
}

init();
