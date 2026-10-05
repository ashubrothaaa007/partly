import type { MutableRefObject } from 'react';
import * as THREE from 'three';

export interface BotData {
  id: string;
  name: string;
  color: string;
  pos: [number, number, number];
  targetPos: [number, number, number];
  animation: string;
}

export interface ThreeCanvasProps {
  playerName: string;
  playerColor: string;
  botsRef: MutableRefObject<any[]>;
  onAnimChange: (a: string) => void;
  onPlayerUpdate?: (pos: [number, number, number], rot: number, anim: string) => void;
  videoId: string;
  videoTitle?: string;
  screenOverlayRef: MutableRefObject<HTMLDivElement | null>;
  audioEnabled: boolean;
  globalVolume: number;
  isMuted: boolean;
}

export interface AvatarParts {
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  root: THREE.Group;
}

export interface SeatData {
  pos: THREE.Vector3;
  occupied: boolean;
  rotY: number;
}

export interface SceneBuildResult {
  uniforms: { time: { value: number } };
  danceTiles: THREE.MeshStandardMaterial[];
  particles: THREE.Points;
  woofers: THREE.MeshStandardMaterial[];
  birds: THREE.Group;
  shark: THREE.Group;
  fishes: any[];
  boat: THREE.Group;
  lasers: any[];
  npcs: any[];
  seats: SeatData[];
  bonfire: THREE.Group | null;
  checkCol: (nx: number, nz: number, radius: number) => boolean;
}
