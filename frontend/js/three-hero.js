// Three.js 3D Animated Hero Particle System
// The Secret Garden by Phat Kath

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  // 1. Scene, Camera & Renderer Setup
  const scene = new THREE.Scene();
  
  // Create subtle green fog for depth
  scene.fog = new THREE.FogExp2(0x0d1f17, 0.015);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 2. Create Floating Particles
  const particleCountGreen = 1200;
  const particleCountGold = 400;

  // Geometry
  const greenGeometry = new THREE.BufferGeometry();
  const goldGeometry = new THREE.BufferGeometry();

  const greenPositions = new Float32Array(particleCountGreen * 3);
  const goldPositions = new Float32Array(particleCountGold * 3);

  // Distribute particles in a 3D box volume
  for (let i = 0; i < particleCountGreen * 3; i += 3) {
    greenPositions[i] = (Math.random() - 0.5) * 16;     // X
    greenPositions[i + 1] = (Math.random() - 0.5) * 16; // Y
    greenPositions[i + 2] = (Math.random() - 0.5) * 16; // Z
  }

  for (let i = 0; i < particleCountGold * 3; i += 3) {
    goldPositions[i] = (Math.random() - 0.5) * 16;
    goldPositions[i + 1] = (Math.random() - 0.5) * 16;
    goldPositions[i + 2] = (Math.random() - 0.5) * 16;
  }

  greenGeometry.setAttribute('position', new THREE.BufferAttribute(greenPositions, 3));
  goldGeometry.setAttribute('position', new THREE.BufferAttribute(goldPositions, 3));

  // Generate glowing circle textures programmatically to avoid external asset loading failure
  function createParticleTexture(colorStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, colorStr);
    gradient.addColorStop(0.3, colorStr);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    
    return new THREE.CanvasTexture(canvas);
  }

  const greenTexture = createParticleTexture('rgba(46, 125, 50, 1)'); // Vibrant Green
  const goldTexture = createParticleTexture('rgba(201, 168, 76, 1)');  // Rich Gold

  // Materials
  const greenMaterial = new THREE.PointsMaterial({
    size: 0.12,
    map: greenTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.6
  });

  const goldMaterial = new THREE.PointsMaterial({
    size: 0.18,
    map: goldTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.8
  });

  // Points objects
  const greenParticles = new THREE.Points(greenGeometry, greenMaterial);
  const goldParticles = new THREE.Points(goldGeometry, goldMaterial);

  scene.add(greenParticles);
  scene.add(goldParticles);

  // 3. Ambient lighting
  const ambientLight = new THREE.AmbientLight(0x1a3a2a, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xc9a84c, 1, 20);
  pointLight.position.set(0, 0, 4);
  scene.add(pointLight);

  // 4. Mouse Interactive Parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', (event) => {
    // Normalize coordinates (-1 to +1)
    mouseX = (event.clientX / window.innerWidth) - 0.5;
    mouseY = (event.clientY / window.innerHeight) - 0.5;
  });

  // 5. Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Rotate particle systems slowly over time
    greenParticles.rotation.y = elapsedTime * 0.03;
    greenParticles.rotation.x = elapsedTime * 0.01;

    goldParticles.rotation.y = -elapsedTime * 0.04;
    goldParticles.rotation.x = elapsedTime * 0.015;

    // Simulate vertical drifting (float up effect like pollen/fireflies)
    const greenArr = greenGeometry.attributes.position.array;
    for (let i = 1; i < greenArr.length; i += 3) {
      greenArr[i] += 0.005; // Y drift
      if (greenArr[i] > 8) {
        greenArr[i] = -8; // wrap around
      }
    }
    greenGeometry.attributes.position.needsUpdate = true;

    const goldArr = goldGeometry.attributes.position.array;
    for (let i = 1; i < goldArr.length; i += 3) {
      goldArr[i] += 0.007; // Y drift
      if (goldArr[i] > 8) {
        goldArr[i] = -8; // wrap around
      }
    }
    goldGeometry.attributes.position.needsUpdate = true;

    // Apply interactive mouse tracking
    targetX = mouseX * 2.5;
    targetY = mouseY * 2.5;

    // Smooth camera lag/interpolation (LERP)
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (-targetY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  // 6. Handle Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // Start Animation
  animate();
});
