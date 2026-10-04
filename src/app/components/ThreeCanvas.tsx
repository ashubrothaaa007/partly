import { useRef, useEffect, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Timer } from 'three';

interface BotData {
  id: string;
  name: string;
  color: string;
  pos: [number, number, number];
  targetPos: [number, number, number];
  animation: string;
}

interface Props {
  playerName: string;
  playerColor: string;
  botsRef: MutableRefObject<any[]>;
  onAnimChange: (a: string) => void;
  onPlayerUpdate?: (pos: [number, number, number], rot: number, anim: string) => void;
  videoId: string;
  screenOverlayRef: MutableRefObject<HTMLDivElement | null>;
  audioEnabled: boolean;
  globalVolume: number;
  isMuted: boolean;
}

interface AvatarParts {
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  root: THREE.Group;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

const SKIN_TONES = [0xf5cba0, 0xe2a76f, 0xc68642, 0x8d5524, 0xffd9b3, 0xa86b3c];
const HAIR_COLORS = [0x1a1a1a, 0x3b1f0b, 0x6b3410, 0xc28840, 0xe8d27a, 0xff4488, 0x44ffff, 0xaa44ff, 0xffffff];
const PANTS_COLORS = [0x1a1a2a, 0x2a1a3a, 0x101020, 0x301a10, 0x202040];

function createAvatarGroup(color: string, seed: number): { group: THREE.Group; parts: AvatarParts } {
  const group = new THREE.Group();
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const hair = HAIR_COLORS[(seed >> 3) % HAIR_COLORS.length];
  const pants = PANTS_COLORS[(seed >> 5) % PANTS_COLORS.length];
  const hairStyle = seed % 4;

  const jacketMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111122 });

  const root = new THREE.Group();
  group.add(root);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.35;
  headGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat));

  if (hairStyle === 0) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), hairMat); cap.position.y = 0.18; headGroup.add(cap);
  } else if (hairStyle === 1) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), hairMat); cap.position.y = 0.18; headGroup.add(cap);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.12), hairMat); back.position.set(0, -0.05, -0.2); headGroup.add(back);
  } else if (hairStyle === 2) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), hairMat); top.position.y = 0.32; headGroup.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), hairMat); base.position.y = 0.17; headGroup.add(base);
  } else {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.52), new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.6 })); cap.position.y = 0.2; headGroup.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.18), new THREE.MeshStandardMaterial({ color: 0x111122 })); brim.position.set(0, 0.14, 0.28); headGroup.add(brim);
  }

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), eyeMat); eyeL.position.set(-0.11, 0.04, 0.235); headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), eyeMat); eyeR.position.set(0.11, 0.04, 0.235); headGroup.add(eyeR);
  root.add(headGroup);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.3), jacketMat); body.position.y = 0.72; root.add(body);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.32), new THREE.MeshStandardMaterial({ color, roughness: 0.6 })); trim.position.set(0, 0.72, 0.01); root.add(trim);

  const leftArm = new THREE.Group(); leftArm.position.set(-0.34, 0.98, 0); leftArm.rotation.z = 0.15;
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.2), jacketMat); lArmMesh.position.y = -0.22; leftArm.add(lArmMesh);
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.21), skinMat); lHand.position.y = -0.5; leftArm.add(lHand); root.add(leftArm);

  const rightArm = new THREE.Group(); rightArm.position.set(0.34, 0.98, 0); rightArm.rotation.z = -0.15;
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.2), jacketMat); rArmMesh.position.y = -0.22; rightArm.add(rArmMesh);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.21), skinMat); rHand.position.y = -0.5; rightArm.add(rHand); root.add(rightArm);

  const leftLeg = new THREE.Group(); leftLeg.position.set(-0.13, 0.42, 0);
  const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat); lLegMesh.position.y = -0.28; leftLeg.add(lLegMesh); root.add(leftLeg);

  const rightLeg = new THREE.Group(); rightLeg.position.set(0.13, 0.42, 0);
  const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat); rLegMesh.position.y = -0.28; rightLeg.add(rLegMesh); root.add(rightLeg);

  // Cast and receive shadows
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, parts: { leftArm, rightArm, leftLeg, rightLeg, root } };
}

function animateAvatar(parts: AvatarParts, animation: string, t: number, seed: number = 0) {
  const baseY = animation === 'sit' ? 0 : 0.135;
  const { leftArm, rightArm, leftLeg, rightLeg, root } = parts;
  leftArm.rotation.set(0, 0, 0.15); rightArm.rotation.set(0, 0, -0.15); leftLeg.rotation.set(0, 0, 0); rightLeg.rotation.set(0, 0, 0); root.position.y = baseY;

  if (animation === 'walk') {
    leftArm.rotation.x = Math.sin(t * 7) * 0.55; rightArm.rotation.x = -Math.sin(t * 7) * 0.55;
    leftLeg.rotation.x = -Math.sin(t * 7) * 0.45; rightLeg.rotation.x = Math.sin(t * 7) * 0.45;
  } else if (animation.startsWith('dance')) {
    const style = seed % 5;
    const beat = t * 4 + seed;
    if (style === 0) {
      // Jump bob with arm spread
      root.position.y = baseY + Math.abs(Math.sin(beat)) * 0.28;
      leftArm.rotation.x = Math.sin(beat + 1) * 1.2; rightArm.rotation.x = -Math.sin(beat + 1) * 1.2;
      leftArm.rotation.z = 0.55 + Math.sin(beat * 2) * 0.4; rightArm.rotation.z = -(0.55 + Math.sin(beat * 2) * 0.4);
      leftLeg.rotation.x = Math.sin(beat) * 0.18; rightLeg.rotation.x = -Math.sin(beat) * 0.18;
    } else if (style === 1) {
      // Robot arms horizontal
      root.position.y = baseY + Math.abs(Math.sin(beat * 1.5)) * 0.15;
      leftArm.rotation.x = -Math.PI/2 + Math.sin(beat) * 0.5; rightArm.rotation.x = -Math.PI/2 - Math.sin(beat) * 0.5;
      leftLeg.rotation.x = Math.sin(beat * 2) * 0.1; rightLeg.rotation.x = -Math.sin(beat * 2) * 0.1;
    } else if (style === 2) {
      // Hip sway
      root.position.y = baseY + Math.abs(Math.cos(beat)) * 0.2;
      leftArm.rotation.z = 1.0 + Math.sin(beat) * 0.3; rightArm.rotation.z = -1.0 + Math.cos(beat) * 0.3;
      leftLeg.rotation.z = Math.sin(beat) * 0.12; rightLeg.rotation.z = -Math.sin(beat) * 0.12;
    } else if (style === 3) {
      // Pump/rave — alternating arm pumps up and down, fast bounce
      root.position.y = baseY + Math.abs(Math.sin(beat * 2)) * 0.18;
      leftArm.rotation.x = Math.abs(Math.sin(beat * 2)) * 1.6;
      rightArm.rotation.x = Math.abs(Math.sin(beat * 2 + Math.PI)) * 1.6;
      leftArm.rotation.z = 0.25; rightArm.rotation.z = -0.25;
      leftLeg.rotation.x = Math.sin(beat * 2) * 0.25; rightLeg.rotation.x = -Math.sin(beat * 2) * 0.25;
    } else {
      // Groove — swaying torso + flowing arms
      root.position.y = baseY + Math.sin(beat * 2) * 0.1;
      leftArm.rotation.x = Math.sin(beat * 1.2) * 0.9;
      rightArm.rotation.x = Math.sin(beat * 1.2 + 1.5) * 0.9;
      leftArm.rotation.z = 0.6 + Math.cos(beat) * 0.35;
      rightArm.rotation.z = -(0.6 + Math.cos(beat + 1) * 0.35);
      leftLeg.rotation.x = Math.cos(beat * 2) * 0.18; rightLeg.rotation.x = -Math.cos(beat * 2) * 0.18;
    }
  } else if (animation === 'wave') {
    rightArm.rotation.z = -1.3 - Math.sin(t * 6 + seed) * 0.3; rightArm.rotation.x = -0.2;
  } else if (animation === 'cheer') {
    leftArm.rotation.z = 1.2 + Math.sin(t * 8 + seed) * 0.25; rightArm.rotation.z = -(1.2 + Math.sin(t * 8 + seed) * 0.25);
    root.position.y = baseY + Math.abs(Math.sin(t * 6 + seed)) * 0.18;
  } else if (animation === 'sit') {
    leftLeg.rotation.x = -1.2; rightLeg.rotation.x = -1.2; root.position.y = baseY - 0.38;
  } else if (animation === 'chat') {
    root.position.y = baseY + Math.sin(t * 1.5 + seed) * 0.05;
    leftArm.rotation.x = Math.sin(t * 2 + seed) * 0.2;
    rightArm.rotation.x = Math.cos(t * 2 + seed) * 0.2;
  } else {
    // idle
    root.position.y = baseY + Math.sin(t * 1.5 + seed) * 0.05;
    leftArm.rotation.z = 0.15 + Math.sin(t * 0.9 + seed) * 0.06; rightArm.rotation.z = -(0.15 + Math.sin(t * 0.9 + seed) * 0.06);
  }
}

function createLabel(text: string, color: string): THREE.Mesh {
  const canvas = document.createElement('canvas'); 
  canvas.width = 128; 
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 32);
  
  ctx.font = 'bold 12px Orbitron, Rajdhani, Arial';
  const textWidth = ctx.measureText(text).width;
  const boxWidth = Math.min(textWidth + 16, 120);
  const startX = (128 - boxWidth) / 2;
  
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); 
  ctx.roundRect(startX, 6, boxWidth, 20, 4);
  ctx.fill();
  
  ctx.strokeStyle = color; 
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; 
  ctx.fillText(text, 64, 16, boxWidth - 8);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), mat); 
  mesh.position.y = 2.0;
  return mesh;
}

const SLOT_MS = 5 * 60 * 1000; // 5 minutes per playlist slot
const VIDEO_DURATIONS: Record<string, number> = {
  '0sCaK_7cDO0': 165, // Wispr Flow takes on India: 2m 45s (165 seconds)
};

function getSyncedStartSeconds(vId: string): number {
  return 0; // Start cleanly from the beginning for concert preview
}

// --- LIGHTING & VOLUMETRICS ---
function createBeamLight(color: number) {
  const group = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x18181f, metalness: 0.85 }));
  group.add(housing);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color }));
  lens.position.y = -0.28; lens.rotation.x = -Math.PI / 2; group.add(lens);

  const beamGroup = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(3.5, 25, 16, 1, true);
  coneGeo.translate(0, -12.5, 0);
  const coneMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat); beamGroup.add(cone);
  
  const innerGeo = new THREE.ConeGeometry(1.2, 25, 16, 1, true);
  innerGeo.translate(0, -12.5, 0);
  const innerMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat); beamGroup.add(inner);
  group.add(beamGroup);

  const light = new THREE.PointLight(color, 6, 35);
  light.position.set(0, -8, 0);
  
  return { group, beamGroup, light };
}

// --- BEACH PROPS ---
const MAT_WOOD = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9, flatShading: true });
const MAT_WOOD_LIGHT = new THREE.MeshStandardMaterial({ color: 0xc2a077, roughness: 0.9, flatShading: true });
const MAT_LEAF = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, flatShading: true });
const MAT_ROCK = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, flatShading: true });
const MAT_ROOF = new THREE.MeshStandardMaterial({ color: 0xd4c084, roughness: 1.0, flatShading: true });

function createPalmTree(x: number, z: number, scale = 1) {
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

function createSunLounger(x: number, z: number, rotY: number, color: number) {
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

function createUmbrella(x: number, z: number, color1: number, color2: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), MAT_WOOD); pole.position.y = 1.5; pole.castShadow = true; g.add(pole);
  const topGeo = new THREE.ConeGeometry(2, 0.8, 8);
  const topMat = [new THREE.MeshStandardMaterial({ color: color1, flatShading: true }), new THREE.MeshStandardMaterial({ color: color2, flatShading: true })];
  for(let i=0; i<8; i++) topGeo.groups.push({ start: i*6, count: 6, materialIndex: i%2 });
  const top = new THREE.Mesh(topGeo, topMat); top.position.y = 3; top.castShadow = true; g.add(top);
  return g;
}

function createTikiHut(x: number, z: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), MAT_WOOD_LIGHT); base.position.y = 0.1; base.castShadow = true; g.add(base);
  for(let px of [-1.8, 1.8]) for(let pz of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5), MAT_WOOD); post.position.set(px, 1.35, pz); post.castShadow = true; g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.5, 6), MAT_ROOF); roof.position.y = 3.2; roof.castShadow = true; g.add(roof);
  return g;
}

function createStall(x: number, z: number, rotY: number, type: 'coconut' | 'icecream' | 'surf') {
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

function createWalkway(x: number, z: number, length: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const numPlanks = Math.floor(length / 0.4);
  for(let i=0; i<numPlanks; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 0.35), MAT_WOOD_LIGHT);
    plank.position.set(0, 0.02, (i - numPlanks/2)*0.4); plank.rotation.y = (Math.random()-0.5)*0.1; plank.rotation.z = (Math.random()-0.5)*0.05;
    plank.castShadow = true; plank.receiveShadow = true; g.add(plank);
  }
  return g;
}

function createCloud(x: number, y: number, z: number, scale: number) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.set(scale, scale, scale);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true });
  const pos = [[0,0,0, 2], [1.5, -0.2, 0.5, 1.5], [-1.5, -0.2, -0.5, 1.5], [0.8, 0.5, -0.8, 1.2], [-0.8, 0.5, 0.8, 1.2]];
  for (const [px, py, pz, s] of pos) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mat); m.position.set(px, py, pz); m.castShadow = true; g.add(m);
  }
  return g;
}

function createSpeaker(x: number, z: number): { group: THREE.Group; woofers: THREE.MeshStandardMaterial[] } {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8, metalness: 0.4 });
  const woofers: THREE.MeshStandardMaterial[] = [];
  
  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.0), cabinetMat);
    cab.position.y = i * 1.6 + 0.75; cab.castShadow = true; g.add(cab);
    
    const wooferMat = new THREE.MeshStandardMaterial({ color: 0x050508, emissive: 0xcc00ff, emissiveIntensity: 0.0 });
    woofers.push(wooferMat);
    
    const woof = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), wooferMat);
    woof.rotation.x = Math.PI / 2;
    woof.position.set(0, i * 1.6 + 0.75, 0.51);
    g.add(woof);
    
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
    );
    rim.position.set(0, i * 1.6 + 0.75, 0.51);
    g.add(rim);
  }
  
  // Truss stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x333333, wireframe: true }));
  stand.position.y = 0.25; g.add(stand);
  
  g.rotation.y = x > 0 ? -0.2 : 0.2; // Point slightly inward
  
  return { group: g, woofers };
}

// --- NEW INTERACTIVE ASSETS & DECORATIONS ---
const MAT_RED = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
const MAT_FIRE = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
const MAT_NEON_PINK = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });

function createLifeguardTower(x: number, z: number, rotY: number) {
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

function createLogSeat(x: number, z: number, rotY: number, interactive: boolean = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2), MAT_WOOD);
  log.rotation.z = Math.PI / 2; log.position.y = 0.3; log.castShadow = true; g.add(log);
  if (interactive) {
    const lbl = createLabel("SIT [E]", "#00ffff");
    lbl.position.y = 1.2; g.add(lbl);
  }
  return g;
}

function createBeachChair(x: number, z: number, rotY: number, interactive: boolean = true) {
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

function createBench(x: number, z: number, rotY: number, interactive: boolean = false) {
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

function createPicnicTable(x: number, z: number, rotY: number, interactive: boolean = true) {
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

function createBonfire(x: number, z: number) {
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

function createBalloon(x: number, z: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 }));
  balloon.position.y = 2.5; balloon.castShadow = true; g.add(balloon);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.5), new THREE.MeshBasicMaterial({color: 0xffffff}));
  string.position.y = 1.25; g.add(string);
  return g;
}

function createLEDCube(x: number, z: number, color: number) {
  const g = new THREE.Group(); g.position.set(x, 0.5, z);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }));
  g.add(cube);
  const light = new THREE.PointLight(color, 1, 5); g.add(light);
  return g;
}

function createPier(x: number, z: number) {
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

function createDancePodium(x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 16), MAT_METAL);
  base.position.y = 0.25; base.castShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 16), MAT_NEON_PINK);
  top.position.y = 0.55; g.add(top);
  const lbl = createLabel("DANCE [C]", "#ff00ff"); lbl.position.y = 2.5; g.add(lbl);
  return g;
}

function createPhotoBooth(x: number, z: number, rotY: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 2), MAT_WOOD_LIGHT);
  box.position.y = 1.25; box.castShadow = true; g.add(box);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0x00ffff}));
  screen.position.set(0, 1.5, 1.01); g.add(screen);
  const lbl = createLabel("PHOTO [B]", "#00ffff"); lbl.position.y = 3; g.add(lbl);
  return g;
}

function createSignboard(x: number, z: number, rotY: number, text: string) {
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

function getWisprBannerTextures() {
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

function createBeachWisprBanner(x: number, z: number, rotY: number = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const { front: texFront, back: texBack } = getWisprBannerTextures();

  // Banner dimensions matching image aspect ratio (1024x483 -> 6.0 x 2.83)
  const bannerW = 6.0;
  const bannerH = 2.83;
  const bannerCenterY = 2.65;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x422a14, roughness: 0.85, metalness: 0.1 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a381e, roughness: 0.9, flatShading: true });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8, roughness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 });

  // 1. Vertical Timber Main Posts
  const postHeight = 4.4;
  const postRadius = 0.12;
  const postDist = bannerW / 2 + 0.12;

  [-postDist, postDist].forEach(px => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius * 1.1, postHeight, 10), postMat);
    post.position.set(px, postHeight / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    g.add(post);

    // Decorative iron/copper cap on top
    const cap = new THREE.Mesh(new THREE.ConeGeometry(postRadius * 1.4, 0.25, 8), metalMat);
    cap.position.set(px, postHeight + 0.12, 0);
    g.add(cap);

    // Sandstone footings at beach level
    const footStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), MAT_ROCK);
    footStone.position.set(px, 0.18, 0);
    footStone.scale.set(1.2, 0.6, 1.2);
    footStone.castShadow = true;
    g.add(footStone);

    // Diagonal rear support strut (anchored into beach sand)
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), postMat);
    brace.position.set(px, 1.2, -1.0);
    brace.rotation.x = -Math.PI / 4;
    brace.castShadow = true;
    g.add(brace);
  });

  // 2. Horizontal Support Rails (top and bottom)
  const railRadius = 0.08;
  const topRailY = bannerCenterY + bannerH / 2 + 0.08;
  const botRailY = bannerCenterY - bannerH / 2 - 0.08;

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
  [-1.8, 1.8].forEach(sx => {
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
  for (let i = 0; i <= 6; i++) {
    const fx = -2.4 + i * 0.8;
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

function createBird(x: number, y: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 3), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  body.rotation.x = Math.PI / 2; g.add(body);
  const wingsGeo = new THREE.BufferGeometry();
  const vertices = new Float32Array([-0.8, 0, 0, 0.8, 0, 0, 0, 0.1, -0.2]);
  wingsGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  wingsGeo.computeVertexNormals();
  const wings = new THREE.Mesh(wingsGeo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }));
  g.add(wings); (g as any).wings = wings;
  return g;
}

function createShark() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.3, 5, 8), bodyMat);
  body.rotation.x = Math.PI / 2; body.position.y = -0.5; g.add(body);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4), bodyMat);
  fin.position.set(0, 0.5, -0.5); fin.rotation.x = -0.2; g.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.5), bodyMat);
  tail.position.set(0, -0.5, -2.5); g.add(tail);
  return g;
}

function createFish(color: number, type: number = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
  
  if (type === 0) {
    // Standard tropical fish
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), mat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 3), mat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.5;
    g.add(tail);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 3), mat);
    fin.position.set(0, 0.2, 0);
    g.add(fin);
  } else if (type === 1) {
    // Flat disc fish (e.g. angelfish shape)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), mat);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 1.5);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 3), mat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.4;
    g.add(tail);
  } else {
    // Long slender fish
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), mat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 3), mat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.6;
    g.add(tail);
  }
  return g;
}

function createBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 5), hullMat); hull.position.y = 0.3; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 4), hullMat);
  bow.rotation.x = Math.PI / 2; bow.position.set(0, 0.3, 2.5); g.add(bow);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), MAT_WOOD); mast.position.y = 2.5; g.add(mast);
  const sailGeo = new THREE.BufferGeometry();
  const sailVerts = new Float32Array([0, 4, 0, 0, 1, 0, 0, 1, -3]);
  sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, side: THREE.DoubleSide }));
  g.add(sail);
  return g;
}

function createChristTheRedeemer(x: number, z: number, scale: number = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.set(scale, scale, scale);

  const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, metalness: 0.1 });

  // Rocky Island Base
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0 });
  const islandGeo = new THREE.DodecahedronGeometry(12, 1);
  const island = new THREE.Mesh(islandGeo, rockMat);
  island.position.y = -2;
  island.scale.set(1, 0.4, 1);
  island.castShadow = true;
  island.receiveShadow = true;
  g.add(island);

  // Base Pedestal
  const baseGeo = new THREE.CylinderGeometry(4, 5, 8, 12);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.y = 4;
  base.castShadow = true;
  g.add(base);

  // Lower Body / Robe
  const bodyGeo = new THREE.CylinderGeometry(2, 3.5, 14, 12);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 15;
  body.castShadow = true;
  g.add(body);

  // Torso / Chest
  const torsoGeo = new THREE.BoxGeometry(4.5, 7, 3);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 25.5;
  torso.castShadow = true;
  g.add(torso);

  // Outstretched Arms
  const armsGeo = new THREE.BoxGeometry(22, 2, 2);
  const arms = new THREE.Mesh(armsGeo, mat);
  arms.position.y = 27.5;
  arms.castShadow = true;
  g.add(arms);

  // Hands
  const handGeo = new THREE.BoxGeometry(1.2, 1.5, 1.2);
  const lHand = new THREE.Mesh(handGeo, mat);
  lHand.position.set(-11.5, 27.2, 0);
  g.add(lHand);
  const rHand = new THREE.Mesh(handGeo, mat);
  rHand.position.set(11.5, 27.2, 0);
  g.add(rHand);

  // Head
  const headGeo = new THREE.BoxGeometry(2.5, 3.5, 2.5);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 30.5;
  head.castShadow = true;
  g.add(head);

  // Rotate slightly so it faces the main beach/party
  g.rotation.y = Math.PI;
  return g;
}

function createBeachShop(type: 'bar' | 'surf' | 'coconut' | 'apparel' | 'spa') {
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

function createMicrophoneStand() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
  
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12), mat);
  base.position.y = 0.02;
  base.castShadow = true;
  g.add(base);

  // Vertical Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.35, 8), mat);
  pole.position.y = 0.675;
  pole.castShadow = true;
  g.add(pole);

  // Boom Arm Joint & Arm
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  joint.position.set(0, 1.35, 0);
  g.add(joint);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), mat);
  boom.position.set(0.12, 1.5, 0.12);
  boom.rotation.set(0.3, 0, 0.45);
  boom.castShadow = true;
  g.add(boom);

  // Mic holder clip
  const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  clip.position.set(0.23, 1.63, 0.23);
  clip.rotation.set(0.3, 0, 0.45);
  g.add(clip);

  // Microphone head & body
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  micBody.position.set(0.26, 1.67, 0.26);
  micBody.rotation.set(0.3, 0, 0.45);
  g.add(micBody);
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 }));
  micHead.position.set(0.3, 1.73, 0.3);
  g.add(micHead);

  // Black Microphone Cable (Draping down in segments)
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const points = [
    new THREE.Vector3(0.26, 1.63, 0.26),  // start at clip
    new THREE.Vector3(0.1, 1.2, 0.1),     // drape slightly out
    new THREE.Vector3(0.03, 0.7, 0.03),   // hug the pole
    new THREE.Vector3(0.05, 0.2, 0.1),    // drape near base
    new THREE.Vector3(0.1, 0.02, 0.3)     // end on the floor
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i+1];
    const distance = p1.distanceTo(p2);
    const cableSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, distance, 6), cableMat);
    
    // Position at midpoint
    cableSeg.position.copy(p1).add(p2).multiplyScalar(0.5);
    // Align cylinder with the direction vector between points
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const alignAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, direction);
    cableSeg.setRotationFromQuaternion(quaternion);
    
    g.add(cableSeg);
  }

  // Stage monitor speaker (wedge speaker) sitting on the floor in front
  const monitorGroup = new THREE.Group();
  monitorGroup.position.set(0.4, 0, 0.9); // positioned in front of the mic stand
  monitorGroup.rotation.y = -Math.PI / 8; // angled slightly towards the singer

  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x18181e, roughness: 0.8, flatShading: true });
  const speakerMain = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), monitorMat);
  speakerMain.position.y = 0.25;
  speakerMain.rotation.x = -Math.PI / 6; // slanted upward face
  speakerMain.castShadow = true;
  monitorGroup.add(speakerMain);

  // Speaker grill
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.4 });
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.42), grillMat);
  grill.position.set(0, 0.28, 0.02);
  grill.rotation.x = -Math.PI / 6;
  monitorGroup.add(grill);

  // Tiny glowing status LED on the speaker
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.5 }));
  led.position.set(-0.3, 0.23, 0.16);
  monitorGroup.add(led);

  g.add(monitorGroup);

  return g;
}

function buildScene(scene: THREE.Scene, videoId: string): { uniforms: { time: { value: number } }, danceTiles: THREE.MeshStandardMaterial[], particles: THREE.Points, woofers: THREE.MeshStandardMaterial[], birds: THREE.Group, shark: THREE.Group, fishes: any[], boat: THREE.Group, lasers: any[], npcs: any[], seats: any[], bonfire: THREE.Group | null, checkCol: (nx: number, nz: number, radius: number) => boolean } {
  scene.background = null;
  scene.fog = new THREE.FogExp2(0xa0d0ff, 0.005);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // Keeps everything bright

  const sun = new THREE.DirectionalLight(0xffffee, 1.5);
  sun.position.set(50, 100, -30);
  sun.castShadow = true;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.001;
  sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: "varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "varying vec3 vPos; void main(){ float h = normalize(vPos).y; vec3 horizon = vec3(0.6, 0.9, 1.0); vec3 zenith = vec3(0.1, 0.5, 1.0); vec3 col = mix(horizon, zenith, clamp(h + 0.1, 0.0, 1.0)); gl_FragColor = vec4(col, 1.0); }"
    })
  );
  scene.add(sky);

  const sandGeo = new THREE.PlaneGeometry(250, 250, 64, 64);
  const pos = sandGeo.attributes.position;
  for(let i=0; i<pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i);
    let z = Math.sin(vx*0.1)*0.2 + Math.cos(vy*0.1)*0.2;
    // Flatten sand under the stage and dance floor
    if (vx > -20 && vx < 20 && vy > -35 && vy < -5) {
      z = 0;
    }
    if(vy < -20) z -= (Math.abs(vy)-20)*0.1;
    pos.setZ(i, z);
  }
  sandGeo.computeVertexNormals();
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xffe5b4, roughness: 1.0, flatShading: true });
  const sand = new THREE.Mesh(sandGeo, sandMat); sand.rotation.x = -Math.PI / 2; sand.receiveShadow = true; scene.add(sand);

  const uniforms = { time: { value: 0 } };
  const waterMat = new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: "varying vec2 vUv; varying float vElev; uniform float time; void main() { vUv = uv; vec3 pos = position; float elev = sin(pos.x * 0.8 + time*2.0)*0.2 + sin(pos.y * 1.2 - time*1.5)*0.15; pos.z += elev; vElev = elev; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }",
    fragmentShader: "varying vec2 vUv; varying float vElev; void main() { vec3 deep = vec3(0.0, 0.3, 0.8); vec3 shallow = vec3(0.0, 0.8, 0.9); vec3 foam = vec3(1.0, 1.0, 1.0); float mixVal = clamp(vElev + 0.5, 0.0, 1.0); vec3 col = mix(deep, shallow, mixVal); if (vElev > 0.15) { col = mix(col, foam, (vElev-0.15)*10.0); } gl_FragColor = vec4(col, 0.85); }",
    side: THREE.DoubleSide, depthWrite: false
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(250, 100, 128, 32), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.2, 70); scene.add(water);

  const stageGroup = new THREE.Group(); stageGroup.position.z = -28; scene.add(stageGroup);
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9, flatShading: true });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 14), platformMat); platform.position.set(0, 0.6, 2); platform.receiveShadow = true; platform.castShadow = true; stageGroup.add(platform);
  const riser = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 4), platformMat); riser.position.set(0, 1.6, 0); riser.receiveShadow = true; riser.castShadow = true; stageGroup.add(riser);
  
  // SLEEK NEON DJ BOOTH & MIXING DECKS
  const boothMat = new THREE.MeshStandardMaterial({ color: 0x16161f, metalness: 0.8, roughness: 0.2 });
  const booth = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 1.6), boothMat);
  booth.position.set(0, 2.7, 1.5);
  booth.castShadow = true;
  stageGroup.add(booth);

  // Neon glowing accents on the front face of the DJ booth
  const neonMat1 = new THREE.MeshStandardMaterial({ color: 0xff33aa, emissive: 0xff11aa, emissiveIntensity: 2.0 });
  const neonLine1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.04, 0.04), neonMat1);
  neonLine1.position.set(0, 3.1, 2.31);
  stageGroup.add(neonLine1);
  
  const neonMat2 = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 });
  const neonLine2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.04, 0.04), neonMat2);
  neonLine2.position.set(0, 2.3, 2.31);
  stageGroup.add(neonLine2);

  // DJ Mixer console body
  const mixer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 }));
  mixer.position.set(0, 3.44, 1.3);
  stageGroup.add(mixer);

  // Turntable Platters (Vinyl Decks)
  const platterMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const platterCenterMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 });
  const platterGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.02, 16);
  
  const deckL = new THREE.Mesh(platterGeo, platterMat);
  deckL.position.set(-0.7, 3.49, 1.3);
  const centerL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), platterCenterMat);
  centerL.position.y = 0.01;
  deckL.add(centerL);
  stageGroup.add(deckL);

  const deckR = new THREE.Mesh(platterGeo, platterMat);
  deckR.position.set(0.7, 3.49, 1.3);
  const centerR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), platterCenterMat);
  centerR.position.y = 0.01;
  deckR.add(centerR);
  stageGroup.add(deckR);

  // Faders and Knobs details on the mixer
  const ledRed = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 1.5 });
  const ledGreen = new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x33ff33, emissiveIntensity: 1.5 });
  
  for (let i = 0; i < 5; i++) {
    const kRed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), ledRed);
    kRed.position.set(-0.2 + i * 0.1, 3.49, 1.45);
    stageGroup.add(kRed);

    const kGreen = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), ledGreen);
    kGreen.position.set(-0.2 + i * 0.1, 3.49, 1.25);
    stageGroup.add(kGreen);
  }

  // Glowing Laptop (Facing the DJ)
  const laptopGroup = new THREE.Group();
  laptopGroup.position.set(0, 3.48, 1.65);
  laptopGroup.rotation.y = Math.PI + 0.15;

  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.38), new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.8, roughness: 0.2 }));
  laptopBase.castShadow = true;
  laptopGroup.add(laptopBase);

  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.02), new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.8, roughness: 0.2 }));
  laptopScreen.position.set(0, 0.19, -0.18);
  laptopScreen.rotation.x = -0.3;
  laptopScreen.castShadow = true;
  laptopGroup.add(laptopScreen);

  // Neon visualizer glow on the laptop screen
  const screenWaveMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.0 });
  const screenWave = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.005), screenWaveMat);
  screenWave.position.set(0, 0.19, -0.17);
  screenWave.rotation.x = -0.3;
  laptopGroup.add(screenWave);

  stageGroup.add(laptopGroup);

  const stairMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 0.7), stairMat); step.position.set(0, 0.15 + i * 0.3, 9 + i * 0.7); step.castShadow = true; step.receiveShadow = true; stageGroup.add(step);
  }

  // LED SCREEN WALL (Pushed back to sz = -6 for more stage depth)
  const screenW = 24, screenH = 13.5, sy = 10.3, sz = -6;
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.7, metalness: 0.3 });
  const casing = new THREE.Mesh(new THREE.BoxGeometry(screenW + 1.2, screenH + 1.2, 0.5), casingMat); casing.position.set(0, sy, sz - 0.5); casing.castShadow = true; stageGroup.add(casing);
  
  const blueFrameMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 });
  const hFrameGeo = new THREE.BoxGeometry(screenW + 0.4, 0.15, 0.2);
  const topBar = new THREE.Mesh(hFrameGeo, blueFrameMat); topBar.position.set(0, sy + (screenH / 2) + 0.1, sz - 0.05); stageGroup.add(topBar);
  const botBar = new THREE.Mesh(hFrameGeo, blueFrameMat); botBar.position.set(0, sy - (screenH / 2) - 0.1, sz - 0.05); stageGroup.add(botBar);
  const vFrameGeo = new THREE.BoxGeometry(0.15, screenH + 0.4, 0.2);
  const leftBar = new THREE.Mesh(vFrameGeo, blueFrameMat); leftBar.position.set(-(screenW / 2) - 0.1, sy, sz - 0.05); stageGroup.add(leftBar);
  const rightBar = new THREE.Mesh(vFrameGeo, blueFrameMat); rightBar.position.set((screenW / 2) + 0.1, sy, sz - 0.05); stageGroup.add(rightBar);

  const screenCanvas = document.createElement("canvas"); screenCanvas.width = 640; screenCanvas.height = 360;
  const screenCtx = screenCanvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  
  // Punch a hole in the WebGL canvas to show the CSS3D iframe behind it
  const holePunchMat = new THREE.ShaderMaterial({
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); }`,
    blending: THREE.NoBlending,
    transparent: true
  });
  
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), holePunchMat); screenMesh.position.set(0, sy, sz + 0.05); stageGroup.add(screenMesh);
  
  (scene as any).__screenCtx = screenCtx; (scene as any).__screenTex = screenTexture; (scene as any).__screenVideoId = videoId;

  // Overhead bamboo truss (Pushed back to z = -6 to stay aligned with the screen)
  const trussMat = new THREE.MeshStandardMaterial({ color: 0xb59a68, roughness: 0.9, flatShading: true });
  [-13, 13].forEach(x => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 18.5, 8), trussMat); post.position.set(x, 9.25, -6); post.castShadow = true; stageGroup.add(post); });
  const topTruss = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 27, 8), trussMat); topTruss.position.set(0, 18.5, -6); topTruss.rotation.z = Math.PI/2; topTruss.castShadow = true; topTruss.castShadow = true; stageGroup.add(topTruss);
  for(let i=-12; i<=12; i+=2) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshStandardMaterial({color: 0xffddaa, emissive: 0xffddaa, emissiveIntensity: 1.0})); bulb.position.set(i, 18.3, -5.8); stageGroup.add(bulb); }

  // ── SPEAKERS ──
  const spLeft = createSpeaker(-15, -4);
  const spRight = createSpeaker(15, -4);
  stageGroup.add(spLeft.group);
  stageGroup.add(spRight.group);
  const allWoofers = [...spLeft.woofers, ...spRight.woofers];

  // --- LED DANCE FLOOR ---
  const danceTiles: THREE.MeshStandardMaterial[] = [];
  const danceFloorGroup = new THREE.Group();
  danceFloorGroup.position.set(0, 0.05, -14); // Positioned nicely in front of the stage
  const cols = 12, rows = 8;
  const tileSize = 2.2;
  const floorBase = new THREE.Mesh(new THREE.BoxGeometry(cols * tileSize + 0.5, 0.2, rows * tileSize + 0.5), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 }));
  floorBase.position.y = -0.1; floorBase.receiveShadow = true; danceFloorGroup.add(floorBase);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hue = ((r * cols + c) * 23) % 360;
      const colHex = new THREE.Color(`hsl(${hue}, 100%, 55%)`).getHex();
      const tileMat = new THREE.MeshPhysicalMaterial({
        color: colHex, emissive: colHex, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.9, roughness: 0.1, metalness: 0.8, clearcoat: 1.0
      });
      danceTiles.push(tileMat);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize - 0.1, tileSize - 0.1), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set((c - cols/2 + 0.5) * tileSize, 0.01, (r - rows/2 + 0.5) * tileSize);
      tile.receiveShadow = true;
      danceFloorGroup.add(tile);
    }
  }
  scene.add(danceFloorGroup);

  // --- PARTICLE SYSTEM (FESTIVAL HAZE/CONFETTI) ---
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 600;
  const pPos = new Float32Array(particleCount * 3);
  for(let i=0; i<particleCount; i++) {
    pPos[i*3] = (Math.random() - 0.5) * 40;
    pPos[i*3+1] = Math.random() * 15;
    pPos[i*3+2] = -28 + (Math.random() - 0.5) * 30; // Centered around stage/dancefloor
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // --- COLLISION SYSTEM ---
  const staticColliders: { type: 'circle'|'box', x: number, z: number, r?: number, w?: number, d?: number, rotY?: number }[] = [];
  function addCircCol(x: number, z: number, r: number) { staticColliders.push({ type: 'circle', x, z, r }); }
  function addBoxCol(x: number, z: number, w: number, d: number, rotY: number = 0) { staticColliders.push({ type: 'box', x, z, w, d, rotY }); }
  function checkCol(nx: number, nz: number, radius: number): boolean {
    for (const c of staticColliders) {
      if (c.type === 'circle') {
        const dx = nx - c.x, dz = nz - c.z;
        if (dx * dx + dz * dz < (c.r! + radius) * (c.r! + radius)) return true;
      } else if (c.type === 'box') {
        const dx = nx - c.x, dz = nz - c.z;
        const rx = dx * Math.cos(-c.rotY!) - dz * Math.sin(-c.rotY!);
        const rz = dx * Math.sin(-c.rotY!) + dz * Math.cos(-c.rotY!);
        if (Math.abs(rx) < c.w! / 2 + radius && Math.abs(rz) < c.d! / 2 + radius) return true;
      }
    }
    return false;
  }

  // --- STAGE COLLISION BOUNDARY ---
  // Block access to the entire main stage platform (width 26, depth 14) centered at z=-26
  addBoxCol(0, -26, 26.5, 14.5);
  // Block the stage front stairs
  addBoxCol(0, -18.3, 5.5, 2.5);
  // Block the giant side speakers and the gaps next to the stage
  addBoxCol(-15, -32, 5, 2);
  addBoxCol(15, -32, 5, 2);
  // Add a huge invisible back wall so players can't wander endlessly behind the stage
  addBoxCol(0, -35, 80, 2);

  // Walkways out to the sides
  scene.add(createWalkway(-18, -12, 16, 0.2)); scene.add(createWalkway(18, -12, 16, -0.2));
  
  const seats: any[] = [];
  function registerSeat(obj: THREE.Group, offset: THREE.Vector3) {
    scene.add(obj);
    seats.push({
      pos: new THREE.Vector3().copy(obj.position).add(offset.applyEuler(obj.rotation)),
      occupied: false,
      rotY: obj.rotation.y
    });
  }
  function registerDualSeat(obj: THREE.Group, offset1: THREE.Vector3, offset2: THREE.Vector3) {
    scene.add(obj);
    seats.push({
      pos: new THREE.Vector3().copy(obj.position).add(offset1.applyEuler(obj.rotation.clone())),
      occupied: false,
      rotY: obj.rotation.y
    });
    seats.push({
      pos: new THREE.Vector3().copy(obj.position).add(offset2.applyEuler(obj.rotation.clone())),
      occupied: false,
      rotY: obj.rotation.y
    });
  }

  // Extra Beach & Social areas
  scene.add(createPier(-40, 20));
  scene.add(createLifeguardTower(-10, 35, 0.2)); addBoxCol(-10, 35, 3, 3, 0.2);
  
  // Campfire corner gathering zone
  const bonfire = createBonfire(-35, 35);
  scene.add(bonfire); addCircCol(-35, 35, 1.5);
  registerSeat(createLogSeat(-38, 35, Math.PI/2), new THREE.Vector3(0, 0, 0)); addCircCol(-38, 35, 0.8);
  registerSeat(createLogSeat(-32, 35, -Math.PI/2), new THREE.Vector3(0, 0, 0)); addCircCol(-32, 35, 0.8);
  registerSeat(createBeachChair(-35, 38, Math.PI), new THREE.Vector3(0, 0, 0)); addCircCol(-35, 38, 0.8);
  registerSeat(createBeachChair(-36, 32, 0), new THREE.Vector3(0, 0, 0)); addCircCol(-36, 32, 0.8);
  registerSeat(createBeachChair(-34, 32, 0), new THREE.Vector3(0, 0, 0)); addCircCol(-34, 32, 0.8);
  
  // Scatter benches and picnic tables
  registerDualSeat(createBench(15, 30, -0.5, true), new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)); addBoxCol(15, 30, 2.5, 1, -0.5);
  registerDualSeat(createBench(22, 28, 0.5, true), new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)); addBoxCol(22, 28, 2.5, 1, 0.5);
  registerDualSeat(createPicnicTable(-25, 25, 0.1, true), new THREE.Vector3(-0.8, 0, 0.9), new THREE.Vector3(0.8, 0, -0.9)); addBoxCol(-25, 25, 3, 3, 0.1);
  registerDualSeat(createPicnicTable(-32, 22, -0.3, true), new THREE.Vector3(-0.8, 0, 0.9), new THREE.Vector3(0.8, 0, -0.9)); addBoxCol(-32, 22, 3, 3, -0.3);

  // Party Area additions
  scene.add(createDancePodium(-10, -10)); addCircCol(-10, -10, 1.8);
  scene.add(createDancePodium(10, -10)); addCircCol(10, -10, 1.8);
  scene.add(createPhotoBooth(20, -5, -Math.PI/4)); addBoxCol(20, -5, 2.5, 2.5, -Math.PI/4);
  scene.add(createLEDCube(-15, -20, 0x00ffff)); addBoxCol(-15, -20, 1.5, 1.5);
  scene.add(createLEDCube(15, -20, 0xff00ff)); addBoxCol(15, -20, 1.5, 1.5);
  scene.add(createSignboard(0, -2, 0, "MAIN STAGE")); addBoxCol(0, -2, 4, 0.5);
  scene.add(createSignboard(-25, 10, Math.PI/4, "CHILL ZONE")); addBoxCol(-25, 10, 4, 0.5, Math.PI/4);

  // Wispr Flow Beach Banners (featured marketing billboard on the beach sand)
  scene.add(createBeachWisprBanner(8.5, 1.0, -Math.PI / 8));
  addBoxCol(8.5, 1.0, 6.4, 0.8, -Math.PI / 8);
  scene.add(createBeachWisprBanner(-18, 14, Math.PI / 5));
  addBoxCol(-18, 14, 6.4, 0.8, Math.PI / 5);

  // Balloons
  for(let i=0; i<10; i++) scene.add(createBalloon((Math.random()-0.5)*40, -10 + Math.random()*20, Math.random()*0xffffff));

  const treePositions = [[18, -15], [-24, -12], [28, -28], [-29, -25], [14, 5], [-15, 8], [30, 12], [-32, 15], [8, 25], [-10, 28], [-38, 5], [42, 15]];
  treePositions.forEach(([tx, tz]) => { scene.add(createPalmTree(tx, tz, 1.2 + Math.random()*0.5)); addCircCol(tx, tz, 0.6); });
  scene.add(createStall(-25, -5, Math.PI/4, "coconut")); addBoxCol(-25, -5, 4, 4, Math.PI/4);
  scene.add(createStall(25, -5, -Math.PI/4, "icecream")); addBoxCol(25, -5, 4, 4, -Math.PI/4);
  scene.add(createStall(-22, 12, Math.PI/3, "surf")); addBoxCol(-22, 12, 4, 4, Math.PI/3);
  for(let i=0; i<8; i++) {
    const x = -30 + i*10 + (Math.random()-0.5)*2; const z = 18 + (Math.random()-0.5)*4; const color = [0xff4444, 0x44aaff, 0x44ff44, 0xffaa44][i%4]; const rotY = Math.random()*Math.PI;
    scene.add(createSunLounger(x, z, rotY, color)); addBoxCol(x, z, 1.5, 2.5, rotY);
    if (i % 2 === 0) { scene.add(createUmbrella(x+1.5, z-1, color, 0xffffff)); addCircCol(x+1.5, z-1, 0.3); }
  }
  for(let i=0; i<15; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random()*0.8), MAT_ROCK); const ang = Math.random()*Math.PI*2; const rad = 28 + Math.random()*15;
    const rx = Math.cos(ang)*rad; const rz = Math.sin(ang)*rad - 10;
    r.position.set(rx, 0.3, rz); r.rotation.set(Math.random(), Math.random(), Math.random()); r.castShadow = true; scene.add(r);
    addCircCol(rx, rz, 1.2);
  }
  for(let i=0; i<8; i++) scene.add(createCloud((Math.random()-0.5)*100, 30 + Math.random()*15, (Math.random()-0.5)*80, 2 + Math.random()*3));

  const lasers: any[] = [];
  [-12, 12].forEach(x => {
    const l1 = createBeamLight(0x00ffff);
    l1.group.position.set(x, 0, -20);
    l1.group.rotation.z = x > 0 ? 0.5 : -0.5;
    stageGroup.add(l1.group);
    lasers.push(l1);
  });
  [-8, 8].forEach(x => {
    const l1 = createBeamLight(0xff00ff);
    l1.group.position.set(x, 0, -18);
    l1.group.rotation.z = x > 0 ? 0.3 : -0.3;
    stageGroup.add(l1.group);
    lasers.push(l1);
  });

  const birds = new THREE.Group();
  for(let i=0; i<12; i++) {
    const b = createBird((Math.random()-0.5)*100, 40 + Math.random()*20, (Math.random()-0.5)*100);
    (b as any).speed = 8 + Math.random()*5;
    (b as any).angle = Math.random() * Math.PI * 2;
    (b as any).radius = 30 + Math.random()*50;
    (b as any).oy = b.position.y;
    birds.add(b);
  }
  scene.add(birds);

  const shark = createShark();
  scene.add(shark);
  
  const fishes: any[] = [];
  for(let i=0; i<30; i++) {
    const type = Math.floor(Math.random() * 3);
    const color = [0xff8800, 0x00ffff, 0xff00ff, 0xffff00][Math.floor(Math.random()*4)];
    const f = createFish(color, type);
    (f as any).speed = 2 + Math.random()*2;
    (f as any).angle = Math.random() * Math.PI * 2;
    (f as any).radius = 10 + Math.random()*20;
    (f as any).cx = (Math.random()-0.5)*40;
    (f as any).cz = 40 + Math.random()*40;
    
    // Group some fish into schools
    if (i > 0 && Math.random() > 0.5) {
      const leader = fishes[Math.floor(Math.random() * fishes.length)];
      (f as any).speed = leader.speed;
      (f as any).radius = leader.radius + (Math.random()-0.5)*2;
      (f as any).cx = leader.cx;
      (f as any).cz = leader.cz;
      (f as any).angle = leader.angle + (Math.random()-0.5)*0.5;
    }
    
    scene.add(f);
    fishes.push(f);
  }

  const boat = createBoat();
  scene.add(boat);

  // Majestic Jesus Statue Landmark
  const jesusStatue = createChristTheRedeemer(0, 180, 1.0);
  scene.add(jesusStatue);

  const npcs: any[] = [];
  function addNPC(color: string, x: number, y: number, z: number, rotY: number, anim: string, canWander: boolean = false, isDancer: boolean = false) {
    const seed = Math.floor(Math.random()*1000);
    const avatar = createAvatarGroup(color, seed);
    avatar.group.position.set(x, y, z);
    avatar.group.rotation.y = rotY;
    scene.add(avatar.group);
    npcs.push({ group: avatar.group, parts: avatar.parts, anim, originalAnim: anim, seed, canWander, isDancer, stateTimer: Math.random() * 5, target: new THREE.Vector3(x, y, z) });
  }

  // Shopkeepers & Shop Buildings
  const barShop = createBeachShop('bar');
  barShop.position.set(-25, 0, -5);
  barShop.rotation.y = Math.PI / 4;
  scene.add(barShop);
  addNPC('#ffaa00', -25, 0, -5, Math.PI/4, 'wave');

  const surfShop = createBeachShop('surf');
  surfShop.position.set(25, 0, -5);
  surfShop.rotation.y = -Math.PI / 4;
  scene.add(surfShop);
  addNPC('#00ffff', 25, 0, -5, -Math.PI/4, 'cheer');

  const coconutStand = createBeachShop('coconut');
  coconutStand.position.set(-22, 0, 12);
  coconutStand.rotation.y = Math.PI / 3;
  scene.add(coconutStand);
  addNPC('#ff00ff', -22, 0, 12, Math.PI/3, 'idle');

  // New Shop 4: Apparel & Beachwear Shop
  const apparelShop = createBeachShop('apparel');
  apparelShop.position.set(22, 0, 12);
  apparelShop.rotation.y = -Math.PI / 3;
  scene.add(apparelShop);
  addNPC('#ffcc00', 22, 0, 12, -Math.PI/3, 'cheer');

  // New Shop 5: Beach Massage & Spa Cabana (Right Side, quiet beach)
  const spaCabana1 = createBeachShop('spa');
  spaCabana1.position.set(28, 0, -18);
  spaCabana1.rotation.y = -Math.PI / 2;
  scene.add(spaCabana1);
  addNPC('#00e6aa', 28, 0, -18, -Math.PI/2, 'wave');

  // New Shop 6: Beach Massage & Spa Cabana (Left Side, quiet beach)
  const spaCabana2 = createBeachShop('spa');
  spaCabana2.position.set(-28, 0, -18);
  spaCabana2.rotation.y = Math.PI / 2;
  scene.add(spaCabana2);
  addNPC('#e6aa00', -28, 0, -18, Math.PI/2, 'wave');
  
  // DJ and Singer on Stage
  const micStand = createMicrophoneStand();
  micStand.position.set(0.0, 1.2, -23.2); // Place in front of the Singer (front and center)
  scene.add(micStand);
  
  // DJ stands on the elevated riser (y=2.0) behind the mixer booth facing the dance floor
  addNPC('#ff33aa', 0, 2.0, -28.0, 0, 'dance'); 

  // Singer stands on the lower platform (y=1.2) next to the mic stand
  addNPC('#00ffcc', 0.0, 1.2, -24.0, 0, 'cheer');

  // Customize Stage Performers with Accessories (Headphones and Sunglasses)
  const djNPC = npcs[npcs.length - 2];
  if (djNPC) {
    let head: THREE.Group | null = null;
    djNPC.group.traverse(child => {
      if (child instanceof THREE.Group && child.position.y === 1.35) {
        head = child;
      }
    });

    if (head) {
      // Build physical DJ Headphones and attach to head
      const hpGroup = new THREE.Group();
      const hpMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xccff00, emissive: 0xccff00, emissiveIntensity: 1.5 }); // neon yellow headband

      // Left Ear Cup
      const eCupL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), hpMat);
      eCupL.rotation.z = Math.PI / 2;
      eCupL.position.set(-0.25, 0, 0);
      hpGroup.add(eCupL);

      // Right Ear Cup
      const eCupR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), hpMat);
      eCupR.rotation.z = Math.PI / 2;
      eCupR.position.set(0.25, 0, 0);
      hpGroup.add(eCupR);

      // Headband arch
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), bandMat);
      band.position.set(0, 0.25, 0);
      hpGroup.add(band);

      // Left and right support struts
      const lSup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.08), hpMat);
      lSup.position.set(-0.24, 0.125, 0);
      hpGroup.add(lSup);

      const rSup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.08), hpMat);
      rSup.position.set(0.24, 0.125, 0);
      hpGroup.add(rSup);

      hpGroup.position.set(0, 0.1, 0);
      head.add(hpGroup);
    }
  }

  const singerNPC = npcs[npcs.length - 1];
  if (singerNPC) {
    let head: THREE.Group | null = null;
    singerNPC.group.traverse(child => {
      if (child instanceof THREE.Group && child.position.y === 1.35) {
        head = child;
      }
    });

    if (head) {
      // Build glowing neon sunglasses and attach to head
      const glassesGroup = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.0 }); // neon cyan frames
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });

      // Frame bar
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.04), frameMat);
      frame.position.set(0, 0.04, 0.24);
      glassesGroup.add(frame);

      // Left and Right Lenses & Frames
      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.02), lensMat);
      lensL.position.set(-0.11, 0.01, 0.25);
      glassesGroup.add(lensL);
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.04), frameMat);
      frameL.position.set(-0.11, 0.01, 0.24);
      glassesGroup.add(frameL);

      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.02), lensMat);
      lensR.position.set(0.11, 0.01, 0.25);
      glassesGroup.add(lensR);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.04), frameMat);
      frameR.position.set(0.11, 0.01, 0.24);
      glassesGroup.add(frameR);

      // Sides/temples extending back
      const templeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26), frameMat);
      templeL.position.set(-0.24, 0.04, 0.12);
      glassesGroup.add(templeL);

      const templeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26), frameMat);
      templeR.position.set(0.24, 0.04, 0.12);
      glassesGroup.add(templeR);

      glassesGroup.position.set(0, 0, 0);
      head.add(glassesGroup);
    }
  }
  
  // Sitters
  addNPC('#44aaff', 15.5, 0.5, 30, -Math.PI/2, 'sit');
  addNPC('#ff44aa', 21.5, 0.5, 28, Math.PI/2, 'sit');

  // Party Bouncer
  addNPC('#111111', 0, 0, -12, Math.PI, 'idle'); // Facing crowd
  // Stage Bouncers (Security Guard NPCs on left/right front corners of the stage)
  addNPC('#111111', -11.0, 0, -17.5, 0, 'idle'); 
  addNPC('#111111', 11.0, 0, -17.5, 0, 'idle');
  // Add sunglasses, earpieces, and high-visibility neon security vests to stage bouncers
  for (let i = 1; i <= 2; i++) {
    const bouncer = npcs[npcs.length - i];
    if (bouncer && bouncer.parts) {
      const root = bouncer.parts.root;
      const head = root.children.find(c => c instanceof THREE.Group && c.position.y === 1.35) as THREE.Group;

      if (head) {
        // Black sunglasses
        const glasses = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
        
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.04), frameMat);
        frame.position.set(0, 0.04, 0.24);
        glasses.add(frame);
        
        const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.02), lensMat);
        lensL.position.set(-0.11, 0.01, 0.25);
        glasses.add(lensL);
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), frameMat);
        frameL.position.set(-0.11, 0.01, 0.24);
        glasses.add(frameL);

        const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.02), lensMat);
        lensR.position.set(0.11, 0.01, 0.25);
        glasses.add(lensR);
        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), frameMat);
        frameR.position.set(0.11, 0.01, 0.24);
        glasses.add(frameR);

        glasses.position.set(0, 0, 0.02);
        head.add(glasses);

        // Security Earpiece (white cylinder in the right ear)
        const earpieceMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6), earpieceMat);
        ear.position.set(0.24, -0.05, -0.05); // right ear side
        ear.rotation.z = Math.PI / 3;
        head.add(ear);
        
        // Coiled wire running down
        const wire = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.008), earpieceMat);
        wire.position.set(0.25, -0.15, -0.08);
        head.add(wire);
      }

      // Add High-Visibility Neon Security Vest over the torso!
      if (root) {
        const vestMat = new THREE.MeshStandardMaterial({ color: 0xccff00, roughness: 0.6 }); // neon yellow vest
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }); // silver reflective stripe
        
        const vestGroup = new THREE.Group();

        // Front vest panel
        const frontVest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.02), vestMat);
        frontVest.position.set(0, 0.72, 0.16); // body is at y=0.72, Z extends to 0.15
        vestGroup.add(frontVest);
        
        // Back vest panel
        const backVest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.02), vestMat);
        backVest.position.set(0, 0.72, -0.16);
        vestGroup.add(backVest);

        // Silver reflective stripes
        const stripeF = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.05, 0.022), stripeMat);
        stripeF.position.set(0, 0.72, 0.16);
        vestGroup.add(stripeF);

        const stripeB = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.05, 0.022), stripeMat);
        stripeB.position.set(0, 0.72, -0.16);
        vestGroup.add(stripeB);

        // Text block on the back
        const labelText = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.024), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        labelText.position.set(0, 0.84, -0.16);
        vestGroup.add(labelText);

        root.add(vestGroup);
      }
    }
  }

  // Dancers — wander the dance floor, each has a unique style via their random seed
  for(let i=0; i<8; i++) {
    addNPC(`hsl(${Math.random()*360}, 80%, 50%)`, (Math.random()-0.5)*18, 0, -6 - Math.random()*10, 0, 'dance', false, true);
  }

  // Wandering beachgoers
  for(let i=0; i<12; i++) {
    addNPC(`hsl(${Math.random()*360}, 60%, 70%)`, (Math.random()-0.5)*40, 0, 10 + Math.random()*25, Math.random()*Math.PI*2, 'walk', true);
  }

  // Campfire gatherers
  addNPC('#ff8844', -35, 0.5, 38, 0, 'sit');
  addNPC('#aa44ff', -36, 0.5, 32, Math.PI, 'sit');
  addNPC('#44ff88', -33, 0, 32, -Math.PI/4, 'chat');
  addNPC('#ffff44', -37, 0, 34, Math.PI/2, 'idle');

  return { uniforms, danceTiles, particles, woofers: allWoofers, birds, shark, fishes, boat, lasers, npcs, seats, bonfire, checkCol };
}

export function ThreeCanvas({ playerName, playerColor, botsRef, onAnimChange, onPlayerUpdate, videoId, screenOverlayRef, audioEnabled, globalVolume, isMuted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onAnimRef = useRef(onAnimChange);
  const onPlayerUpdateRef = useRef(onPlayerUpdate);
  const lastUpdateRef = useRef<number>(0);

  const [showInteract, setShowInteract] = useState(false);
  const activeSeatRef = useRef<{ pos: THREE.Vector3, obj?: any } | null>(null);
  const isSeatedRef = useRef(false);

  useEffect(() => { onPlayerUpdateRef.current = onPlayerUpdate; }, [onPlayerUpdate]);
  const videoIdRef = useRef(videoId);
  const lastVolumeRef = useRef<number>(-1);
  const wasAudioEnabledRef = useRef<boolean>(false);
  const hasInteractedWithVideoRef = useRef<boolean>(false);
  const lastVolumeUpdateRef = useRef<number>(0);
  const cameraYaw = useRef(Math.PI);
  const cameraPitch = useRef(0.32);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => { onAnimRef.current = onAnimChange; }, [onAnimChange]);
  useEffect(() => { 
    if (videoIdRef.current !== videoId) {
      videoIdRef.current = videoId;
      wasAudioEnabledRef.current = false; // Reset to ensure new iframe gets unmuted
      hasInteractedWithVideoRef.current = false; // Reset interaction flag for new video
      lastVolumeRef.current = -1; // Force volume update
      lastVolumeUpdateRef.current = 0; // Reset throttler
    }
  }, [videoId]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const w = container.clientWidth || container.offsetWidth || 800;
    const h = container.clientHeight || container.offsetHeight || 600;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(w, h);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRenderer.domElement.style.zIndex = '0';
    container.appendChild(cssRenderer.domElement);

    const cssScene = new THREE.Scene();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 250);
    camera.position.set(0, 5, 16);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.25, 0.1, 0.85); // Slightly stronger bloom for lights
    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const { uniforms, danceTiles, particles, woofers, birds, shark, fishes, boat, lasers, npcs, seats, bonfire, checkCol } = buildScene(scene, videoId);

    // ---- RAVE / FESTIVAL LIGHTING SETUP ----
    const raveColors = [0xff2bd6, 0x00eaff, 0xaa44ff, 0xffffff, 0x00ffff, 0xff66aa];
    const raveLights = raveColors.map((color, i) => {
      // These act as strong floodlights lighting up the players on the dance floor
      const l = new THREE.PointLight(color, 25, 30);
      l.castShadow = false; // Cast shadows disabled for performance (36 extra renders/frame)
      // l.shadow.bias = -0.001;
      const phase = (i / raveColors.length) * Math.PI * 2;
      l.position.set(Math.sin(phase) * 14, 4, -18 + Math.cos(phase) * 7);
      scene.add(l);
      return { light: l, phase };
    });

    const beamDefs = [
      { color: 0xff2bd6, phase: 0,   speed: 0.7 },
      { color: 0x00eaff, phase: 0.8, speed: 1.1 },
      { color: 0xaa44ff, phase: 1.6, speed: 0.85 },
      { color: 0xffffff, phase: 2.4, speed: 1.15 },
      { color: 0x00ffff, phase: 3.2, speed: 0.9 },
      { color: 0xff66aa, phase: 4.0, speed: 1.05 },
      { color: 0xaa44ff, phase: 4.8, speed: 0.8 },
      { color: 0xffffff, phase: 5.6, speed: 1.2 },
    ];
    const beamXs = [-11, -8, -5, -2, 2, 5, 8, 11];
    const beams = beamDefs.map((def, i) => {
      const b = createBeamLight(def.color);
      b.group.position.set(beamXs[i], 18.2, -34); // Mounted to the top truss at Y=18.2, Z=-34 (above the screen)
      scene.add(b.group);
      scene.add(b.light);
      return { ...b, ...def };
    });

    const { group: playerGroup, parts: playerParts } = createAvatarGroup(playerColor, hashStr(playerName));
    playerGroup.position.set(0, 0, 5);
    scene.add(playerGroup);
    const playerLabel = createLabel(playerName, playerColor);
    playerGroup.add(playerLabel);

    const botObjects: Record<string, { group: THREE.Group; parts: AvatarParts; phase: number }> = {};

    const keys: Record<string, boolean> = {};
    const playerPos = new THREE.Vector3(0, 0, 5);
    let velocityY = 0;
    let isOnGround = true;
    let currentAnim = 'idle';

    const setAnim = (a: string) => {
      if (currentAnim !== a) {
        currentAnim = a;
        onAnimRef.current(a);
      }
    };

    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (MOVE_KEYS.has(k)) {
        e.preventDefault();
        if (isSeatedRef.current) {
          isSeatedRef.current = false;
          if (activeSeatRef.current) activeSeatRef.current.occupied = false;
          setAnim('idle');
        }
      }
      if (k === 'e' && !isSeatedRef.current && activeSeatRef.current && !activeSeatRef.current.occupied) {
         isSeatedRef.current = true;
         activeSeatRef.current.occupied = true;
         playerPos.copy(activeSeatRef.current.pos);
         playerGroup.rotation.y = activeSeatRef.current.rotY;
         setAnim('sit');
      } else if (k === 'e' && isSeatedRef.current) {
         isSeatedRef.current = false;
         if (activeSeatRef.current) activeSeatRef.current.occupied = false;
         setAnim('idle');
      }
      if (k === 'c') setAnim('dance');
      if (k === 'v') setAnim('wave');
      if (k === 'b') setAnim('cheer');
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys[k] = false;
      if (['c', 'v', 'b'].includes(k)) setAnim('idle');
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('keyup', onKeyUp, { capture: true });
    canvas.focus();

    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      renderer.setSize(nw, nh, false);
      cssRenderer.setSize(nw, nh);
      composer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const sc = (scene as any).__screenCtx;
    const st = (scene as any).__screenTex;

    const drawScreen = (t: number) => {
      if (!sc || !st) return;
      const grad = sc.createLinearGradient(0, 0, 0, 360);
      grad.addColorStop(0, '#0a0524');
      grad.addColorStop(1, '#020210');
      sc.fillStyle = grad;
      sc.fillRect(0, 0, 640, 360);

      for (let y = 0; y < 360; y += 4) {
        sc.fillStyle = 'rgba(0,0,0,0.2)';
        sc.fillRect(0, y, 640, 2);
      }

      const bars = 56;
      const bw = Math.floor(640 / bars) - 1;
      for (let i = 0; i < bars; i++) {
        const wave1 = Math.abs(Math.sin(t * 2.8 + i * 0.38)) * 130;
        const wave2 = Math.abs(Math.sin(t * 1.9 + i * 0.55 + 1)) * 90;
        const wave3 = Math.abs(Math.sin(t * 4.1 + i * 0.22 + 2)) * 50;
        const hh = wave1 + wave2 * 0.5 + wave3 * 0.3 + 12;
        const hue = (i / bars * 280 + t * 35) % 360;
        const bg = sc.createLinearGradient(0, 360 - hh, 0, 360);
        bg.addColorStop(0, `hsla(${hue}, 100%, 75%, 1)`);
        bg.addColorStop(1, `hsla(${(hue + 40) % 360}, 100%, 45%, 0.8)`);
        sc.fillStyle = bg;
        sc.fillRect(i * (bw + 1), 360 - hh, bw, hh);
        sc.fillStyle = `hsla(${hue}, 100%, 92%, 0.95)`;
        sc.fillRect(i * (bw + 1), 360 - hh - 2, bw, 2);
      }

      sc.save();
      sc.textAlign = 'center';
      sc.font = 'bold 68px Orbitron, monospace';
      sc.shadowColor = '#00eaff';
      sc.shadowBlur = 40;
      sc.fillStyle = '#00eaff';
      sc.fillText('partly', 320, 108);
      sc.shadowBlur = 15;
      sc.fillStyle = '#ffffff';
      sc.fillText('partly', 320, 108);
      sc.restore();

      sc.save();
      sc.textAlign = 'center';
      sc.font = 'bold 15px Orbitron, monospace';
      sc.fillStyle = '#ff2bd6';
      sc.shadowColor = '#ff2bd6';
      sc.shadowBlur = 12;
      sc.fillText('NOW PLAYING — LIVE SET', 320, 148);
      sc.restore();

      sc.save();
      sc.fillStyle = 'rgba(255,255,255,0.08)';
      sc.beginPath();
      sc.roundRect(185, 162, 270, 22, 11);
      sc.fill();
      sc.textAlign = 'center';
      sc.font = '11px monospace';
      sc.fillStyle = 'rgba(255,255,255,0.5)';
      sc.shadowBlur = 0;
      sc.fillText(`youtu.be/${videoIdRef.current}`, 320, 177);
      sc.restore();

      sc.save();
      sc.fillStyle = '#e00030';
      sc.beginPath();
      sc.roundRect(18, 18, 68, 26, 5);
      sc.fill();
      sc.font = 'bold 13px Orbitron, monospace';
      sc.fillStyle = '#ffffff';
      sc.textAlign = 'left';
      sc.fillText('● LIVE', 27, 35);
      sc.restore();

      sc.save();
      sc.textAlign = 'right';
      sc.font = '12px Rajdhani, Arial';
      sc.fillStyle = 'rgba(255,255,255,0.55)';
      const viewers = 200 + Math.floor(Math.sin(t * 0.2) * 30 + 30);
      sc.fillText(`👥 ${viewers} watching`, 622, 32);
      sc.restore();

      st.needsUpdate = true;
    };

    // Create the iframe natively to completely decouple it from React and prevent detachment bugs
    const el = document.createElement('div');
    el.style.width = '640px';
    el.style.height = '360px';
    el.style.background = '#000';
    el.style.boxShadow = 'inset 0 0 40px rgba(0,0,0,0.8)';
    el.style.border = '1px solid rgba(0,234,255,0.2)';
    el.style.overflow = 'hidden';
    
    const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    const iframe = document.createElement('iframe');
    iframe.id = 'stage-youtube-iframe';
    const safeVideoId = encodeURIComponent(videoId.replace(/[^a-zA-Z0-9_-]/g, ''));
    const startSec = getSyncedStartSeconds(safeVideoId);
    iframe.src = `https://www.youtube.com/embed/${safeVideoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&showinfo=0&disablekb=1&loop=1&playlist=${safeVideoId}&vq=medium&start=${startSec}${originParam}`;
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.title = 'Stage Screen';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.pointerEvents = 'none';
    iframe.style.transform = 'scale(1.02)'; // Clean fit without cutting off video text
    el.appendChild(iframe);
    
    const cssObj = new CSS3DObject(el);
    cssObj.position.set(0, 10.3, -34); // Match screen Z position (Z = -34 absolute)
    cssObj.scale.set(24 / 640, 13.5 / 360, 1); // Scale up to match the 24x13.5 screen size
    cssScene.add(cssObj);

    const tempCamTarget = new THREE.Vector3();
    const tempBotTarget = new THREE.Vector3();
    const tempBotDiff = new THREE.Vector3();
    
    const timer = new Timer();
    let animId: number;
    let lastDraw = 0;
    const CAM_DIST = 11;
    const stageFocus = new THREE.Vector3(0, 5, -28);

    const animate = (timestamp?: number) => {
      animId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      const t = timer.getElapsed();
      const beat = (Math.sin(t * 4) * 0.5 + 0.5);
      
      uniforms.time.value = t;

      // ── 3D Positional Audio (Volume scaling) ──
      const dist = playerPos.distanceTo(stageFocus);
      let distVol = 1.0;
      const refDist = 18; // Full volume within 18 units
      
      // ── Check Seats ──
      if (!isSeatedRef.current) {
        let nearestSeat = null;
        let minDist = Infinity;
        seats.forEach(s => {
           const d = playerPos.distanceTo(s.pos);
           if (d < 1.5 && d < minDist && !s.occupied) {
             nearestSeat = s;
             minDist = d;
           }
        });
        activeSeatRef.current = nearestSeat;
        setShowInteract(nearestSeat !== null);
      } else {
        setShowInteract(false);
      }
      const maxDist = 65; // Volume drops off to near zero around 65 units
      if (dist > refDist) {
        distVol = Math.max(0, 1 - (dist - refDist) / (maxDist - refDist));
        // Add a slight exponential curve for more realistic falloff
        distVol = Math.pow(distVol, 1.5);
      }
      
      const targetVolume = isMuted || !audioEnabled ? 0 : Math.round(globalVolume * distVol);
      
      const iframe = document.getElementById('stage-youtube-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        if (t - lastVolumeUpdateRef.current > 0.15) {
          if (targetVolume !== lastVolumeRef.current) {
            const previousVolume = lastVolumeRef.current;
            lastVolumeRef.current = targetVolume;
            lastVolumeUpdateRef.current = t;
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [targetVolume]
            }), '*');
            
            // Only explicitly unmute if we are transitioning from 0 volume
            if (audioEnabled && targetVolume > 0 && previousVolume <= 0) {
              iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'unMute',
                args: []
              }), '*');
            }
          }
        }
        
        if (audioEnabled && !wasAudioEnabledRef.current) {
          wasAudioEnabledRef.current = true;
          // Delay the first unMute slightly to give iframe time to load
          setTimeout(() => {
            iframe.contentWindow?.postMessage(JSON.stringify({
              event: 'command',
              func: 'unMute',
              args: []
            }), '*');
            iframe.contentWindow?.postMessage(JSON.stringify({
              event: 'command',
              func: 'playVideo',
              args: []
            }), '*');
            iframe.contentWindow?.postMessage(JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [lastVolumeRef.current]
            }), '*');
          }, 1000);
          
          // Backup commands just in case the iframe was slow to load
          setTimeout(() => {
            iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
            iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [lastVolumeRef.current] }), '*');
          }, 3000);
        }
      }

      const SPEED = 7, GRAVITY = -22, JUMP = 9;
      const yaw = cameraYaw.current;
      const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
      const rtX = Math.cos(yaw), rtZ = -Math.sin(yaw);

      let moveX = 0, moveZ = 0;
      if (keys['w'] || keys['arrowup'])    { moveX += fwdX; moveZ += fwdZ; }
      if (keys['s'] || keys['arrowdown'])  { moveX -= fwdX; moveZ -= fwdZ; }
      if (keys['a'] || keys['arrowleft'])  { moveX -= rtX;  moveZ -= rtZ;  }
      if (keys['d'] || keys['arrowright']) { moveX += rtX;  moveZ += rtZ;  }

      if (isSeatedRef.current) {
        moveX = 0; moveZ = 0;
      }
      const isMoving = moveX !== 0 || moveZ !== 0;
      if (isMoving) {
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const nx = playerPos.x + (moveX / len) * SPEED * delta;
        const nz = playerPos.z + (moveZ / len) * SPEED * delta;
        
        // Floor constraints
        const onDanceFloor = nx > -12 && nx < 12 && nz > -24 && nz < -4;
        const canMoveX = !checkCol(nx, playerPos.z, 0.4);
        const canMoveZ = !checkCol(playerPos.x, nz, 0.4);
        const diagonalOk = !checkCol(nx, nz, 0.4);
        
        if (canMoveX) playerPos.x = nx;
        if (canMoveZ) playerPos.z = nz;
        if (!canMoveX && !canMoveZ && diagonalOk) {
           playerPos.x = nx;
           playerPos.z = nz;
        }

        playerGroup.rotation.y = Math.atan2(moveX, moveZ);
        if (!['dance', 'wave', 'cheer', 'sit'].includes(currentAnim)) setAnim('walk');
      } else if (currentAnim === 'walk') {
        setAnim('idle');
      }

      playerPos.x = Math.max(-38, Math.min(38, playerPos.x));
      playerPos.z = Math.max(-48, Math.min(18, playerPos.z));

      if (!isSeatedRef.current) {
        if (keys[' '] && isOnGround) { velocityY = JUMP; isOnGround = false; }
        velocityY += GRAVITY * delta;
        playerPos.y += velocityY * delta;
        
        // Step up behavior on dance floor (dance floor is at y=0.25)
        const onDanceFloor = playerPos.x > -12 && playerPos.x < 12 && playerPos.z > -24 && playerPos.z < -4;
        const groundY = onDanceFloor ? 0.25 : 0;
        if (playerPos.y <= groundY) { playerPos.y = groundY; velocityY = 0; isOnGround = true; }
      } else {
        playerPos.y = activeSeatRef.current?.pos.y || 0;
      }

      playerGroup.position.copy(playerPos);
      animateAvatar(playerParts, currentAnim, t, hashStr(playerName));

      // Throttle network updates to 10fps
      if (t - lastUpdateRef.current > 0.1 && onPlayerUpdateRef.current) {
        lastUpdateRef.current = t;
        onPlayerUpdateRef.current([playerPos.x, playerPos.y, playerPos.z], playerGroup.rotation.y, currentAnim);
      }

      playerGroup.children.forEach(c => {
        if (c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry && c.position.y > 1.8) {
          c.lookAt(camera.position);
        }
      });

      const pitch = cameraPitch.current;
      const camTargetX = playerPos.x + Math.sin(yaw) * CAM_DIST * Math.cos(pitch);
      const camTargetY = playerPos.y + Math.sin(pitch) * CAM_DIST + 1.2;
      const camTargetZ = playerPos.z + Math.cos(yaw) * CAM_DIST * Math.cos(pitch);
      tempCamTarget.set(camTargetX, camTargetY, camTargetZ);
      camera.position.lerp(tempCamTarget, 0.12);
      
      // Subtle bass effect: camera shake if close to stage
      if (dist < 15 && beat > 0.8) {
        const shake = (15 - dist) * 0.002 * beat;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        camera.position.z += (Math.random() - 0.5) * shake;
      }
      
      camera.lookAt(playerPos.x, playerPos.y + 1.4, playerPos.z);
      camera.updateMatrixWorld();

      cssRenderer.render(cssScene, camera);

      const bots = botsRef.current;
      
      // Add new bots
      bots.forEach((bot, i) => {
        if (!botObjects[bot.id]) {
          const { group, parts } = createAvatarGroup(bot.color || '#ffffff', hashStr(bot.name || 'Unknown'));
          const pos = bot.pos || [0, 0, 5];
          group.position.set(pos[0], pos[1], pos[2]);
          const label = createLabel(bot.name || 'Unknown', bot.color || '#ffffff');
          group.add(label);
          scene.add(group);
          botObjects[bot.id] = { group, parts, phase: i * 0.41 };
        }
      });
      
      // Remove stale bots (throttled to 3% of frames to eliminate Set allocation overhead)
      // Remove stale bots (throttled)
      if (Math.random() < 0.03) {
        const currentBotIds = new Set(bots.map(b => b.id));
        Object.keys(botObjects).forEach(id => {
          if (!currentBotIds.has(id)) {
            scene.remove(botObjects[id].group);
            delete botObjects[id];
          }
        });
      }

      // Update bots
      bots.forEach((bot) => {
        const obj = botObjects[bot.id];
        if (!obj) return;
 
        const tPos = bot.targetPos || bot.pos || [0, 0, 5];
        tempBotTarget.set(tPos[0], tPos[1], tPos[2]);
        const botOnDanceFloor = tempBotTarget.x > -12 && tempBotTarget.x < 12 && tempBotTarget.z > -24 && tempBotTarget.z < -4;
        tempBotTarget.y = botOnDanceFloor ? 0.25 : 0; // Bots step onto dancefloor
 
        obj.group.position.lerp(tempBotTarget, delta * 12);
        tempBotDiff.subVectors(tempBotTarget, obj.group.position);
        const movingBot = tempBotDiff.length() > 0.18;
        if (movingBot) {
          obj.group.rotation.y = Math.atan2(tempBotDiff.x, tempBotDiff.z);
        } else if (bot.rotation !== undefined) {
          // Use network synced rotation if available
          obj.group.rotation.y = bot.rotation;
        } else {
          const dx = stageFocus.x - obj.group.position.x;
          const dz = stageFocus.z - obj.group.position.z;
          obj.group.rotation.y = Math.atan2(dx, dz);
        }
        
        const anim = movingBot ? 'walk' : (bot.animation || 'idle');
        animateAvatar(obj.parts, anim, t + obj.phase, hashStr(bot.name || 'Unknown'));
        
        // Label distance check
        const distToPlayer = playerGroup.position.distanceTo(obj.group.position);
        obj.group.children.forEach(c => {
          if (c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry && c.position.y > 1.8) {
            c.lookAt(camera.position);
            // Show only if close (e.g., within 15 units)
            const mat = c.material as THREE.MeshBasicMaterial;
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, distToPlayer < 15 ? 1 : 0, 0.1);
            c.visible = mat.opacity > 0.01;
          }
        });
      });

      // --- ANIMATE FESTIVAL EFFECTS ---
      raveLights.forEach(({ light, phase }) => {
        light.position.x = Math.sin(t * 0.4 + phase) * 14;
        light.position.z = -18 + Math.cos(t * 0.3 + phase) * 7;
        light.intensity = 15 + beat * 15;
      });

      woofers.forEach(w => {
        w.emissiveIntensity = 0.5 + beat * 2.5;
        // Make the bass pulse visually by changing the hue slightly
        w.color.setHSL(0.8, 1, 0.1 + beat * 0.2);
        w.emissive.setHSL(0.8, 1, 0.5 + beat * 0.3);
      });

      beams.forEach(({ beamGroup, light, phase, speed, color }, i) => {
        const bt = t * speed + phase;
        beamGroup.rotation.z = Math.sin(bt) * 0.85;
        beamGroup.rotation.x = Math.sin(bt * 0.7) * 0.35 + 0.15;
        const cosZ = Math.cos(beamGroup.rotation.z);
        const sinZ = Math.sin(beamGroup.rotation.z);
        // Position PointLight scan target to strictly oscillate on the dance floor (Z between -7 and -23) projecting from Y=18.2
        light.position.set(beamXs[i] + sinZ * 16.2, 18.2 - cosZ * 16.2, -15 + Math.sin(bt * 0.7) * 8);
        light.intensity = 6 + beat * 8;
        const inner = beamGroup.children[1] as THREE.Mesh;
        const outer = beamGroup.children[0] as THREE.Mesh;
        (inner.material as THREE.MeshBasicMaterial).opacity = 0.15 + beat * 0.15;
        (outer.material as THREE.MeshBasicMaterial).opacity = 0.08 + beat * 0.08;
      });

      danceTiles.forEach((m, idx) => {
        const hue = ((idx * 17) + t * 60) % 360;
        const col = new THREE.Color(`hsl(${hue}, 100%, 55%)`);
        m.color.copy(col);
        m.emissive.copy(col);
        m.emissiveIntensity = 0.6 + beat * 1.0;
      });

      const pPositions = particles.geometry.attributes.position.array as Float32Array;
      for(let i=0; i<600; i++) {
        pPositions[i*3+1] += delta * (0.5 + Math.random() * 0.5); // float up
        pPositions[i*3] += Math.sin(t + i) * delta * 0.4; // swirl x
        pPositions[i*3+2] += Math.cos(t + i) * delta * 0.4; // swirl z
        if (pPositions[i*3+1] > 15) {
          pPositions[i*3+1] = 0; // Reset to ground
          pPositions[i*3] = (Math.random() - 0.5) * 40;
          pPositions[i*3+2] = -28 + (Math.random() - 0.5) * 30;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      // --------------------------------

      // --- ANIMATE NEW ENTITIES ---
      birds.children.forEach((b: any) => {
        b.angle += delta * b.speed * 0.05;
        b.position.x = Math.cos(b.angle) * b.radius;
        b.position.z = Math.sin(b.angle) * b.radius;
        b.position.y = b.oy + Math.sin(t * 2 + b.angle) * 5;
        b.rotation.y = -b.angle;
        if (b.wings) b.wings.rotation.x = Math.sin(t * 15 + b.angle) * 0.5;
      });

      shark.position.set(Math.cos(t * 0.5) * 35, -0.3, 60 + Math.sin(t * 0.5) * 20);
      shark.rotation.y = -(t * 0.5);
      shark.position.y = -0.5 + Math.sin(t) * 0.2;
      
      fishes.forEach((f: any) => {
        f.angle += delta * f.speed * 0.2;
        // Natural swimming bob, stay underwater
        const yPos = -1.2 + Math.sin(t * 2 + f.angle) * 0.2;
        // Swimming wobble
        const wobble = Math.sin(t * 8 + f.angle) * 0.15;
        f.rotation.y = -f.angle + Math.PI / 2 + wobble;
        f.rotation.x = Math.sin(t * 4 + f.angle) * 0.08;
        f.position.set(f.cx + Math.cos(f.angle) * f.radius, yPos, f.cz + Math.sin(f.angle) * f.radius);
      });

      boat.position.set(Math.cos(t * 0.1) * 60, Math.sin(t*1.5)*0.2 - 0.2, 80 + Math.sin(t * 0.15) * 30);
      boat.rotation.y = -(t * 0.1) - 0.5;
      boat.rotation.z = Math.sin(t * 1.5) * 0.1;

      lasers.forEach((l, i) => {
        l.group.rotation.x = Math.sin(t * 2 + i) * 0.5;
        l.group.rotation.y = Math.cos(t * 1.5 + i) * 0.5;
      });
      
      if (bonfire && bonfire.userData) {
        const bd = bonfire.userData;
        const bT = t * 2 + bd.tOffset;
        bd.fire.scale.set(1 + Math.sin(bT)*0.1, 1 + Math.random()*0.2, 1 + Math.cos(bT)*0.1);
        bd.fireOuter.scale.set(1.2 + Math.sin(bT*0.8)*0.2, 1.2 + Math.random()*0.3, 1.2 + Math.cos(bT*0.8)*0.2);
        bd.fireOuter.rotation.y += delta * 2;
        bd.fire.rotation.y -= delta;
        bd.light.intensity = 5 + Math.random() * 2;
        
        // Embers (High-performance reuse of geometry & material)
        while(bd.embers.children.length < 15) {
          const ember = new THREE.Mesh(bd.emberGeo, bd.emberMat);
          ember.position.set((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5);
          (ember as any).vy = 1 + Math.random()*2;
          (ember as any).life = 1.0;
          bd.embers.add(ember);
        }
        for(let i=bd.embers.children.length-1; i>=0; i--) {
          const e = bd.embers.children[i] as any;
          e.position.y += e.vy * delta;
          e.position.x += Math.sin(t*5 + e.position.y)*0.5 * delta;
          e.life -= delta * 0.5;
          e.scale.setScalar(Math.max(0, e.life));
          if (e.life <= 0) bd.embers.remove(e);
        }
      }

      npcs.forEach(npc => {
        let groundY = 0;
        // Check if on stage (platform or riser)
        if (npc.group.position.z < -21) {
          // Check if on the DJ riser area
          if (npc.group.position.x > -4 && npc.group.position.x < 4 && npc.group.position.z < -26 && npc.group.position.z > -30) {
            groundY = 2.0;
          } else {
            groundY = 1.2;
          }
        } else {
          // Dance floor or beach
          const npcOnDanceFloor = npc.group.position.x > -12 && npc.group.position.x < 12 && npc.group.position.z > -24 && npc.group.position.z < -4;
          groundY = npcOnDanceFloor ? 0.25 : 0;
        }

        if (npc.anim !== 'sit') {
          npc.group.position.y += (groundY - npc.group.position.y) * 0.1;
        }

        if (npc.isDancer) {
          npc.stateTimer -= delta;
          if (npc.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.4) {
              // Dance in place
              npc.anim = 'dance';
              npc.stateTimer = 3 + Math.random() * 5;
            } else {
              // Walk to a new spot on the dance floor
              npc.anim = 'walk';
              npc.stateTimer = 1.5 + Math.random() * 2.5;
              npc.target.set(
                (Math.random() - 0.5) * 18,
                0,
                -6 - Math.random() * 10
              );
            }
          }
          if (npc.anim === 'walk') {
            const dx = npc.target.x - npc.group.position.x;
            const dz = npc.target.z - npc.group.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 0.5) {
              const nx = npc.group.position.x + (dx / d) * 3 * delta;
              const nz = npc.group.position.z + (dz / d) * 3 * delta;
              const canMoveX = !checkCol(nx, npc.group.position.z, 0.4);
              const canMoveZ = !checkCol(npc.group.position.x, nz, 0.4);
              const diagonalOk = !checkCol(nx, nz, 0.4);
              if (canMoveX) npc.group.position.x = nx;
              if (canMoveZ) npc.group.position.z = nz;
              if (!canMoveX && !canMoveZ && diagonalOk) {
                npc.group.position.x = nx;
                npc.group.position.z = nz;
              }
              npc.group.rotation.y = Math.atan2(dx, dz);
            } else {
              npc.anim = 'dance';
              npc.stateTimer = 3 + Math.random() * 5;
            }
          }
        } else if (npc.canWander) {
          npc.stateTimer -= delta;
          if (npc.stateTimer <= 0) {
            // Pick a new state
            const r = Math.random();
            if (r < 0.4) {
              npc.anim = 'idle';
              npc.stateTimer = 2 + Math.random() * 4;
            } else if (r < 0.6) {
              npc.anim = 'chat';
              npc.stateTimer = 4 + Math.random() * 6;
            } else {
              npc.anim = 'walk';
              npc.stateTimer = 3 + Math.random() * 5;
              // Pick a new random target nearby
              const dist = 3 + Math.random() * 7;
              const angle = Math.random() * Math.PI * 2;
              npc.target.set(
                Math.max(-45, Math.min(45, npc.group.position.x + Math.cos(angle) * dist)),
                0,
                Math.max(-16, Math.min(45, npc.group.position.z + Math.sin(angle) * dist))
              );
            }
          }
          
          if (npc.anim === 'walk') {
            const dx = npc.target.x - npc.group.position.x;
            const dz = npc.target.z - npc.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Simple collision avoidance against other NPCs (repulsion)
            let repX = 0, repZ = 0;
            npcs.forEach(other => {
              if (other === npc) return;
              const ox = npc.group.position.x - other.group.position.x;
              const oz = npc.group.position.z - other.group.position.z;
              const odist = Math.sqrt(ox*ox + oz*oz);
              if (odist > 0 && odist < 2.0) {
                repX += (ox/odist) * (2.0 - odist);
                repZ += (oz/odist) * (2.0 - odist);
              }
            });

            // Avoid player
            const px = npc.group.position.x - playerPos.x;
            const pz = npc.group.position.z - playerPos.z;
            const pdist = Math.sqrt(px*px + pz*pz);
            if (pdist > 0 && pdist < 2.5) {
              repX += (px/pdist) * (2.5 - pdist);
              repZ += (pz/pdist) * (2.5 - pdist);
            }

            if (dist > 0.5) {
              const moveX = (dx / dist) + repX * 2;
              const moveZ = (dz / dist) + repZ * 2;
              const mLen = Math.sqrt(moveX*moveX + moveZ*moveZ);
              if (mLen > 0) {
                 const nx = npc.group.position.x + (moveX / mLen) * 2.5 * delta;
                 const nz = npc.group.position.z + (moveZ / mLen) * 2.5 * delta;
                 const canMoveX = !checkCol(nx, npc.group.position.z, 0.4);
                 const canMoveZ = !checkCol(npc.group.position.x, nz, 0.4);
                 const diagonalOk = !checkCol(nx, nz, 0.4);
                 if (canMoveX) npc.group.position.x = nx;
                 if (canMoveZ) npc.group.position.z = nz;
                 if (!canMoveX && !canMoveZ && diagonalOk) {
                   npc.group.position.x = nx;
                   npc.group.position.z = nz;
                 }
                 npc.group.rotation.y = Math.atan2(moveX, moveZ);
              }
            } else {
              npc.anim = 'idle';
              npc.stateTimer = 1 + Math.random() * 3;
            }
          }
        }
        animateAvatar(npc.parts, npc.anim, t, npc.seed);
      });
      // --------------------------------

      // Disable drawing the 2D canvas visualizer since the YouTube iframe is rendering in front of it
      // if (t - lastDraw > 0.1) {
      //   drawScreen(t);
      //   lastDraw = t;
      // }
      // Use direct WebGLRenderer instead of EffectComposer to preserve the transparency/alpha channel of the canvas
      renderer.render(scene, camera);
    };
    animate();

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      
      // Unmute and play the YouTube video on first user interaction, syncing timestamp
      if (!hasInteractedWithVideoRef.current) {
        const iframe = document.getElementById('stage-youtube-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          hasInteractedWithVideoRef.current = true;
          const startSec = getSyncedStartSeconds(videoId);
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [startSec, true]
          }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'unMute',
            args: []
          }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), '*');
        }
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      cameraYaw.current += dx * 0.006;
      cameraPitch.current = Math.max(0.08, Math.min(1.1, cameraPitch.current - dy * 0.004));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'crosshair';
    };
    const onTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      
      // Unmute and play the YouTube video on first user interaction for touch devices, syncing timestamp
      if (!hasInteractedWithVideoRef.current) {
        const iframe = document.getElementById('stage-youtube-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          hasInteractedWithVideoRef.current = true;
          const startSec = getSyncedStartSeconds(videoId);
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [startSec, true]
          }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'unMute',
            args: []
          }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), '*');
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      cameraYaw.current += dx * 0.006;
      cameraPitch.current = Math.max(0.08, Math.min(1.1, cameraPitch.current - dy * 0.004));
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { isDragging.current = false; };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      if (container.contains(cssRenderer.domElement)) {
        container.removeChild(cssRenderer.domElement);
      }
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    const iframe = document.getElementById('stage-youtube-iframe') as HTMLIFrameElement;
    if (iframe) {
      const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
      const safeVideoId = encodeURIComponent(videoId.replace(/[^a-zA-Z0-9_-]/g, ''));
      const startSec = getSyncedStartSeconds(safeVideoId);
      iframe.src = `https://www.youtube.com/embed/${safeVideoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&showinfo=0&disablekb=1&loop=1&playlist=${safeVideoId}&vq=medium&start=${startSec}${originParam}`;
    }
  }, [videoId]);

  // Sync volume and mute state from the React HUD/audio props to the iframe
  useEffect(() => {
    const iframe = document.getElementById('stage-youtube-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const volume = Math.round(globalVolume * 100);
      const isActuallyMuted = isMuted || !audioEnabled;
      
      // We must wait a tiny bit for the iframe JS API to initialize after load/mount
      const sendVolumeCommands = () => {
        if (isActuallyMuted) {
          iframe.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'mute',
            args: []
          }), '*');
        } else {
          iframe.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'unMute',
            args: []
          }), '*');
          iframe.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [volume]
          }), '*');
          iframe.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), '*');
        }
      };
      
      sendVolumeCommands();
      // Retry in 1.5 seconds just in case the iframe was still initializing on first mount
      const timer = setTimeout(sendVolumeCommands, 1500);
      return () => clearTimeout(timer);
    }
  }, [audioEnabled, globalVolume, isMuted, videoId]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none', cursor: 'crosshair', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
      />
      {showInteract && (
        <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '8px', color: '#00ffff', fontFamily: 'monospace', fontSize: '18px', border: '1px solid #00ffff', textShadow: '0 0 5px #00ffff', pointerEvents: 'none' }}>
          [E] to Sit
        </div>
      )}
    </div>
  );
}