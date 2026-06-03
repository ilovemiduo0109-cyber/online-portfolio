import * as THREE from "three";



/** Bump when project images change (forces monument to reload textures). */

export const TEXTURE_CACHE_BUST = "7";



/**

 * Resolve a project image path from site root (index.html location).

 * Query bust avoids stale browser / Three.js Cache after replacing hero.jpg.

 */

export function resolveProjectTexture(path) {

  const clean = path.replace(/\?.*$/, "");

  const url = new URL(clean, document.baseURI);

  url.searchParams.set("v", TEXTURE_CACHE_BUST);

  return url.href;

}



export function createProjectTextureLoader() {

  THREE.Cache.enabled = false;

  const loader = new THREE.TextureLoader();

  if (location.protocol === "http:" || location.protocol === "https:") {

    loader.setCrossOrigin("anonymous");

  }

  return loader;

}



/** 透明底梯形 profile.png：保留 RGBA alpha，不做 premultiply */

export function configureSlopeProfileTexture(tex) {

  tex.colorSpace = THREE.SRGBColorSpace;

  tex.premultiplyAlpha = false;

  tex.format = THREE.RGBAFormat;

  tex.needsUpdate = true;

  return tex;

}



export function loadProjectTexture(loader, path) {

  return new Promise((resolve, reject) => {

    loader.load(resolveProjectTexture(path), resolve, undefined, reject);

  });

}

