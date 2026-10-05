import * as THREE from 'three';
import { SKIN_TONES, HAIR_COLORS, PANTS_COLORS } from './materials';
import type { AvatarParts } from './types';

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

export function createAvatarGroup(color: string, seed: number): { group: THREE.Group; parts: AvatarParts } {
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
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), hairMat);
    cap.position.y = 0.18;
    headGroup.add(cap);
  } else if (hairStyle === 1) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), hairMat);
    cap.position.y = 0.18;
    headGroup.add(cap);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.12), hairMat);
    back.position.set(0, -0.05, -0.2);
    headGroup.add(back);
  } else if (hairStyle === 2) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), hairMat);
    top.position.y = 0.32;
    headGroup.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), hairMat);
    base.position.y = 0.17;
    headGroup.add(base);
  } else {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.52), new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.6 }));
    cap.position.y = 0.2;
    headGroup.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.18), new THREE.MeshStandardMaterial({ color: 0x111122 }));
    brim.position.set(0, 0.14, 0.28);
    headGroup.add(brim);
  }

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), eyeMat);
  eyeL.position.set(-0.11, 0.04, 0.235);
  headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), eyeMat);
  eyeR.position.set(0.11, 0.04, 0.235);
  headGroup.add(eyeR);
  root.add(headGroup);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.3), jacketMat);
  body.position.y = 0.72;
  root.add(body);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.32), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  trim.position.set(0, 0.72, 0.01);
  root.add(trim);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, 0.98, 0);
  leftArm.rotation.z = 0.15;
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.2), jacketMat);
  lArmMesh.position.y = -0.22;
  leftArm.add(lArmMesh);
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.21), skinMat);
  lHand.position.y = -0.5;
  leftArm.add(lHand);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.34, 0.98, 0);
  rightArm.rotation.z = -0.15;
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.2), jacketMat);
  rArmMesh.position.y = -0.22;
  rightArm.add(rArmMesh);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.21), skinMat);
  rHand.position.y = -0.5;
  rightArm.add(rHand);
  root.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.13, 0.42, 0);
  const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat);
  lLegMesh.position.y = -0.28;
  leftLeg.add(lLegMesh);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.13, 0.42, 0);
  const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat);
  rLegMesh.position.y = -0.28;
  rightLeg.add(rLegMesh);
  root.add(rightLeg);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, parts: { leftArm, rightArm, leftLeg, rightLeg, root } };
}

export function animateAvatar(parts: AvatarParts, animation: string, t: number, seed: number = 0) {
  const baseY = animation === 'sit' ? 0 : 0.135;
  const { leftArm, rightArm, leftLeg, rightLeg, root } = parts;
  leftArm.rotation.set(0, 0, 0.15);
  rightArm.rotation.set(0, 0, -0.15);
  leftLeg.rotation.set(0, 0, 0);
  rightLeg.rotation.set(0, 0, 0);
  root.position.y = baseY;

  if (animation === 'walk') {
    leftArm.rotation.x = Math.sin(t * 7) * 0.55;
    rightArm.rotation.x = -Math.sin(t * 7) * 0.55;
    leftLeg.rotation.x = -Math.sin(t * 7) * 0.45;
    rightLeg.rotation.x = Math.sin(t * 7) * 0.45;
  } else if (animation.startsWith('dance')) {
    const style = seed % 5;
    const beat = t * 4 + seed;
    if (style === 0) {
      root.position.y = baseY + Math.abs(Math.sin(beat)) * 0.28;
      leftArm.rotation.x = Math.sin(beat + 1) * 1.2;
      rightArm.rotation.x = -Math.sin(beat + 1) * 1.2;
      leftArm.rotation.z = 0.55 + Math.sin(beat * 2) * 0.4;
      rightArm.rotation.z = -(0.55 + Math.sin(beat * 2) * 0.4);
      leftLeg.rotation.x = Math.sin(beat) * 0.18;
      rightLeg.rotation.x = -Math.sin(beat) * 0.18;
    } else if (style === 1) {
      root.position.y = baseY + Math.abs(Math.sin(beat * 1.5)) * 0.15;
      leftArm.rotation.x = -Math.PI / 2 + Math.sin(beat) * 0.5;
      rightArm.rotation.x = -Math.PI / 2 - Math.sin(beat) * 0.5;
      leftLeg.rotation.x = Math.sin(beat * 2) * 0.1;
      rightLeg.rotation.x = -Math.sin(beat * 2) * 0.1;
    } else if (style === 2) {
      root.position.y = baseY + Math.abs(Math.cos(beat)) * 0.2;
      leftArm.rotation.z = 1.0 + Math.sin(beat) * 0.3;
      rightArm.rotation.z = -1.0 + Math.cos(beat) * 0.3;
      leftLeg.rotation.z = Math.sin(beat) * 0.12;
      rightLeg.rotation.z = -Math.sin(beat) * 0.12;
    } else if (style === 3) {
      root.position.y = baseY + Math.abs(Math.sin(beat * 2)) * 0.18;
      leftArm.rotation.x = Math.abs(Math.sin(beat * 2)) * 1.6;
      rightArm.rotation.x = Math.abs(Math.sin(beat * 2 + Math.PI)) * 1.6;
      leftArm.rotation.z = 0.25;
      rightArm.rotation.z = -0.25;
      leftLeg.rotation.x = Math.sin(beat * 2) * 0.25;
      rightLeg.rotation.x = -Math.sin(beat * 2) * 0.25;
    } else {
      root.position.y = baseY + Math.sin(beat * 2) * 0.1;
      leftArm.rotation.x = Math.sin(beat * 1.2) * 0.9;
      rightArm.rotation.x = Math.sin(beat * 1.2 + 1.5) * 0.9;
      leftArm.rotation.z = 0.6 + Math.cos(beat) * 0.35;
      rightArm.rotation.z = -(0.6 + Math.cos(beat + 1) * 0.35);
      leftLeg.rotation.x = Math.cos(beat * 2) * 0.18;
      rightLeg.rotation.x = -Math.cos(beat * 2) * 0.18;
    }
  } else if (animation === 'wave') {
    rightArm.rotation.z = -1.3 - Math.sin(t * 6 + seed) * 0.3;
    rightArm.rotation.x = -0.2;
  } else if (animation === 'cheer') {
    leftArm.rotation.z = 1.2 + Math.sin(t * 8 + seed) * 0.25;
    rightArm.rotation.z = -(1.2 + Math.sin(t * 8 + seed) * 0.25);
    root.position.y = baseY + Math.abs(Math.sin(t * 6 + seed)) * 0.18;
  } else if (animation === 'sit') {
    leftLeg.rotation.x = -1.2;
    rightLeg.rotation.x = -1.2;
    root.position.y = baseY - 0.38;
  } else if (animation === 'chat') {
    root.position.y = baseY + Math.sin(t * 1.5 + seed) * 0.05;
    leftArm.rotation.x = Math.sin(t * 2 + seed) * 0.2;
    rightArm.rotation.x = Math.cos(t * 2 + seed) * 0.2;
  } else {
    root.position.y = baseY + Math.sin(t * 1.5 + seed) * 0.05;
    leftArm.rotation.z = 0.15 + Math.sin(t * 0.9 + seed) * 0.06;
    rightArm.rotation.z = -(0.15 + Math.sin(t * 0.9 + seed) * 0.06);
  }
}

export function createLabel(text: string, color: string): THREE.Mesh {
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
