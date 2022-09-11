const video = document.getElementById("video");
const canvas = document.getElementById("output");
const faceCanvas = document.getElementById("face");
const canvasImage = document.getElementById("crop");
const overlay = document.getElementById( "overlay" );
let click_button = document.getElementById("click-photo");
let click_button_big = document.getElementById("click-photo-big");
let photo = document.getElementById("photo");

const scale = 0.5;

let ctx, ctxCrop;
let videoWidth, videoHeight;
let scene, camera;

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 720 },
      height: { ideal: 480 }
    }
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      video.width = videoWidth;
      video.height = videoHeight;
      resolve(video);
    };
  });
}

function drawLine( ctx, x1, y1, x2, y2 ) {
  ctx.beginPath();
  ctx.moveTo( x1, y1 );
  ctx.lineTo( x2, y2 );
  ctx.stroke();
}

function drawGlasses(landmarks) {

  const noseBottom = landmarks[2];
  const glassesPosition = landmarks[6];
  const leftEyeUpper1 = landmarks[130];
  const rightEyeUpper1 = landmarks[359];
  glasses.position.x = glassesPosition.x ;
  glasses.position.y = -glassesPosition.y * 1.1 ;
  glasses.position.z = -camera.position.z + glassesPosition.z ;

  // Calculate an Up-Vector using the eyes position and the bottom of the nose
  glasses.up.x = glassesPosition.x  - noseBottom.x;
  glasses.up.y = -( glassesPosition.y  - noseBottom.y);
  glasses.up.z = glassesPosition.z  - noseBottom.z;
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


  glasses.scale.x = eyeDist / 2;
  glasses.scale.y = eyeDist / 2;
  glasses.scale.z = eyeDist / 2;
  glasses.rotation.y = Math.PI;
  glasses.rotation.z = Math.PI / 2 - Math.acos( glasses.up.x );
}

function removeGlasses(){
  glasses.position.x = 0;
  glasses.position.y = 0;
  glasses.position.z = 0;
}

function drawMesh(landmarks) {
    const keypoints = landmarks;
    for (let i = 0; i < TRIANGLES.length; i += 1) {
      const point1 = keypoints[TRIANGLES[i][0]];
      const point2 = keypoints[TRIANGLES[i][1]];
      const point3 = keypoints[TRIANGLES[i][2]];
        ctx.beginPath();
        ctx.moveTo(point1.x , point1.y );
        ctx.lineTo(point2.x , point2.y );
        ctx.lineTo(point3.x , point3.y );
        ctx.lineTo(point1.x , point1.y );
        ctx.strokeStyle = `rgba(0, 0, 0, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();

    }
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

async function setupCanvas() {
  canvas.width = videoWidth ;
  canvas.height = videoHeight ;
  ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  canvasImage.width = videoWidth;
  canvasImage.height = videoHeight;
  ctxCrop = canvasImage.getContext('2d');
  ctxCrop.translate(canvasImage.width, 0);
  ctxCrop.scale(-1, 1);
  faceCanvas.width = videoWidth;
  faceCanvas.height = videoHeight;
  ctxFace = faceCanvas.getContext('2d');
  ctxFace.translate(faceCanvas.width, 0);
  ctxFace.scale(-1, 1);
}

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

async function loadFaceLandmarkDetectionModel() {
  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detectorConfig = {
    runtime: 'tfjs',
  };
  return faceLandmarksDetection.createDetector(model, detectorConfig);
}


async function renderPrediction() {
  const estimationConfig = {flipHorizontal: false};
  const predictions = await model.estimateFaces(video, estimationConfig);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctxCrop.fillStyle = "white";
  ctxCrop.fillRect( 0, 0, canvasImage.width, canvasImage.height );

    ctx.drawImage(
      video,
       0, 0, video.width, video.height,
       0, 0, canvas.width, canvas.height
       );
  renderer.render( scene, camera );


  if (predictions.length > 0) {
    predictions.forEach(face => {

      const x1 = face.box.xMax;
      const y1 = face.box.yMax;
      const x2 = face.box.xMin;
      const y2 = face.box.yMin;
      const bWidth = -face.box.width;
      const bHeight = -face.box.height;

      if (document.getElementById('show-face-croped').checked) {
        ctxCrop.drawImage(video, x1, y1, bWidth, bHeight, canvasImage.width/2, 0, canvasImage.width/3, canvasImage.height/2 );
      }
      if (document.getElementById('show-bounding-box').checked) {
        drawLine( ctx, x1, y1, x2, y1 );
        drawLine( ctx, x2, y1, x2, y2 );
        drawLine( ctx, x1, y2, x2, y2 );
        drawLine( ctx, x1, y1, x1, y2 );
      }
      if (document.getElementById('show-glasses').checked) {
        drawGlasses(face.keypoints);
      } else {
        removeGlasses();
      }

      if(document.getElementById('show-mesh').checked) {
        drawMesh(face.keypoints);
      }
    });
  }

  window.requestAnimationFrame(renderPrediction);
}


async function setupScene() {

  overlay.width = video.width ;
  overlay.height = video.height ;

    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById( "overlay" ),
      alpha: true
  });

  camera = new THREE.PerspectiveCamera( 45, 1, 0.1, 2000 );
  camera.position.x = videoWidth  / 2;
  camera.position.y = -videoHeight  / 2;
  camera.position.z = -( videoHeight  / 2 ) / Math.tan( 45 / 2 ); // distance to z should be tan( fov / 2 )

  scene = new THREE.Scene();
  scene.add( new THREE.AmbientLight( 0xcccccc, 0.4 ) );
  camera.add( new THREE.PointLight( 0xffffff, 0.8 ) );
  scene.add( camera );

  camera.lookAt( { x: videoWidth  / 2, y: -videoHeight  / 2, z: 0, isVector3: true } );
  glasses = await loadModel('3d/scene.gltf');
  scene.add( glasses );
}

function takepicture() {
    const data = canvasImage.toDataURL('image/jpg', 1.0);
    photo.setAttribute('width', canvasImage.width )
    photo.setAttribute('height', canvasImage.height )
    photo.setAttribute('src', data);

}

async function takepictureBig() {
  const estimationConfig = {flipHorizontal: false};
  const predictions = await model.estimateFaces(video, estimationConfig);
  ctxFace.fillStyle = "white";
  ctxFace.fillRect( 0, 0, faceCanvas.width, faceCanvas.height );
  let bWidth, bHeight = 0;
  predictions.forEach(face => {

    const x1 = face.box.xMax;
    const y1 = face.box.yMax;
    bWidth = -face.box.width ;
    bHeight = -face.box.height;
    ctxFace.drawImage(video, x1, y1, bWidth, bHeight, 200, 0, faceCanvas.width/4 , faceCanvas.height/3 );
  });
  const data2 = faceCanvas.toDataURL('image/jpg', 1.0);
  photo.setAttribute('src', data2);

}


async function main() {
  await setupCamera();
  await setupCanvas();
  await setupScene();
  model = await loadFaceLandmarkDetectionModel();
  click_button.addEventListener('click', takepicture);
  click_button_big.addEventListener('click', takepictureBig);

  renderPrediction();
}

main();
