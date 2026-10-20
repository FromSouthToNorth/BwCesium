<template>
  <div id="output" ref="output"></div>
</template>
<script setup lang="ts">
import { onMounted, unref, ref } from 'vue';
import { WebGLRenderer, Scene, PerspectiveCamera, PointsMaterial, Points } from 'three'
import { CENTER } from 'three-mesh-bvh'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { fun } from '@/components/GroupAndCompany/src/fun';

const output = ref<any>(null);

onMounted(() => {
  init();
})
let renderer;
let scene;
let camera;
let pointCloud;
const params = {
  displayHelper: false,
  helperDepth: 10,
  displayParents: false,
  strategy: CENTER,
  pointSize: 0.005,
  raycastThreshold: 0.005,
  useBVH: true,
};
function init() {
  const bgColor = 0x263238 / 2;
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(bgColor, 1);
  console.log(output);
  output.value.appendChild(renderer.domElement);

  scene = new Scene();

  // camera setup
  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(3, 3, 3);
  camera.far = 100;
  camera.updateProjectionMatrix();

  window.addEventListener('resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

  }, false);

  // Load point cloud
  const loader = new PLYLoader();
  loader.load('/src/assets/models/110kv.ply', function (geometry) {
    console.log('geometry: ', geometry);
    geometry.center();
    const material = new PointsMaterial({ size: params.pointSize, vertexColors: true });
    pointCloud = new Points(geometry, material);
    pointCloud.matrixAutoUpdate = false;
    console.log(pointCloud);
    scene.add(pointCloud)
  })
}

</script>
