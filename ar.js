
      import * as THREE from './libs/three/three.module.js';
      import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js'
      import ZingTouch from './zingtouch/ZingTouch.js'

      let renderer = null;
      let scene = null;
      let camera = null;
      let model = null;
      let mixer = null;
      let action = null;
      let reticle = null;
      let lastFrame = Date.now();

      const initScene = (gl, session) => {

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        var loader = new GLTFLoader();
        loader.load(
          './models/wheel.glb',
          (gltf) => {
            model = gltf.scene;
            model.scale.set(0.1, 0.1, 0.1);
            model.castShadow = true;
            model.receiveShadow = true;
            // mixer = new THREE.AnimationMixer(model);
            // action = mixer.clipAction(gltf.animations[ 0 ]);
            // action.setLoop(THREE.LoopRepeat, 0);
          },
          () => {},
          (error) => console.error(error)
        );

        var light = new THREE.PointLight(0xffffff, 2, 100); 
        light.position.z = 1;
        light.position.y = 5;
        scene.add(light);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          autoClear: true,
          context: gl,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        renderer.xr.setSession(session);

        reticle = new THREE.Mesh(
          new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
          new THREE.MeshPhongMaterial({ color: 0x0fffff })
       );
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        console.log('msg: SCENE_INIT COMPLETE')
     

        
      };

      const xrButton = document.getElementById('arbutton');
      const msg = document.getElementById('msg');
      let xrSession = null;
      let xrRefSpace = null;
      let xrHitTestSource = null;

      let gl = null;

       
      let container = null;
      let region = null;
      let target = null;

      container = document.getElementById('overlay')
      region = ZingTouch.Region(container,true,false);
      target = document.getElementById('touchArea');
      
      let longTap = new ZingTouch.Tap({
      maxDelay: 1000
      })

      region.bind(target, longTap, function(e){
      console.log('tap');
      place_object();
      })

      function has_webxr() {
        if (!window.isSecureContext) {
          document.getElementById("warning").innerText = "WebXR unavailable. Please use secure context";
        }
        if (navigator.xr) {
          navigator.xr.addEventListener('devicechange', has_supported_state);
          has_supported_state();
        } else {
          document.getElementById("warning").innerText = "WebXR unavailable for this browser"; 
        }
      }

      function has_supported_state() {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
          if (supported) {
            xrButton.innerHTML = 'Enter AR';
            xrButton.addEventListener('click', onButtonClicked);
          } else {
            xrButton.innerHTML = 'AR not found';
          }
          xrButton.disabled = !supported;
        });
      }

      function onButtonClicked() {
        if (!xrSession) {
            navigator.xr.requestSession('immersive-ar', {
                optionalFeatures: ['dom-overlay'],
                requiredFeatures: ['local', 'hit-test'],
                domOverlay: {root: document.getElementById('overlay')}
            }).then(onSessionStarted, onRequestSessionError);
        } else {
          xrSession.end();
        }
      }

      region.bind(target,new ZingTouch.Distance(),function(e)
      {
          console.log("Distance")
          if (e.detail.change >= 0)
          {
              window.initial_Scale = new THREE.Vector3(
                  window.initial_Scale.x * 1.01,
                  window.initial_Scale.y * 1.01,
                  window.initial_Scale.z * 1.01
              )

              if (model.visible == true)
              {
                  model.scale.set(
                    window.initial_Scale.x,
                    window.initial_Scale.y,
                    window.initial_Scale.z 
                  )
              }
          }

          else
          {
            window.initial_Scale = new THREE.Vector3(
                window.initial_Scale.x / 1.01,
                window.initial_Scale.y / 1.01,
                window.initial_Scale.z / 1.01
            )

            if (model.visible == true)
            {
                model.scale.set(
                  window.initial_Scale.x,
                  window.initial_Scale.y,
                  window.initial_Scale.z 
                )
            }
        }

      })

      function onSessionStarted(session) {
        xrSession = session;
        xrButton.innerHTML = 'Exit AR';

        // if (session.domOverlayState) {
        //   msg.innerHTML = 'DOM Overlay type: ' + session.domOverlayState.type;
        // }

        session.addEventListener('end', onSessionEnded);
        let canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl', { xrCompatible: true });
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

 
        session.requestReferenceSpace('viewer').then((refSpace) => {
          session.requestHitTestSource({ space: refSpace }).then((hitTestSource) => {
            xrHitTestSource = hitTestSource;
          });
        });

        session.requestReferenceSpace('local').then((refSpace) => {
          xrRefSpace = refSpace;
          session.requestAnimationFrame(on_frame);
        });


        initScene(gl, session);

      }

      function onRequestSessionError(ex) {
        msg.innerHTML = "Failed to start AR session.";
        console.error(ex.message);
      }

      function onSessionEnded(event) {
        xrSession = null;
        xrButton.innerHTML = 'Enter AR';
        msg.innerHTML = '';
        gl = null;
        if (xrHitTestSource) xrHitTestSource.cancel();
        xrHitTestSource = null;
      }

      region.bind(target,new ZingTouch.Rotate(),function(e)
      {
        // model.quaternion.copy( window.initial_angle );
        model.rotateY( e.detail.distanceFromLast);
      })

      region.bind(target,new ZingTouch.Swipe({numInputs:2}),function(e)
      {
        // {
        //   xrSession.requestHitTestSource({ space: xrRefSpace }).then((hitTestSource) => {
        //     xrHitTestSource = hitTestSource;
        //   });
          scene.remove(model);
        reticle.visible = true;
        scene.add(reticle);
        region.bind(target, longTap, function(e){
      console.log('tap');
      place_object();
      })

        }
      )

      function place_object() {
        if (reticle.visible && model) {
          console.log('tap')
          reticle.visible = false;
        
          const pos = reticle.getWorldPosition();
          scene.remove(reticle);
          model.position.set(pos.x, pos.y, pos.z);
          scene.add(model);


          window.initial_Scale = model.scale.clone();
          window.initial_angle = model.quaternion.clone();
          region.unregister('tap');
          
          
        }
      }

  

      function toggleAnimation() {
        if (action.isRunning()) {
            action.stop();
            action.reset();
          } else {
            action.play();
          }
      }

      function updateAnimation() {
        let dt = (Date.now() - lastFrame) / 1000;
        lastFrame = Date.now();
        if (mixer) {
          mixer.update(dt);
        }  
      }

      function on_frame(t, frame) {
        let session = frame.session;
        session.requestAnimationFrame(on_frame);

        if (xrHitTestSource) {
 
          const hitTestResults = frame.getHitTestResults(xrHitTestSource);
          if (hitTestResults.length) {
            const pose = hitTestResults[0].getPose(xrRefSpace);
            reticle.matrix.fromArray(pose.transform.matrix);
            reticle.visible = true;
          }
        } else { 
          reticle.visible = false;
        }

       
        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
        renderer.render(scene, camera);
      }

      has_webxr();

      
     

    //   region.bind(target,new ZingTouch.Pinch(),function(e)
    //   {
    //     console.log("Pinch")
    //     if (model.visible == true)
    //     {
    //         window.initial_Scale = new THREE.Vector3(
    //             window.initial_Scale.x/1.1,
    //             window.initial_Scale.y/1.1,
    //             window.initial_Scale.z/1.1
    //         )
    //         model.scale.set(
    //             window.initial_Scale.x,
    //             window.initial_Scale.y,
    //             window.initial_Scale.z
    //         );
    //     }
    //   })

    //   region.bind(target,new ZingTouch.Expand(),function(e)
    //   {
    //     console.log("Expand")
    //     if (model.visible == true)
    //     {
    //         window.initial_Scale = new THREE.Vector3(
    //             window.initial_Scale.x*1.1,
    //             window.initial_Scale.y*1.1,
    //             window.initial_Scale.z*1.1
    //         )
    //         model.scale.set(
    //             window.initial_Scale.x,
    //             window.initial_Scale.y,
    //             window.initial_Scale.z
    //         );
    //     }
    //   })

     
      
      
     

    
