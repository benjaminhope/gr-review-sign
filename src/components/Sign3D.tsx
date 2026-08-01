// 3D preview: the current design rendered onto an extruded acrylic slab with
// a stand, orbitable. three.js is dynamically imported so the designer stays
// fast for people who never open the 3D tab.
import { useEffect, useRef, useState } from 'react';
import { Design, SHAPE_CONFIGS, ShapeId, engraveMaterialFor, renderSign } from '../lib/render-core';

interface Props {
  design: Design;
  className?: string;
}

/** Same outlines as buildShapePath, expressed as a THREE.Shape (y flipped up). */
function buildThreeShape(THREE: typeof import('three'), shape: ShapeId, W: number, H: number) {
  const s = new THREE.Shape();
  const y = (v: number) => H - v; // canvas y-down → three y-up
  switch (shape) {
    case 'rounded': {
      const r = 40;
      s.moveTo(r, y(0)); s.lineTo(W - r, y(0)); s.quadraticCurveTo(W, y(0), W, y(r));
      s.lineTo(W, y(H - r)); s.quadraticCurveTo(W, y(H), W - r, y(H));
      s.lineTo(r, y(H)); s.quadraticCurveTo(0, y(H), 0, y(H - r));
      s.lineTo(0, y(r)); s.quadraticCurveTo(0, y(0), r, y(0));
      break;
    }
    case 'arch': {
      const r = W / 2;
      s.moveTo(0, y(H)); s.lineTo(0, y(r));
      s.absarc(W / 2, y(r), r, Math.PI, 0, false);
      s.lineTo(W, y(H));
      break;
    }
    case 'circle': {
      const r = Math.min(W, H) / 2;
      s.absarc(W / 2, y(H / 2), r, 0, Math.PI * 2, false);
      break;
    }
    case 'speech': {
      const r = 40, tailH = 80, tailX = W * 0.28, tailW = 64, bodyH = H - tailH;
      s.moveTo(r, y(0)); s.lineTo(W - r, y(0)); s.quadraticCurveTo(W, y(0), W, y(r));
      s.lineTo(W, y(bodyH - r)); s.quadraticCurveTo(W, y(bodyH), W - r, y(bodyH));
      s.lineTo(tailX + tailW, y(bodyH)); s.lineTo(tailX + tailW / 2, y(H)); s.lineTo(tailX, y(bodyH));
      s.lineTo(r, y(bodyH)); s.quadraticCurveTo(0, y(bodyH), 0, y(bodyH - r));
      s.lineTo(0, y(r)); s.quadraticCurveTo(0, y(0), r, y(0));
      break;
    }
    case 'pin': {
      const cx = W / 2, r = W * 0.45, cy = r;
      const tA = Math.asin(Math.min(0.999, r / (H - cy)));
      // three arcs run counter-clockwise in y-up space; mirror the canvas angles
      const sA = -(Math.PI / 2 + tA), eA = -(Math.PI / 2 - tA);
      s.moveTo(cx + r * Math.cos(sA), y(cy) + r * -Math.sin(-sA));
      s.absarc(cx, y(cy), r, sA, eA, true);
      s.lineTo(cx, y(H));
      break;
    }
    case 'house': {
      const rH = H * 0.35;
      s.moveTo(0, y(rH)); s.lineTo(W / 2, y(0)); s.lineTo(W, y(rH));
      s.lineTo(W, y(H)); s.lineTo(0, y(H)); s.lineTo(0, y(rH));
      break;
    }
    default: { // portrait / landscape
      s.moveTo(0, y(0)); s.lineTo(W, y(0)); s.lineTo(W, y(H)); s.lineTo(0, y(H)); s.lineTo(0, y(0));
    }
  }
  return s;
}

export default function Sign3D({ design, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const stateRef = useRef<{
    three?: typeof import('three');
    renderer?: import('three').WebGLRenderer;
    scene?: import('three').Scene;
    camera?: import('three').PerspectiveCamera;
    controls?: any;
    mesh?: import('three').Mesh;
    texCanvas?: HTMLCanvasElement;
    texture?: import('three').CanvasTexture;
    frame?: number;
  }>({});

  // one-time scene setup
  useEffect(() => {
    let disposed = false;
    (async () => {
      const [THREE, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]);
      if (disposed || !mountRef.current) return;
      const st = stateRef.current;
      st.three = THREE;

      const mount = mountRef.current;
      const w = mount.clientWidth || 480, h = mount.clientHeight || 480;

      // preserveDrawingBuffer lets users (and tests) capture the 3D view
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      mount.appendChild(renderer.domElement);
      st.renderer = renderer;

      const scene = new THREE.Scene();
      st.scene = scene;

      const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      camera.position.set(0.35, 0.55, 2.6);
      st.camera = camera;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 1.4;
      controls.maxDistance = 4.5;
      controls.maxPolarAngle = Math.PI * 0.65;
      st.controls = controls;

      // studio-ish lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
      key.position.set(2, 3, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xdfeaff, 0.7);
      rim.position.set(-3, 1, -2);
      scene.add(rim);

      // benchtop
      const bench = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, 0.04, 48),
        new THREE.MeshStandardMaterial({ color: 0xEFE9DC, roughness: 0.9 }),
      );
      bench.position.y = -0.72;
      scene.add(bench);

      const animate = () => {
        st.frame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const nw = mount.clientWidth, nh = mount.clientHeight;
        if (!nw || !nh) return;
        camera.aspect = nw / nh; camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      setReady(true);

      return () => ro.disconnect();
    })();
    return () => {
      disposed = true;
      const st = stateRef.current;
      if (st.frame) cancelAnimationFrame(st.frame);
      st.controls?.dispose?.();
      st.renderer?.dispose();
      if (st.renderer?.domElement?.parentElement) {
        st.renderer.domElement.parentElement.removeChild(st.renderer.domElement);
      }
      stateRef.current = {};
    };
  }, []);

  // rebuild the sign mesh whenever the design changes
  useEffect(() => {
    const st = stateRef.current;
    const THREE = st.three;
    if (!ready || !THREE || !st.scene) return;

    const cfg = SHAPE_CONFIGS[design.shape];
    const { W, H } = cfg;

    // face texture = the live 2D render (no selection ring, no watermark)
    if (!st.texCanvas) st.texCanvas = document.createElement('canvas');
    renderSign(st.texCanvas, design, { scale: 2 });
    if (st.texture) st.texture.dispose();
    const texture = new THREE.CanvasTexture(st.texCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = st.renderer!.capabilities.getMaxAnisotropy();
    st.texture = texture;

    // geometry: extruded slab, ~4.5mm scale thickness
    const shape = buildThreeShape(THREE, design.shape, W, H);
    const depth = 18;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2 });

    // UVs from extrude are in shape-space; normalise to 0..1 for the face
    const uv = geo.attributes.uv as import('three').BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) / W, uv.getY(i) / H);
    }
    uv.needsUpdate = true;

    const mat = engraveMaterialFor(design);
    const sideColor = mat ? mat.core : '#1A1A1A';
    const faceMat = new THREE.MeshStandardMaterial({
      map: texture, roughness: mat?.brushed ? 0.35 : 0.25, metalness: mat?.brushed ? 0.55 : 0.05,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sideColor), roughness: 0.4, metalness: 0.1,
    });

    if (st.mesh) {
      st.scene.remove(st.mesh);
      st.mesh.geometry.dispose();
      (Array.isArray(st.mesh.material) ? st.mesh.material : [st.mesh.material]).forEach((m) => m.dispose());
    }
    const mesh = new THREE.Mesh(geo, [faceMat, sideMat]);

    // scale + centre: longest edge ≈ 1.3 world units, stand on the bench
    const scale = 1.3 / Math.max(W, H);
    mesh.scale.setScalar(scale);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    mesh.position.set(
      -(bb.min.x + bb.max.x) / 2 * scale,
      -0.7 - bb.min.y * scale,
      -(bb.min.z + bb.max.z) / 2 * scale,
    );
    // lean back on the stand slightly
    mesh.rotation.x = -0.09;
    st.scene.add(mesh);
    st.mesh = mesh;

    // simple acrylic stand wedge behind
    const standName = '__stand';
    const old = st.scene.getObjectByName(standName);
    if (old) st.scene.remove(old);
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.02, 0.42),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1 }),
    );
    stand.name = standName;
    stand.position.set(0, -0.7, -0.1);
    st.scene.add(stand);
  }, [design, ready]);

  return (
    <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', minHeight: 320 }}>
      {!ready && <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>Loading 3D preview…</div>}
    </div>
  );
}
