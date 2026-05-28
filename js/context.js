/**
 * 纪念碑 3D 场景共享上下文
 */
export function createMonumentContext({
  host,
  scene,
  camera,
  renderer,
  controls,
  isMobile = false,
  monument = null,
  slopeMeshes = [],
  textMeshes = [],
  blueprintGroup = null,
  zaojingGroup = null,
}) {
  const interaction = {
    hoveredId: null,
    touchingMonument: false,
  };

  return {
    host,
    scene,
    camera,
    renderer,
    controls,
    isMobile,
    monument,
    slopeMeshes,
    textMeshes,
    blueprintGroup,
    zaojingGroup,
    interaction,
  };
}
