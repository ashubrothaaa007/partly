import * as THREE from 'three';
import { MAT_WOOD, MAT_WOOD_LIGHT, MAT_ROCK } from './materials';
import {
  createPalmTree,
  createSunLounger,
  createUmbrella,
  createStall,
  createWalkway,
  createCloud,
  createLifeguardTower,
  createLogSeat,
  createBeachChair,
  createBench,
  createPicnicTable,
  createBonfire,
  createBalloon,
  createLEDCube,
  createPier,
  createDancePodium,
  createPhotoBooth,
  createSignboard,
  createBeachWisprBanner,
  createBeachHackerHouseBanner,
  createBeachShop
} from './props';
import { createBird, createShark, createFish, createBoat, createChristTheRedeemer } from './wildlife';
import { createSpeaker, createMicrophoneStand, createBeamLight } from './stage';
import { createAvatarGroup, animateAvatar } from './avatars';
import type { SceneBuildResult, SeatData } from './types';

export function buildScene(scene: THREE.Scene, videoId: string): { uniforms: { time: { value: number } }, danceTiles: THREE.MeshStandardMaterial[], particles: THREE.Points, woofers: THREE.MeshStandardMaterial[], birds: THREE.Group, shark: THREE.Group, fishes: any[], boat: THREE.Group, lasers: any[], npcs: any[], seats: any[], bonfire: THREE.Group | null, checkCol: (nx: number, nz: number, radius: number) => boolean } {
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

  // Standalone Beach Marketing Billboards
  // Wispr Flow on elevated ground overlooking the beach (separate from the concert stage)
  scene.add(createBeachWisprBanner(9.5, 1.5, -Math.PI / 8));
  addBoxCol(9.5, 1.5, 6.8, 3.2, -Math.PI / 8);

  // Hacker House Goa billboard near chill zone
  scene.add(createBeachHackerHouseBanner(-18, 14, Math.PI / 5));
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
