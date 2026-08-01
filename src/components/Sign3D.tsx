// 3D preview: the current design rendered onto an extruded acrylic slab with
// a stand, orbitable. three.js is dynamically imported so the designer stays
// fast for people who never open the 3D tab.
import { useEffect, useRef, useState } from 'react';
import { Design, SHAPE_CONFIGS, ShapeId, engraveMaterialFor, renderSign } from '../lib/render-core';

interface Props {
  design: Design;
  className?: string;
}

/**
 * Outline as sampled points in CANVAS coordinates (y-down), matching
 * buildShapePath exactly, then mirrored to y-up for THREE. Sampling arcs and
 * beziers as polylines means the 3D silhouette can never disagree with the
 * 2D canvas — the earlier hand-translated arcs got arch/pin upside down.
 */
function outlinePoints(shape: ShapeId, W: number, H: number): [number, number][] {
  const pts: [number, number][] = [];
  const add = (x: number, yv: number) => pts.push([x, yv]);
  // canvas-convention arc: 0 = +x, angles increase towards +y (down-screen)
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, seg = 48) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * (i / seg);
      add(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };
  const quad = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, seg = 10) => {
    for (let i = 1; i <= seg; i++) {
      const t = i / seg, u = 1 - t;
      add(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
    }
  };

  switch (shape) {
    case 'rounded': {
      const r = 40;
      add(r, 0); add(W - r, 0); quad(W - r, 0, W, 0, W, r);
      add(W, H - r); quad(W, H - r, W, H, W - r, H);
      add(r, H); quad(r, H, 0, H, 0, H - r);
      add(0, r); quad(0, r, 0, 0, r, 0);
      break;
    }
    case 'arch': {
      const r = W / 2;
      add(0, H); add(0, r);
      arc(W / 2, r, r, Math.PI, 2 * Math.PI); // dome over the top, as on canvas
      add(W, H);
      break;
    }
    case 'circle': {
      const r = Math.min(W, H) / 2;
      arc(W / 2, H / 2, r, 0, 2 * Math.PI, 72);
      break;
    }
    case 'speech': {
      const r = 40, tailH = 80, tailX = W * 0.28, tailW = 64, bodyH = H - tailH;
      add(r, 0); add(W - r, 0); quad(W - r, 0, W, 0, W, r);
      add(W, bodyH - r); quad(W, bodyH - r, W, bodyH, W - r, bodyH);
      add(tailX + tailW, bodyH); add(tailX + tailW / 2, H); add(tailX, bodyH);
      add(r, bodyH); quad(r, bodyH, 0, bodyH, 0, bodyH - r);
      add(0, r); quad(0, r, 0, 0, r, 0);
      break;
    }
    case 'pin': {
      const cx = W / 2, r = W * 0.45, cy = r;
      const tA = Math.asin(Math.min(0.999, r / (H - cy)));
      // canvas: arc from PI/2+tA sweeping through the top back to PI/2-tA
      arc(cx, cy, r, Math.PI / 2 + tA, Math.PI / 2 + tA + (2 * Math.PI - 2 * tA), 72);
      add(cx, H);
      break;
    }
    case 'house': {
      const rH = H * 0.35;
      add(0, rH); add(W / 2, 0); add(W, rH); add(W, H); add(0, H);
      break;
    }
    default:
      add(0, 0); add(W, 0); add(W, H); add(0, H);
  }
  return pts;
}

function buildThreeShape(THREE: typeof import('three'), shape: ShapeId, W: number, H: number) {
  const pts = outlinePoints(shape, W, H);
  const s = new THREE.Shape();
  // mirror canvas y-down to three y-up
  s.moveTo(pts[0][0], H - pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], H - pts[i][1]);
  s.closePath();
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
      // From straight-on down to horizontal only — never under the desk.
      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.target.set(0, -0.15, 0);
      st.controls = controls;

      // Lighting: bright ambient + a headlight rig parented to the camera so
      // whatever face you orbit to is always lit (no dim back side), plus a
      // fixed warm top light for depth.
      scene.add(new THREE.AmbientLight(0xffffff, 0.95));
      const headlight = new THREE.DirectionalLight(0xfff8ee, 1.9);
      headlight.position.set(0.6, 0.8, 0.2); // relative to camera
      camera.add(headlight);
      const fill = new THREE.PointLight(0xffffff, 0.5, 0, 2);
      fill.position.set(-0.9, 0.2, 0.4);
      camera.add(fill);
      scene.add(camera); // camera must be in the scene for child lights to render
      const top = new THREE.DirectionalLight(0xfff4e6, 0.8);
      top.position.set(0.5, 4, 1);
      scene.add(top);

      // reception desk: timber top slab + front fascia + soft back wall
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.09, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x9A6B43, roughness: 0.55, metalness: 0.05 }),
      );
      deskTop.position.set(0, -0.745, -0.2);
      scene.add(deskTop);
      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 1.1, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x7C5433, roughness: 0.7 }),
      );
      fascia.position.set(0, -1.34, 0.87);
      scene.add(fascia);
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 5),
        new THREE.MeshStandardMaterial({ color: 0xF2ECE1, roughness: 1 }),
      );
      wall.position.set(0, 0.8, -2.4);
      scene.add(wall);

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

    // Extrude assigns both caps to material 0, which mirrors the design onto
    // the back. Real 2-ply has cap only on the front: send back-cap triangles
    // (normal facing -z) to the plain core material instead.
    {
      const normals = geo.attributes.normal as import('three').BufferAttribute;
      const index = geo.index;
      const newGroups: { start: number; count: number; materialIndex: number }[] = [];
      for (const g of geo.groups) {
        if (g.materialIndex !== 0) { newGroups.push({ start: g.start, count: g.count, materialIndex: g.materialIndex ?? 1 }); continue; }
        // split cap group triangle-by-triangle on face direction
        let runStart = g.start, runMat = -1;
        const flush = (end: number) => {
          if (runMat >= 0 && end > runStart) newGroups.push({ start: runStart, count: end - runStart, materialIndex: runMat });
        };
        for (let i = g.start; i < g.start + g.count; i += 3) {
          const vi = index ? index.getX(i) : i;
          const mi = normals.getZ(vi) < 0 ? 1 : 0; // back cap → side/core material
          if (mi !== runMat) { flush(i); runStart = i; runMat = mi; }
        }
        flush(g.start + g.count);
      }
      geo.clearGroups();
      for (const g of newGroups) geo.addGroup(g.start, g.count, g.materialIndex);
    }

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
    stand.position.set(0, -0.69, -0.1);
    st.scene.add(stand);
  }, [design, ready]);

  return (
    <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', minHeight: 320 }}>
      {!ready && <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>Loading 3D preview…</div>}
    </div>
  );
}
