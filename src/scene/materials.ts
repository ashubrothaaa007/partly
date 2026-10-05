import * as THREE from 'three';

export const SKIN_TONES = [0xf5cba0, 0xe2a76f, 0xc68642, 0x8d5524, 0xffd9b3, 0xa86b3c];
export const HAIR_COLORS = [0x1a1a1a, 0x3b1f0b, 0x6b3410, 0xc28840, 0xe8d27a, 0xff4488, 0x44ffff, 0xaa44ff, 0xffffff];
export const PANTS_COLORS = [0x1a1a2a, 0x2a1a3a, 0x101020, 0x301a10, 0x202040];

export const MAT_WOOD = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9, flatShading: true });
export const MAT_WOOD_LIGHT = new THREE.MeshStandardMaterial({ color: 0xc2a077, roughness: 0.9, flatShading: true });
export const MAT_LEAF = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, flatShading: true });
export const MAT_ROCK = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, flatShading: true });
export const MAT_ROOF = new THREE.MeshStandardMaterial({ color: 0xd4c084, roughness: 1.0, flatShading: true });

export const MAT_RED = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
export const MAT_FIRE = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
export const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
export const MAT_NEON_PINK = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });
