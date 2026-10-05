import * as THREE from 'three';

export const SLOT_MS = 5 * 60 * 1000; // 5 minutes per playlist slot

export const VIDEO_DURATIONS: Record<string, number> = {
  '0sCaK_7cDO0': 165, // Wispr Flow takes on India: 2m 45s (165 seconds)
};

export function getSyncedStartSeconds(_vId: string): number {
  return 0; // Clean start for concert preview
}

export function createBeamLight(color: number) {
  const group = new THREE.Group();
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x18181f, metalness: 0.85 })
  );
  group.add(housing);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color }));
  lens.position.y = -0.28;
  lens.rotation.x = -Math.PI / 2;
  group.add(lens);

  const beamGroup = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(3.5, 25, 16, 1, true);
  coneGeo.translate(0, -12.5, 0);
  const coneMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  beamGroup.add(cone);

  const innerGeo = new THREE.ConeGeometry(1.2, 25, 16, 1, true);
  innerGeo.translate(0, -12.5, 0);
  const innerMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  beamGroup.add(inner);
  group.add(beamGroup);

  const light = new THREE.PointLight(color, 6, 35);
  light.position.set(0, -8, 0);

  return { group, beamGroup, light };
}

export function createSpeaker(x: number, z: number): { group: THREE.Group; woofers: THREE.MeshStandardMaterial[] } {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8, metalness: 0.4 });
  const woofers: THREE.MeshStandardMaterial[] = [];

  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.0), cabinetMat);
    cab.position.y = i * 1.6 + 0.75;
    cab.castShadow = true;
    g.add(cab);

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

  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x333333, wireframe: true }));
  stand.position.y = 0.25;
  g.add(stand);

  g.rotation.y = x > 0 ? -0.2 : 0.2; // Angle inward toward dance floor

  return { group: g, woofers };
}

export function createMicrophoneStand() {
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
