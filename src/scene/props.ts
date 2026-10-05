import * as THREE from 'three';
import { MAT_WOOD, MAT_WOOD_LIGHT, MAT_LEAF, MAT_ROCK, MAT_ROOF, MAT_RED, MAT_METAL, MAT_NEON_PINK } from './materials';
import { createLabel } from './avatars';

export function createPalmTree(x: number, z: number, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.set(scale, scale, scale);
  const numSegments = 6;
  for (let i = 0; i < numSegments; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.3 - i*0.03, 0.4 - i*0.04, 1.2, 7), MAT_WOOD);
    seg.position.set(Math.sin(i*0.2)*0.5, i * 1.0 + 0.6, Math.cos(i*0.2)*0.5);
    seg.rotation.set(-0.15, 0, -0.15); seg.castShadow = true; group.add(seg);
  }
  const topPos = new THREE.Vector3(Math.sin((numSegments-1)*0.2)*0.5, (numSegments-1)*1.0 + 1.0, Math.cos((numSegments-1)*0.2)*0.5);
  for(let i = 0; i < 3; i++) {
    const coconut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), MAT_WOOD);
    coconut.position.copy(topPos).add(new THREE.Vector3(Math.cos(i*Math.PI*2/3)*0.4, -0.2, Math.sin(i*Math.PI*2/3)*0.4));
    coconut.castShadow = true; group.add(coconut);
  }
  for (let i = 0; i < 8; i++) {
    const leafGroup = new THREE.Group(); leafGroup.position.copy(topPos);
    leafGroup.rotation.y = (i * Math.PI * 2) / 8; leafGroup.rotation.x = 0.5 + Math.random() * 0.4;
    const leafGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([0,0,0, 1,0,1.5, 0,0,4, -1,0,1.5]);
    leafGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    leafGeo.setIndex([0,1,2, 0,2,3]); leafGeo.computeVertexNormals();
    const leaf = new THREE.Mesh(leafGeo, MAT_LEAF); leaf.material.side = THREE.DoubleSide; leaf.castShadow = true;
    leafGroup.add(leaf); group.add(leafGroup);
  }
  return group;
}

export function createSunLounger(x: number, z: number, rotY: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const leftF = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 2), MAT_WOOD_LIGHT); leftF.position.set(-0.4, 0.2, 0); leftF.castShadow = true; g.add(leftF);
  const rightF = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 2), MAT_WOOD_LIGHT); rightF.position.set(0.4, 0.2, 0); rightF.castShadow = true; g.add(rightF);
  const fabricGeo = new THREE.PlaneGeometry(0.7, 2, 1, 4); const pos = fabricGeo.attributes.position;
  for(let i=0; i<pos.count; i++) { const py = pos.getY(i); pos.setZ(i, py > 0 ? py*0.6 : -0.1); }
  fabricGeo.computeVertexNormals();
  const fabric = new THREE.Mesh(fabricGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  fabric.position.set(0, 0.35, 0); fabric.rotation.x = -Math.PI/2; fabric.castShadow = true; g.add(fabric);
  return g;
}

export function createUmbrella(x: number, z: number, color1: number, color2: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), MAT_WOOD); pole.position.y = 1.5; pole.castShadow = true; g.add(pole);
  const topGeo = new THREE.ConeGeometry(2, 0.8, 8);
  const topMat = [new THREE.MeshStandardMaterial({ color: color1, flatShading: true }), new THREE.MeshStandardMaterial({ color: color2, flatShading: true })];
  for(let i=0; i<8; i++) topGeo.groups.push({ start: i*6, count: 6, materialIndex: i%2 });
  const top = new THREE.Mesh(topGeo, topMat); top.position.y = 3; top.castShadow = true; g.add(top);
  return g;
}

export function createTikiHut(x: number, z: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), MAT_WOOD_LIGHT); base.position.y = 0.1; base.castShadow = true; g.add(base);
  for(let px of [-1.8, 1.8]) for(let pz of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5), MAT_WOOD); post.position.set(px, 1.35, pz); post.castShadow = true; g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.5, 6), MAT_ROOF); roof.position.y = 3.2; roof.castShadow = true; g.add(roof);
  return g;
}

export function createStall(x: number, z: number, rotY: number, type: 'coconut' | 'icecream' | 'surf') {
  const g = createTikiHut(x, z, rotY);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), MAT_WOOD_LIGHT); counter.position.set(0, 0.6, 1.3); counter.castShadow = true; g.add(counter);
  if (type === "coconut") {
    for(let i=0; i<5; i++) {
      const coc = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), MAT_WOOD); coc.position.set(-1 + i*0.5, 1.2, 1.3 + (Math.random()-0.5)*0.2); coc.castShadow = true; g.add(coc);
    }
  } else if (type === "icecream") {
    const sign = createLabel("ICE CREAM", "#ff88cc"); sign.position.set(0, 4, 0); g.add(sign);
  } else if (type === "surf") {
    for(let i=0; i<4; i++) {
      const surf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.05), new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
      surf.position.set(-1.2 + i*0.8, 1.1, -1.5); surf.rotation.x = 0.2; surf.castShadow = true; g.add(surf);
    }
  }
  return g;
}

export function createWalkway(x: number, z: number, length: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const numPlanks = Math.floor(length / 0.4);
  for(let i=0; i<numPlanks; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 0.35), MAT_WOOD_LIGHT);
    plank.position.set(0, 0.02, (i - numPlanks/2)*0.4); plank.rotation.y = (Math.random()-0.5)*0.1; plank.rotation.z = (Math.random()-0.5)*0.05;
    plank.castShadow = true; plank.receiveShadow = true; g.add(plank);
  }
  return g;
}

export function createCloud(x: number, y: number, z: number, scale: number) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.set(scale, scale, scale);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true });
  const pos = [[0,0,0, 2], [1.5, -0.2, 0.5, 1.5], [-1.5, -0.2, -0.5, 1.5], [0.8, 0.5, -0.8, 1.2], [-0.8, 0.5, 0.8, 1.2]];
  for (const [px, py, pz, s] of pos) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mat); m.position.set(px, py, pz); m.castShadow = true; g.add(m);
  }
  return g;
}


// --- NEW INTERACTIVE ASSETS & DECORATIONS ---
const MAT_RED = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
const MAT_FIRE = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
const MAT_NEON_PINK = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });

export function createLifeguardTower(x: number, z: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  for(let px of [-1, 1]) for(let pz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3), MAT_WOOD);
    post.position.set(px, 1.5, pz); post.castShadow = true; g.add(post);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), MAT_WOOD_LIGHT);
  deck.position.y = 3; deck.castShadow = true; g.add(deck);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), MAT_RED);
  hut.position.y = 4.1; hut.castShadow = true; g.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1, 4), MAT_WOOD);
  roof.position.y = 5.6; roof.rotation.y = Math.PI/4; roof.castShadow = true; g.add(roof);
  return g;
}

export function createLogSeat(x: number, z: number, rotY: number, interactive: boolean = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2), MAT_WOOD);
  log.rotation.z = Math.PI / 2; log.position.y = 0.3; log.castShadow = true; g.add(log);
  if (interactive) {
    const lbl = createLabel("SIT [E]", "#00ffff");
    lbl.position.y = 1.2; g.add(lbl);
  }
  return g;
}

export function createBeachChair(x: number, z: number, rotY: number, interactive: boolean = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xffaa00, side: THREE.DoubleSide }));
  cloth.rotation.x = -Math.PI / 3; cloth.position.set(0, 0.6, 0); g.add(cloth);
  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), MAT_WOOD_LIGHT); leg1.rotation.x = Math.PI / 4; leg1.position.set(-0.5, 0.5, 0); g.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), MAT_WOOD_LIGHT); leg2.rotation.x = -Math.PI / 4; leg2.position.set(-0.5, 0.5, 0); g.add(leg2);
  const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), MAT_WOOD_LIGHT); leg3.rotation.x = Math.PI / 4; leg3.position.set(0.5, 0.5, 0); g.add(leg3);
  const leg4 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), MAT_WOOD_LIGHT); leg4.rotation.x = -Math.PI / 4; leg4.position.set(0.5, 0.5, 0); g.add(leg4);
  if (interactive) {
    const lbl = createLabel("SIT [E]", "#00ffff");
    lbl.position.y = 1.5; g.add(lbl);
  }
  return g;
}

export function createBench(x: number, z: number, rotY: number, interactive: boolean = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), MAT_WOOD);
  seat.position.y = 0.5; seat.castShadow = true; g.add(seat);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), MAT_WOOD_LIGHT);
  leg1.position.set(-0.8, 0.25, 0); g.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), MAT_WOOD_LIGHT);
  leg2.position.set(0.8, 0.25, 0); g.add(leg2);
  if (interactive) {
    const lbl = createLabel("SIT [E]", "#00ffff");
    lbl.position.y = 1.5; g.add(lbl);
  }
  return g;
}

export function createPicnicTable(x: number, z: number, rotY: number, interactive: boolean = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), MAT_WOOD);
  table.position.y = 0.8; table.castShadow = true; g.add(table);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1), MAT_WOOD_LIGHT);
  leg1.position.set(-1, 0.4, 0); g.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1), MAT_WOOD_LIGHT);
  leg2.position.set(1, 0.4, 0); g.add(leg2);
  const seat1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.4), MAT_WOOD);
  seat1.position.set(0, 0.4, 0.9); seat1.castShadow = true; g.add(seat1);
  const seat2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.4), MAT_WOOD);
  seat2.position.set(0, 0.4, -0.9); seat2.castShadow = true; g.add(seat2);
  if (interactive) {
    const lbl = createLabel("SIT [E]", "#00ffff");
    lbl.position.y = 2.0; g.add(lbl);
  }
  return g;
}

export function createBonfire(x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  
  // Stones around the fire
  for(let i=0; i<8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 }));
    stone.position.set(Math.cos(angle)*0.8, 0.1, Math.sin(angle)*0.8);
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    stone.castShadow = true;
    g.add(stone);
  }
  
  for(let i=0; i<4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2), MAT_WOOD);
    log.rotation.x = Math.PI/2; log.rotation.z = (i * Math.PI) / 4; log.position.y = 0.2; log.castShadow = true; g.add(log);
  }
  
  // Main fire core
  const fireGeo = new THREE.DodecahedronGeometry(0.4);
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4400, wireframe: true, transparent: true, opacity: 0.8 });
  const fire = new THREE.Mesh(fireGeo, fireMat);
  fire.position.y = 0.4; g.add(fire);
  
  // Outer fire glow
  const fireOuterGeo = new THREE.DodecahedronGeometry(0.5);
  const fireOuterMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
  const fireOuter = new THREE.Mesh(fireOuterGeo, fireOuterMat);
  fireOuter.position.y = 0.4; g.add(fireOuter);
  
  // Adding small embers group
  const embers = new THREE.Group();
  embers.position.y = 0.5;
  g.add(embers);
  
  const light = new THREE.PointLight(0xffaa00, 5, 15);
  light.position.y = 1; light.castShadow = true; g.add(light);
  
  const emberGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  
  // Store these for animation
  g.userData = { fire, fireOuter, embers, light, emberGeo, emberMat, tOffset: Math.random() * 100 };
  
  return g;
}

export function createBalloon(x: number, z: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 }));
  balloon.position.y = 2.5; balloon.castShadow = true; g.add(balloon);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.5), new THREE.MeshBasicMaterial({color: 0xffffff}));
  string.position.y = 1.25; g.add(string);
  return g;
}

export function createLEDCube(x: number, z: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0.5, z);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }));
  g.add(cube);
  const light = new THREE.PointLight(color, 1, 5); g.add(light);
  return g;
}

export function createPier(x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const length = 20;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, length), MAT_WOOD);
  deck.position.set(0, 0.5, length/2); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  for(let i=0; i<=length; i+=4) {
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3), MAT_WOOD_LIGHT); p1.position.set(-1.8, -1, i); g.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3), MAT_WOOD_LIGHT); p2.position.set(1.8, -1, i); g.add(p2);
  }
  return g;
}

export function createDancePodium(x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 16), MAT_METAL);
  base.position.y = 0.25; base.castShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 16), MAT_NEON_PINK);
  top.position.y = 0.55; g.add(top);
  const lbl = createLabel("DANCE [C]", "#ff00ff"); lbl.position.y = 2.5; g.add(lbl);
  return g;
}

export function createPhotoBooth(x: number, z: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 2), MAT_WOOD_LIGHT);
  box.position.y = 1.25; box.castShadow = true; g.add(box);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0x00ffff}));
  screen.position.set(0, 1.5, 1.01); g.add(screen);
  const lbl = createLabel("PHOTO [B]", "#00ffff"); lbl.position.y = 3; g.add(lbl);
  return g;
}

export function createSignboard(x: number, z: number, rotY: number, text: string) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2), MAT_WOOD);
  post.position.y = 1; post.castShadow = true; g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), MAT_WOOD_LIGHT);
  board.position.set(0, 1.5, 0); board.castShadow = true; g.add(board);
  const lbl = createLabel(text, "#ffcc00"); lbl.position.set(0, 2, 0); g.add(lbl);
  return g;
}

let cachedWisprTexFront: THREE.Texture | null = null;
let cachedWisprTexBack: THREE.Texture | null = null;

export function getWisprBannerTextures() {
  if (!cachedWisprTexFront) {
    const loader = new THREE.TextureLoader();
    cachedWisprTexFront = loader.load('/wispr_beach_banner.jpg');
    cachedWisprTexFront.colorSpace = THREE.SRGBColorSpace;

    // Un-mirrored texture for the rear side so it is clearly readable from both front and back
    cachedWisprTexBack = loader.load('/wispr_beach_banner.jpg');
    cachedWisprTexBack.colorSpace = THREE.SRGBColorSpace;
    cachedWisprTexBack.wrapS = THREE.RepeatWrapping;
    cachedWisprTexBack.repeat.x = -1;
    cachedWisprTexBack.offset.x = 1;
  }
  return { front: cachedWisprTexFront, back: cachedWisprTexBack };
}

let cachedHackerHouseTexFront: THREE.Texture | null = null;
let cachedHackerHouseTexBack: THREE.Texture | null = null;

export function getHackerHouseBannerTextures() {
  if (!cachedHackerHouseTexFront) {
    const loader = new THREE.TextureLoader();
    cachedHackerHouseTexFront = loader.load('/hacker_house_banner.png');
    cachedHackerHouseTexFront.colorSpace = THREE.SRGBColorSpace;

    // Un-mirrored texture for the rear side
    cachedHackerHouseTexBack = loader.load('/hacker_house_banner.png');
    cachedHackerHouseTexBack.colorSpace = THREE.SRGBColorSpace;
    cachedHackerHouseTexBack.wrapS = THREE.RepeatWrapping;
    cachedHackerHouseTexBack.repeat.x = -1;
    cachedHackerHouseTexBack.offset.x = 1;
  }
  return { front: cachedHackerHouseTexFront, back: cachedHackerHouseTexBack };
}

export function createBeachBillboard(
  x: number,
  z: number,
  rotY: number = 0,
  textures: { front: THREE.Texture; back: THREE.Texture },
  bannerW: number = 6.0,
  bannerH: number = 2.83,
  elevatedElevation: number = 0
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const { front: texFront, back: texBack } = textures;
  const baseY = elevatedElevation;
  const bannerCenterY = baseY + bannerH / 2 + 1.25;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x422a14, roughness: 0.85, metalness: 0.1 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a381e, roughness: 0.9, flatShading: true });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8, roughness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 });

  // Elevated ground platform (sculpted sandstone dune terrace & steps)
  if (elevatedElevation > 0) {
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xdfbe8c, roughness: 0.95, flatShading: true });
    const woodPlatformMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 });

    // Lower natural stone foundation
    const stoneBase = new THREE.Mesh(new THREE.CylinderGeometry(bannerW * 0.72, bannerW * 0.85, elevatedElevation * 0.6, 16), MAT_ROCK);
    stoneBase.position.set(0, elevatedElevation * 0.3, 0);
    stoneBase.receiveShadow = true;
    stoneBase.castShadow = true;
    g.add(stoneBase);

    // Upper elevated sandstone dune terrace
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(bannerW * 0.62, bannerW * 0.72, elevatedElevation * 0.45, 16), duneMat);
    terrace.position.set(0, elevatedElevation * 0.8, 0);
    terrace.receiveShadow = true;
    terrace.castShadow = true;
    g.add(terrace);

    // Wooden scenic overlook observation deck
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(bannerW * 0.58, bannerW * 0.58, 0.15, 16), woodPlatformMat);
    deck.position.set(0, elevatedElevation + 0.05, 0);
    deck.receiveShadow = true;
    deck.castShadow = true;
    g.add(deck);

    // Stone steps leading up from the front beach sand
    const numSteps = 4;
    for (let s = 0; s < numSteps; s++) {
      const stepY = (s + 0.5) * (elevatedElevation / numSteps);
      const stepZ = (bannerW * 0.6) - s * 0.45;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, elevatedElevation / numSteps, 0.5), MAT_ROCK);
      stepMesh.position.set(0, stepY, stepZ);
      stepMesh.receiveShadow = true;
      stepMesh.castShadow = true;
      g.add(stepMesh);
    }

    // Natural beach boulders circling the base
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = Math.cos(angle) * (bannerW * 0.82);
      const rz = Math.sin(angle) * (bannerW * 0.82);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + (i % 3) * 0.15), MAT_ROCK);
      rock.position.set(rx, 0.25, rz);
      rock.scale.set(1.3, 0.7, 1.2);
      rock.castShadow = true;
      rock.receiveShadow = true;
      g.add(rock);
    }

    // Scenic decorative tiki torches on left and right of the terrace
    [-bannerW * 0.48, bannerW * 0.48].forEach(tx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), woodPlatformMat);
      pole.position.set(tx, elevatedElevation + 0.9, 0.8);
      g.add(pole);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xff7700 }));
      flame.position.set(tx, elevatedElevation + 1.9, 0.8);
      g.add(flame);

      const torchLight = new THREE.PointLight(0xff8822, 1.5, 6);
      torchLight.position.set(tx, elevatedElevation + 1.9, 0.8);
      g.add(torchLight);
    });
  }

  // 1. Vertical Timber Main Posts
  const topRailY = bannerCenterY + bannerH / 2 + 0.08;
  const botRailY = bannerCenterY - bannerH / 2 - 0.08;
  const postHeight = (bannerCenterY - baseY) + bannerH / 2 + 0.35 + 0.08;
  const postRadius = 0.12;
  const postDist = bannerW / 2 + 0.12;

  [-postDist, postDist].forEach(px => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius * 1.1, postHeight, 10), postMat);
    post.position.set(px, baseY + postHeight / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    g.add(post);

    // Decorative iron/copper cap on top
    const cap = new THREE.Mesh(new THREE.ConeGeometry(postRadius * 1.4, 0.25, 8), metalMat);
    cap.position.set(px, baseY + postHeight + 0.12, 0);
    g.add(cap);

    // Sandstone footings at terrace level
    const footStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), MAT_ROCK);
    footStone.position.set(px, baseY + 0.18, 0);
    footStone.scale.set(1.2, 0.6, 1.2);
    footStone.castShadow = true;
    g.add(footStone);

    // Diagonal rear support strut (anchored into beach sand/terrace)
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), postMat);
    brace.position.set(px, baseY + 1.2, -1.0);
    brace.rotation.x = -Math.PI / 4;
    brace.castShadow = true;
    g.add(brace);
  });

  // 2. Horizontal Support Rails (top and bottom)
  const railRadius = 0.08;

  [topRailY, botRailY].forEach(ry => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(railRadius, railRadius, bannerW + 0.5, 8), frameMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, ry, 0);
    rail.castShadow = true;
    g.add(rail);
  });

  // 3. Wooden Backing Board / Frame Bevel
  const frameBack = new THREE.Mesh(new THREE.BoxGeometry(bannerW + 0.16, bannerH + 0.16, 0.08), frameMat);
  frameBack.position.set(0, bannerCenterY, 0);
  frameBack.castShadow = true;
  g.add(frameBack);

  // 4. Front Face Poster Mesh
  const frontMat = new THREE.MeshStandardMaterial({
    map: texFront,
    roughness: 0.75,
    metalness: 0.05,
  });
  const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerH), frontMat);
  frontPlane.position.set(0, bannerCenterY, 0.045);
  frontPlane.receiveShadow = true;
  g.add(frontPlane);

  // 5. Back Face Poster Mesh (un-mirrored so readable from both directions)
  const backMat = new THREE.MeshStandardMaterial({
    map: texBack,
    roughness: 0.75,
    metalness: 0.05,
  });
  const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerH), backMat);
  backPlane.rotation.y = Math.PI;
  backPlane.position.set(0, bannerCenterY, -0.045);
  backPlane.receiveShadow = true;
  g.add(backPlane);

  // 6. Overhead Festival Spotlights (warm illumination for night and day)
  const spotXOffset = bannerW * 0.3;
  [-spotXOffset, spotXOffset].forEach(sx => {
    // Front spotlight
    const armF = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65), metalMat);
    armF.position.set(sx, topRailY + 0.22, 0.3);
    armF.rotation.x = Math.PI / 3;
    g.add(armF);

    const hoodF = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 8), metalMat);
    hoodF.position.set(sx, topRailY + 0.45, 0.55);
    hoodF.rotation.x = Math.PI * 0.75;
    g.add(hoodF);

    const bulbF = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glowMat);
    bulbF.position.set(sx, topRailY + 0.4, 0.52);
    g.add(bulbF);

    const spotLightF = new THREE.PointLight(0xfff3d6, 2.5, 8);
    spotLightF.position.set(sx, topRailY + 0.4, 0.65);
    g.add(spotLightF);

    // Rear spotlight
    const armB = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65), metalMat);
    armB.position.set(sx, topRailY + 0.22, -0.3);
    armB.rotation.x = -Math.PI / 3;
    g.add(armB);

    const hoodB = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 8), metalMat);
    hoodB.position.set(sx, topRailY + 0.45, -0.55);
    hoodB.rotation.x = -Math.PI * 0.75;
    g.add(hoodB);

    const bulbB = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glowMat);
    bulbB.position.set(sx, topRailY + 0.4, -0.52);
    g.add(bulbB);

    const spotLightB = new THREE.PointLight(0xfff3d6, 2.0, 7);
    spotLightB.position.set(sx, topRailY + 0.4, -0.65);
    g.add(spotLightB);
  });

  // 7. Decorative festive fairy bulbs along the top timber rail
  const festoonColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x1a535c, 0xff9f43, 0xa55eea];
  const numBulbs = 7;
  for (let i = 0; i < numBulbs; i++) {
    const fx = -(bannerW * 0.4) + (i / (numBulbs - 1)) * (bannerW * 0.8);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({
        color: festoonColors[i % festoonColors.length],
        emissive: festoonColors[i % festoonColors.length],
        emissiveIntensity: 0.8
      })
    );
    bulb.position.set(fx, topRailY + 0.08, 0);
    g.add(bulb);
  }

  return g;
}

export function createBeachWisprBanner(x: number, z: number, rotY: number = 0) {
  // Standalone 3D billboard on elevated ground at the top of the beach (1.5m elevated sandstone dune terrace)
  return createBeachBillboard(x, z, rotY, getWisprBannerTextures(), 6.0, 2.83, 1.5);
}

export function createBeachHackerHouseBanner(x: number, z: number, rotY: number = 0) {
  // Aspect ratio 1024x581 -> 6.0 width x 3.40 height
  return createBeachBillboard(x, z, rotY, getHackerHouseBannerTextures(), 6.0, 3.40);
}



export function createBeachShop(type: 'bar' | 'surf' | 'coconut' | 'apparel' | 'spa') {
  const g = new THREE.Group();

  if (type === 'bar') {
    // 1. Tiki Bar (Juice Bar)
    // Base counter body
    const counterBaseMat = new THREE.MeshStandardMaterial({ color: 0x3d231b, roughness: 1.0 });
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.2), counterBaseMat);
    counterBase.position.set(0, 0.55, 0.8);
    counterBase.castShadow = true;
    counterBase.receiveShadow = true;
    g.add(counterBase);

    // Front wood slats (for premium textured look)
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x6e473b, roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.05), slatMat);
      slat.position.set(-1.8 + i * 0.45, 0.55, 1.41);
      slat.castShadow = true;
      g.add(slat);
    }
    // Counter top (wider overhang)
    const counterTopMat = new THREE.MeshStandardMaterial({ color: 0xc2a05d, roughness: 0.7 });
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 1.4), counterTopMat);
    counterTop.position.set(0, 1.14, 0.8);
    counterTop.castShadow = true;
    g.add(counterTop);

    // Back counter & shelves
    const backCounter = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 0.4), counterBaseMat);
    backCounter.position.set(0, 0.5, -0.8);
    backCounter.castShadow = true;
    g.add(backCounter);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x6e473b, roughness: 0.9 });
    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.35), shelfMat);
    shelf1.position.set(0, 1.0, -0.8);
    g.add(shelf1);
    const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.35), shelfMat);
    shelf2.position.set(0, 1.5, -0.8);
    g.add(shelf2);

    // Glowing bottles on the back shelves
    const bottleColors = [0x00ffcc, 0xff00cc, 0x9900ff, 0x00ff33, 0xffdd00];
    for (let i = 0; i < 10; i++) {
      const col = bottleColors[i % bottleColors.length];
      const botMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2
      });
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), botMat);
      // Randomly spread on shelf 1 and 2
      const yPos = i < 5 ? 1.15 : 1.65;
      const xPos = -1.2 + (i % 5) * 0.6 + (Math.random() - 0.5) * 0.1;
      bot.position.set(xPos, yPos, -0.8);
      bot.castShadow = true;
      g.add(bot);
    }

    // Heavy bamboo posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0xc2a05d, roughness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
    [[-2.0, 1.25, 0.8], [2.0, 1.25, 0.8], [-2.0, 1.25, -0.8], [2.0, 1.25, -0.8]].forEach(pos => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      g.add(post);
    });

    // Layered straw/tiki roof (Multiple nested cones for thick texture)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xcca662, roughness: 1.0, flatShading: true });
    const r1 = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.0, 5), roofMat);
    r1.position.y = 2.7;
    r1.rotation.y = Math.PI / 5;
    r1.castShadow = true;
    g.add(r1);
    const r2 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.8, 5), roofMat);
    r2.position.y = 3.2;
    r2.rotation.y = -Math.PI / 4;
    r2.castShadow = true;
    g.add(r2);

    // Glowing Neon Bar Sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    signBoard.position.set(0, 2.1, 0.95);
    g.add(signBoard);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xff33aa, emissive: 0xff11aa, emissiveIntensity: 2.5 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.05), signMat);
    sign.position.set(0, 2.1, 1.01);
    g.add(sign);

    // Bar stools in front
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    [-1.0, 1.0].forEach(x => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(x, 0, 1.9);
      
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), metalMat);
      leg.position.y = 0.3;
      stoolGroup.add(leg);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12), stoolMat);
      seat.position.y = 0.6;
      seat.castShadow = true;
      stoolGroup.add(seat);

      g.add(stoolGroup);
    });

  } else if (type === 'surf') {
    // 2. Surf Rental Shop
    // Counter body
    const counterBaseMat = new THREE.MeshStandardMaterial({ color: 0x1d4e68, roughness: 0.8 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.2), counterBaseMat);
    counter.position.set(0, 0.55, 0.8);
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);

    // Decorative Surf Stripes on the counter front
    const stripeMat1 = new THREE.MeshStandardMaterial({ color: 0xffbb00 });
    const stripeMat2 = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.08, 1.21), stripeMat1);
    stripe1.position.set(0, 0.65, 0.8);
    g.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.08, 1.21), stripeMat2);
    stripe2.position.set(0, 0.45, 0.8);
    g.add(stripe2);

    const counterTopMat = new THREE.MeshStandardMaterial({ color: 0xffe8a3, roughness: 0.6 });
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 1.4), counterTopMat);
    counterTop.position.set(0, 1.14, 0.8);
    counterTop.castShadow = true;
    g.add(counterTop);

    // Slanted Roof
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 2.4), roofMat);
    roof.position.set(0, 2.3, 0);
    roof.rotation.x = 0.12;
    roof.castShadow = true;
    g.add(roof);

    // Roof stripes
    const roofStripeMat = new THREE.MeshStandardMaterial({ color: 0x00a8aa, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const rs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 2.42), roofStripeMat);
      rs.position.set(-1.6 + i * 1.05, 2.37, 0);
      rs.rotation.x = 0.12;
      g.add(rs);
    }

    // Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    [[-1.9, 1.1, 0.8], [1.9, 1.1, 0.8], [-1.9, 1.1, -0.8], [1.9, 1.1, -0.8]].forEach(pos => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(pos[0], pos[1], pos[2]);
      g.add(post);
    });

    // Surfboard rack on the side with stacked boards
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
    const rackG = new THREE.Group();
    rackG.position.set(-2.4, 0, 0);
    rackG.rotation.y = Math.PI / 2;

    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.2), rackMat);
    baseFrame.position.y = 0.05;
    rackG.add(baseFrame);
    [[-0.6, 0.85], [0.6, 0.85]].forEach(p => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), rackMat);
      post.position.set(p[0], p[1], 0);
      rackG.add(post);
      
      // pegs
      for (let y = 0.3; y <= 1.5; y += 0.4) {
        const peg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.3), rackMat);
        peg.position.set(p[0], y, 0.15);
        rackG.add(peg);
      }
    });

    // Surfboards inside the rack
    const boardColors = [0xff3333, 0xffcc00, 0x00ddff];
    boardColors.forEach((col, i) => {
      const bMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.08), bMat);
      
      // Add board stringer line (premium detail)
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.22, 0.09), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      board.add(stringer);

      board.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      board.position.set(0, 0.45 + i * 0.4, 0.15);
      board.castShadow = true;
      rackG.add(board);
    });
    g.add(rackG);

    // Glowing Neon SURF Sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    signBoard.position.set(0, 1.9, 0.95);
    g.add(signBoard);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x33ffaa, emissive: 0x11ffaa, emissiveIntensity: 2.5 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.05), signMat);
    sign.position.set(0, 1.9, 1.01);
    g.add(sign);

  } else if (type === 'coconut') {
    // 3. Coconut & Ice Cream Stand (Detailed cart)
    // Small Cart Base (Green & White stripes)
    const cartBaseMat = new THREE.MeshStandardMaterial({ color: 0x2b7a3e, roughness: 0.8 });
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.6), cartBaseMat);
    cart.position.set(0, 0.55, 0.6);
    cart.castShadow = true;
    cart.receiveShadow = true;
    g.add(cart);

    // Chrome handle
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
    const hBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), chromeMat);
    hBar1.rotation.z = Math.PI / 2;
    hBar1.position.set(-1.45, 0.8, 0.6);
    g.add(hBar1);
    [[-1.3, 0.6], [-1.3, -0.6]].forEach(pos => {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), chromeMat);
      support.rotation.x = Math.PI / 2;
      support.position.set(-1.4, 0.8, pos[0] + 0.6);
      g.add(support);
    });

    // Vintage wheels with spoke meshes
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, metalness: 0.7, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    [[-1.0, 0.4, 1.05], [1.0, 0.4, 1.05], [-1.0, 0.4, -1.05], [1.0, 0.4, -1.05]].forEach(pos => {
      const wheel = new THREE.Group();
      wheel.position.set(pos[0], pos[1], pos[2] + 0.6);
      
      const tyre = new THREE.Mesh(wheelGeo, wheelMat);
      tyre.rotation.x = Math.PI / 2;
      tyre.castShadow = true;
      wheel.add(tyre);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), hubMat);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);

      g.add(wheel);
    });

    // Umbrella Pole & Striped Umbrella Top
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8), poleMat);
    pole.position.set(-0.9, 1.4, 0.4);
    g.add(pole);

    // Multi-color parasol umbrella (alternating colored segments)
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(-0.9, 2.7, 0.4);

    const umbrellaMatRed = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7, flatShading: true });
    const umbrellaMatYellow = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.7, flatShading: true });
    
    // Create 8 segmented cones rotated to look like stripes
    for (let i = 0; i < 8; i++) {
      const segment = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 0.6, 4, 1, false, (i * Math.PI) / 4, Math.PI / 4),
        i % 2 === 0 ? umbrellaMatRed : umbrellaMatYellow
      );
      segment.castShadow = true;
      umbrellaGroup.add(segment);
    }
    g.add(umbrellaGroup);

    // Wooden crate filled with coconuts
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1.0 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), crateMat);
    crate.position.set(0.6, 1.15, 0.5);
    crate.castShadow = true;
    g.add(crate);

    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x3d7020, roughness: 0.9 });
    const cocoGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const cocoOffsets = [
      [0.4, 1.25, 0.3], [0.65, 1.25, 0.3], [0.5, 1.25, 0.5], [0.75, 1.25, 0.5],
      [0.55, 1.35, 0.4], [0.7, 1.35, 0.4] // stacked top row
    ];
    cocoOffsets.forEach(pos => {
      const coco = new THREE.Mesh(cocoGeo, cocoMat);
      coco.position.set(pos[0], pos[1], pos[2]);
      coco.castShadow = true;
      g.add(coco);
    });

    // Acrylic display dome containing ice cream / popsicles
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(-0.2, 1.0, 0.6);
    g.add(dome);

    // Inside the dome: 3 little colorful popsicle cylinders
    const popColors = [0xff0066, 0x00ccff, 0xffaa00];
    popColors.forEach((col, i) => {
      const popMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 });
      const pop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), popMat);
      pop.position.set(-0.32 + i * 0.12, 1.1, 0.6);
      g.add(pop);
    });

  } else if (type === 'apparel') {
    // 4. Souvenir & Beachwear Shop
    // Counter body
    const counterBaseMat = new THREE.MeshStandardMaterial({ color: 0xc27a4d, roughness: 0.9 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.2), counterBaseMat);
    counter.position.set(0, 0.55, 0.8);
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);

    // Awning stripes
    const awningMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const awningMatRed = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.6 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.8), awningMatWhite);
    awning.position.set(0, 2.3, 0.9);
    awning.rotation.x = 0.25; // slanted forward awning
    g.add(awning);

    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 1.82), awningMatRed);
      stripe.position.set(-1.6 + i * 0.8, 2.32, 0.9);
      stripe.rotation.x = 0.25;
      g.add(stripe);
    }

    // Support poles
    const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5 });
    [[-2.0, 1.1, 1.4], [2.0, 1.1, 1.4], [-2.0, 1.1, 0.2], [2.0, 1.1, 0.2]].forEach(pos => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), postMat);
      post.position.set(pos[0], pos[1], pos[2]);
      g.add(post);
    });

    // Hanging Clothing Rack on the side
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
    const rack = new THREE.Group();
    rack.position.set(2.4, 0, 0.8);
    rack.rotation.y = -Math.PI / 6;

    // Frame
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), rackMat);
    base.position.y = 0.05;
    rack.add(base);
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), rackMat);
    postL.position.set(-0.5, 0.7, 0);
    rack.add(postL);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), rackMat);
    postR.position.set(0.5, 0.7, 0);
    rack.add(postR);
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), rackMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.4, 0);
    rack.add(crossbar);

    // Hanging shirts (boxes in different colors)
    const shirtColors = [0x00ccff, 0xffaa00, 0xff33aa, 0x33ff88];
    shirtColors.forEach((col, i) => {
      const shirtMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 6), rackMat);
      hanger.position.set(-0.35 + i * 0.23, 1.3, 0);
      rack.add(hanger);
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.06), shirtMat);
      shirt.position.set(-0.35 + i * 0.23, 1.1, 0);
      shirt.castShadow = true;
      rack.add(shirt);
    });
    g.add(rack);

    // Display shelf with beach hats
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), counterBaseMat);
    shelf.position.set(-1.2, 0.6, -0.6);
    g.add(shelf);
    
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.9 });
    for (let i = 0; i < 2; i++) {
      const hat = new THREE.Group();
      hat.position.set(-1.4 + i * 0.4, 0.65, -0.6);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), hatMat);
      hat.add(brim);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10, 0, Math.PI*2, 0, Math.PI/2), hatMat);
      dome.position.y = 0.01;
      hat.add(dome);
      g.add(hat);
    }

    // Glowing Sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    signBoard.position.set(0, 1.9, 0.95);
    g.add(signBoard);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 2.5 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.05), signMat);
    sign.position.set(0, 1.9, 1.01);
    g.add(sign);

  } else if (type === 'spa') {
    // 5. Beach Massage & Spa Cabana
    // Deck Floor Base
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 3.4), floorMat);
    base.position.y = 0.075;
    base.receiveShadow = true;
    g.add(base);

    // Gazebo posts (4 corner pillars)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
    [[-2.0, 1.2, 1.5], [2.0, 1.2, 1.5], [-2.0, 1.2, -1.5], [2.0, 1.2, -1.5]].forEach(pos => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      g.add(post);
    });

    // Straw Gazebo Roof
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xbaa27a, roughness: 1.0, flatShading: true });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.0, 4), roofMat);
    roof.position.set(0, 2.9, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.5, 1.0, 1.2);
    roof.castShadow = true;
    g.add(roof);

    // Hanging White Curtains (semi-transparent vertical sheets on the sides)
    const curtainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.8
    });
    const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.0, 2.8), curtainMat);
    curtainL.position.set(-1.95, 1.1, 0);
    g.add(curtainL);
    const curtainR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.0, 2.8), curtainMat);
    curtainR.position.set(1.95, 1.1, 0);
    g.add(curtainR);

    // Massage Table 1 & 2
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfb, roughness: 0.7 });
    
    [-1.0, 1.0].forEach(x => {
      const table = new THREE.Group();
      table.position.set(x, 0, 0);

      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 1.8), tableMat);
      frame.position.y = 0.325;
      frame.castShadow = true;
      table.add(frame);

      // Cushion mattress
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 1.84), cushionMat);
      cushion.position.y = 0.7;
      cushion.castShadow = true;
      table.add(cushion);

      // Rolled towel/pillow
      const pillow = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), cushionMat);
      pillow.rotation.z = Math.PI / 2;
      pillow.position.set(0, 0.8, -0.6);
      table.add(pillow);

      g.add(table);
    });

    // Small table in the back with glowing massage candles/lotus lights
    const sTable = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), tableMat);
    sTable.position.set(0, 0.4, -1.1);
    g.add(sTable);

    const candleColors = [0x00ffcc, 0xffcc00];
    candleColors.forEach((col, i) => {
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
      );
      candle.position.set(-0.12 + i * 0.24, 0.69, -1.1);
      g.add(candle);
    });
  }

  return g;
}
