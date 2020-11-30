/* eslint no-use-before-define: 0 */

import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./examples/jsm/controls/OrbitControls.js";
import addKeyHandlers from "./KeyHandlers.js";

const SPHERE_RADIUS = 5;
const CYLINDER_RADIUS = 1;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

const SCENE_COLOR = 0xfaf4da;
const NODE_COLOR = 0x1987f8;
const EDGE_COLOR = 0xe9533b;

const BACKGROUND_FILEPATH = "space.jpeg";

const exampleGraph = {
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

  addGraph(scene, exampleGraph);
  camera.position.z = 50;

  const controls = new OrbitControls(camera, renderer.domElement);
  addKeyHandlers(document);
  const animate = () => {
    requestAnimationFrame(animate);
    // controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

function initScene() {
  const scene = new THREE.Scene();
  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(0, 0, 100);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;

  scene.add(spotLight);

  const texture = new THREE.TextureLoader().load(BACKGROUND_FILEPATH);
  scene.background = texture;
  return scene;
}

function addGraph(scene, graph) {
  Object.values(graph).forEach(({ neighbors, posn }) => {
    addNode(scene, posn);
    addOutEdges(scene, graph, posn, neighbors);
  });
}

function addNode(scene, posn) {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
  geometry.translate(posn.x, posn.y, posn.z);

  const material = new THREE.MeshPhongMaterial();
  material.color = new THREE.Color(NODE_COLOR);

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
}

function addOutEdges(scene, graph, posn, neighbors) {
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
