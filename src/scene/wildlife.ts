import * as THREE from 'three';
import { MAT_WOOD } from './materials';

export function createBird(x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 3), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const wingsGeo = new THREE.BufferGeometry();
  const vertices = new Float32Array([-0.8, 0, 0, 0.8, 0, 0, 0, 0.1, -0.2]);
  wingsGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  wingsGeo.computeVertexNormals();
  const wings = new THREE.Mesh(wingsGeo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }));
  g.add(wings);
  (g as any).wings = wings;
  return g;
}

export function createShark() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.3, 5, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = -0.5;
  g.add(body);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4), bodyMat);
  fin.position.set(0, 0.5, -0.5);
  fin.rotation.x = -0.2;
  g.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.5), bodyMat);
  tail.position.set(0, -0.5, -2.5);
  g.add(tail);
  return g;
}

export function createFish(color: number, type: number = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });

  if (type === 0) {
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
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), mat);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 1.5);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 3), mat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.4;
    g.add(tail);
  } else {
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

export function createBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 5), hullMat);
  hull.position.y = 0.3;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.3, 2.5);
  g.add(bow);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), MAT_WOOD);
  mast.position.y = 2.5;
  g.add(mast);
  const sailGeo = new THREE.BufferGeometry();
  const sailVerts = new Float32Array([0, 4, 0, 0, 1, 0, 0, 1, -3]);
  sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, side: THREE.DoubleSide }));
  g.add(sail);
  return g;
}

export function createChristTheRedeemer(x: number, z: number, scale: number = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.set(scale, scale, scale);

  const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, metalness: 0.1 });

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0 });
  const islandGeo = new THREE.DodecahedronGeometry(12, 1);
  const island = new THREE.Mesh(islandGeo, rockMat);
  island.position.y = -2;
  island.scale.set(1, 0.4, 1);
  island.castShadow = true;
  island.receiveShadow = true;
  g.add(island);

  const baseGeo = new THREE.CylinderGeometry(4, 5, 8, 12);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.y = 4;
  base.castShadow = true;
  g.add(base);

  const bodyGeo = new THREE.CylinderGeometry(2, 3.5, 14, 12);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 15;
  body.castShadow = true;
  g.add(body);

  const torsoGeo = new THREE.BoxGeometry(4.5, 7, 3);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 25.5;
  torso.castShadow = true;
  g.add(torso);

  const armsGeo = new THREE.BoxGeometry(22, 2, 2);
  const arms = new THREE.Mesh(armsGeo, mat);
  arms.position.y = 27.5;
  arms.castShadow = true;
  g.add(arms);

  const handGeo = new THREE.BoxGeometry(1.2, 1.5, 1.2);
  const lHand = new THREE.Mesh(handGeo, mat);
  lHand.position.set(-11.5, 27.2, 0);
  g.add(lHand);
  const rHand = new THREE.Mesh(handGeo, mat);
  rHand.position.set(11.5, 27.2, 0);
  g.add(rHand);

  const headGeo = new THREE.BoxGeometry(2.5, 3.5, 2.5);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 30.5;
  head.castShadow = true;
  g.add(head);

  g.rotation.y = Math.PI;
  return g;
}
