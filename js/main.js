/**

 * Wen Tian Architecture — 3D 覆斗顶纪念碑

 * Three.js + OrbitControls + 坡面贴图 + 线稿 + 3D 文字平面

 */

import * as THREE from "three";

import { setupScene } from "./scene/setup-scene.js";

import { createMonumentContext } from "./context.js";

import { buildMonument } from "./monument/build-monument.js";

import { createCameraFitter } from "./camera/fit-monument.js";

import { createTransitionController } from "./transition/transition.js";

import { setupInteraction } from "./interaction/interaction.js";



const sceneSetup = setupScene();

const ctx = createMonumentContext(sceneSetup);



buildMonument(ctx);



const { fitCameraToMonumentScreenHeight } = createCameraFitter(ctx);

fitCameraToMonumentScreenHeight();



const transition = createTransitionController(ctx);

setupInteraction(ctx, transition);



const clock = new THREE.Clock();

const IDLE_ROTATION_SPEED = 0.072;

const HOVER_ROTATION_SPEED = 0.0058;



function animate() {

  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);



  if (transition.isTransitioning) {

    transition.updateTransition();

  } else {

    ctx.controls.update();

    const speed = ctx.interaction.touchingMonument

      ? HOVER_ROTATION_SPEED

      : IDLE_ROTATION_SPEED;

    ctx.monument.rotation.y += speed * delta;

  }

  ctx.renderer.render(ctx.scene, ctx.camera);

}

animate();



window.addEventListener("resize", () => {

  ctx.camera.aspect = window.innerWidth / window.innerHeight;

  ctx.camera.updateProjectionMatrix();

  ctx.renderer.setSize(window.innerWidth, window.innerHeight);

  fitCameraToMonumentScreenHeight();

});

