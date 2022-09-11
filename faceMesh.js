const video2 = document.getElementsByClassName('input_video2')[0];
const out2 = document.getElementsByClassName('output2')[0];
const overlay = document.getElementById('overlay');
const controlsElement2 = document.getElementsByClassName('control2')[0];
const canvasCtx = out2.getContext('2d');

const fpsControl = new FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

async function loadModel( file ) {
  return new Promise( ( res, rej ) => {
      const loader = new THREE.GLTFLoader();
      loader.load( file, function ( gltf ) {
          res( gltf.scene );
      }, undefined, function ( error ) {
          rej( error );
      } );
  });
}

async function setupScene() {

    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById( "overlay" ),
      alpha: true
  });

  cameraOverlay = new THREE.PerspectiveCamera( 45, 1, 0.1, 2000 );
  cameraOverlay.position.x = overlay.width  / 2;
  cameraOverlay.position.y = -overlay.height / 2;
  cameraOverlay.position.z = -( overlay.height  / 2 ) / Math.tan( 45 / 2 ); // distance to z should be tan( fov / 2 )

  scene = new THREE.Scene();
  scene.add( new THREE.AmbientLight( 0xcccccc, 0.4 ) );
  cameraOverlay.add( new THREE.PointLight( 0xffffff, 0.8 ) );
  scene.add( cameraOverlay );

  cameraOverlay.lookAt( { x: overlay.width   / 2, y: -overlay.height  / 2, z: 0, isVector3: true } );
  glasses = await loadModel('3d/scene.gltf');
  scene.add( glasses );
}



function drawLine( ctx, x1, y1, x2, y2 ) {
  ctx.beginPath();
  ctx.moveTo( x1, y1 );
  ctx.lineTo( x2, y2 );
  ctx.stroke();
}

function drawGlasses(landmarks, height, width) {

  const midwayBetweenEyes = landmarks[168];
  const noseBottom = landmarks[2];
  const leftEyeUpper1 = landmarks[130];
  const rightEyeUpper1 = landmarks[359];
  glasses.position.x = midwayBetweenEyes.x * width ;
  glasses.position.y = -midwayBetweenEyes.y * height ;
  glasses.position.z = -cameraOverlay.position.z + midwayBetweenEyes.z ;

  // Calculate an Up-Vector using the eyes position and the bottom of the nose
  glasses.up.x = (midwayBetweenEyes.x  - noseBottom.x) * width;
  glasses.up.y = -( midwayBetweenEyes.y  - noseBottom.y) * height;
  glasses.up.z = (midwayBetweenEyes.z  - noseBottom.z) * cameraOverlay.position.z * Math.tan( 45 / 2 );
  const length = Math.sqrt( glasses.up.x ** 2 + glasses.up.y ** 2 + glasses.up.z ** 2 );
  glasses.up.x /= length;
  glasses.up.y /= length;
  glasses.up.z /= length;


  // Scale to the size of the head
  const eyeDist = Math.sqrt(
      ( leftEyeUpper1.x - rightEyeUpper1.x ) ** 2 +
      ( leftEyeUpper1.y - rightEyeUpper1.y ) ** 2 +
      (leftEyeUpper1.z - rightEyeUpper1.z ) ** 2
  );


  glasses.scale.x = eyeDist * width / 3;
  glasses.scale.y = eyeDist * height/ 3;
  glasses.scale.z = eyeDist * cameraOverlay.position.z / 3;

  glasses.rotation.y = Math.PI;
  glasses.rotation.z = Math.PI / 2 - Math.acos( glasses.up.x );
}


function drawGlassesAnotations(face) {
  glasses2.position.x = face.annotations.midwayBetweenEyes[ 0 ][ 0 ];
  glasses2.position.y = -face.annotations.midwayBetweenEyes[ 0 ][ 1 ];
  glasses2.position.z = -camera.position.z + face.annotations.midwayBetweenEyes[ 0 ][ 2 ];

  // Calculate an Up-Vector using the eyes position and the bottom of the nose
  glasses2.up.x = face.annotations.midwayBetweenEyes[ 0 ][ 0 ] - face.annotations.noseBottom[ 0 ][ 0 ];
  glasses2.up.y = -( face.annotations.midwayBetweenEyes[ 0 ][ 1 ] - face.annotations.noseBottom[ 0 ][ 1 ] );
  glasses2.up.z = face.annotations.midwayBetweenEyes[ 0 ][ 2 ] - face.annotations.noseBottom[ 0 ][ 2 ];
  const length = Math.sqrt( glasses2.up.x ** 2 + glasses2.up.y ** 2 + glasses2.up.z ** 2 );
  glasses2.up.x /= length;
  glasses2.up.y /= length;
  glasses2.up.z /= length;

  // Scale to the size of the head
  const eyeDist = Math.sqrt(
      ( face.annotations.leftEyeUpper1[ 3 ][ 0 ] - face.annotations.rightEyeUpper1[ 3 ][ 0 ] ) ** 2 +
      ( face.annotations.leftEyeUpper1[ 3 ][ 1 ] - face.annotations.rightEyeUpper1[ 3 ][ 1 ] ) ** 2 +
      ( face.annotations.leftEyeUpper1[ 3 ][ 2 ] - face.annotations.rightEyeUpper1[ 3 ][ 2 ] ) ** 2
  );
  glasses2.scale.x = eyeDist / 6;
  glasses2.scale.y = eyeDist / 6;
  glasses2.scale.z = eyeDist / 6;

  glasses2.rotation.y = Math.PI;
  glasses2.rotation.z = Math.PI / 2 - Math.acos( glasses2.up.x );
}
function onResultsFaceMesh(results) {
  document.body.classList.add('loaded');

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, out2.width, out2.height);
  canvasCtx.drawImage(
      results.image, 0, 0, out2.width, out2.height);
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      if (document.getElementById('show-eyes').checked) {

        drawConnectors(
            canvasCtx, landmarks, FACEMESH_RIGHT_EYE,
            {color: '#FF3030'});

        drawConnectors(
            canvasCtx, landmarks, FACEMESH_LEFT_EYE,
            {color: '#30FF30'});
      }
      if (document.getElementById('show-points').checked) {
        drawLandmarks(
          canvasCtx, landmarks, {color: '#30FF30', lineWidth: 1, radius: 1});
      }
      if (document.getElementById('show-eyebrows').checked) {
        drawConnectors(
            canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW,
            {color: '#30FF30'});
        drawConnectors(
          canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW,
          {color: '#FF3030'});
      }
      if (document.getElementById('show-face-oval').checked) {

        drawConnectors(
            canvasCtx, landmarks, FACEMESH_FACE_OVAL,
            {color: '#E0E0E0'});
      }
      if (document.getElementById('show-lips').checked) {

        drawConnectors(
            canvasCtx, landmarks, FACEMESH_LIPS,
            {color: '#E0E0E0'});
      }
      drawGlasses(landmarks,results.image.height, results.image.width)
    }

  }
  canvasCtx.restore();
}

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
}});


const camera = new Camera(video2, {
  onFrame: async () => {
    await faceMesh.send({image: video2});
  },
  width: 480,
  height: 480
});


async function main(){
  camera.start();
  await setupScene();
  faceMesh.setOptions({
    enableFaceGeometry: true,
    refineLandmarks: false,
    maxNumFaces: 1
  });
  faceMesh.onResults(onResultsFaceMesh);
}

main();