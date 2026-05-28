/**
 * 覆斗顶四坡面项目数据
 */
export const FACES = [
  {
    id: "north",
    tag: "[ NORTH // COV_01 ]",
    title: "1:1 SCALE REPLICATION: THE BEIJING SIHEYUAN GATEHOUSE",
    epigraph: "The tectonic memory of Beijing's historical fabric.",
    href: "02-GatehouseReplication/",
    texture: "02-GatehouseReplication/profile.png",
    // 坡面四边形（覆斗：下小上大，y=0 为藻井口朝向观者）
    verts: [
      -0.55, 0, 0.55,   0.55, 0, 0.55,   2.35, 3.1, 2.05,   -2.35, 3.1, 2.05,
    ],
    textPos: [0, 1.35, 1.35],
    textRot: [-0.55, 0, 0],
  },
  {
    id: "south",
    tag: "[ SOUTH // COV_02 ]",
    title: "YUNNAN BORDER AESTHETIC EDUCATION",
    epigraph: "Critique on center-periphery through communal art.",
    href: "03-VolunteerteachingProject/",
    texture: "03-VolunteerteachingProject/profile.png",
    verts: [
      -0.55, 0, -0.55,  0.55, 0, -0.55,  2.35, 3.1, -2.05,  -2.35, 3.1, -2.05,
    ],
    textPos: [0, 1.35, -1.35],
    textRot: [0.55, 0, 0],
  },
  {
    id: "west",
    tag: "[ WEST // COV_03 ]",
    title: "DUNHUANG CAVE 285 REPLICATION",
    epigraph: "Spatial cosmology of medieval murals reconstructed.",
    href: "01-DunhuangReplication/",
    texture: "01-DunhuangReplication/profile.png",
    verts: [
      -0.55, 0, -0.55,  -0.55, 0, 0.55,  -2.35, 3.1, 2.05,  -2.35, 3.1, -2.05,
    ],
    textPos: [-1.35, 1.35, 0],
    textRot: [0, 0, 0.55],
  },
  {
    id: "east",
    tag: "[ EAST // COV_04 ]",
    title: 'THE "XUNYAO" FOLK RHYME ARCHIVING',
    epigraph: "Sonic excavation of oral histories and field recordings.",
    href: "04-FolkrhymeArchiving/",
    texture: "04-FolkrhymeArchiving/profile.png",
    verts: [
      0.55, 0, -0.55,   0.55, 0, 0.55,   2.35, 3.1, 2.05,   2.35, 3.1, -2.05,
    ],
    textPos: [1.35, 1.35, 0],
    textRot: [0, 0, -0.55],
  },
];
