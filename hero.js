// The hero: one plane, one shader, a sheet of blue silk moving in a slow wind.
import * as THREE from 'three';

const canvas = document.getElementById('silk');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  // no WebGL: the CSS gradient on the canvas stays
}
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPh: { value: new THREE.Color('#5cf') },
    uDim: { value: new THREE.Color('#163b5e') },
    uBg: { value: new THREE.Color('#040814') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform vec2 uMouse;
      varying vec3 vNormal, vView;
      varying float vHeight;

      float wave(vec2 p, float t) {
        return sin(p.x * 1.3 + t * 0.7) * 0.35
             + sin(p.x * 2.7 - p.y * 1.1 + t * 1.1) * 0.18
             + sin(p.y * 3.1 + p.x * 0.6 - t * 0.5) * 0.12
             + sin((p.x + p.y) * 5.0 + t * 1.7) * 0.04;
      }

      void main() {
        vec2 p = position.xy + uMouse * 0.4;
        float h = wave(p, uTime);
        float e = 0.02;
        vec3 dx = vec3(e, 0.0, wave(p + vec2(e, 0.0), uTime) - h);
        vec3 dy = vec3(0.0, e, wave(p + vec2(0.0, e), uTime) - h);
        vec3 n = normalize(cross(dx, dy));
        vec3 pos = vec3(position.xy, h);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vNormal = normalize(normalMatrix * n);
        vView = -mv.xyz;
        vHeight = h;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uPh, uDim, uBg;
      varying vec3 vNormal, vView;
      varying float vHeight;

      void main() {
        vec3 n = normalize(vNormal), v = normalize(vView);
        float fresnel = pow(1.0 - abs(dot(n, v)), 2.5);     // the sheen along the folds
        vec3 light = normalize(vec3(0.4, 0.8, 1.0));
        float diffuse = 0.35 + 0.65 * max(dot(n, light), 0.0);
        vec3 color = mix(uBg, uDim, diffuse);
        color = mix(color, uPh, fresnel * 0.9 + smoothstep(0.3, 0.7, vHeight) * 0.25);
        gl_FragColor = vec4(color, 0.95);
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 8, 256, 128), material);
  mesh.rotation.x = -0.9;   // seen from a low angle, like cloth on a table
  mesh.position.y = -1.2;
  scene.add(mesh);

  const target = new THREE.Vector2();
  if (!still && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => target.set(e.clientX / innerWidth - 0.5, 0.5 - e.clientY / innerHeight));
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function frame() {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uMouse.value.lerp(target, 0.05);
    renderer.render(scene, camera);
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !still) frame(); });
  frame();
}
