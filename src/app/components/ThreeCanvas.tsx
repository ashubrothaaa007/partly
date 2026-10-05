import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import type { ThreeCanvasProps } from '../../scene/types';
import { createAvatarGroup, animateAvatar, createLabel, hashStr } from '../../scene/avatars';
import { createBeamLight, SLOT_MS, VIDEO_DURATIONS, getSyncedStartSeconds } from '../../scene/stage';
import { buildScene } from '../../scene/world';

export type { ThreeCanvasProps };
export type Props = ThreeCanvasProps;

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
