import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const palette = ['#4df5ff', '#ff459d', '#ffd864'];
export default function Loom({ paused, cameraMode, intensity, onReady }) {
  const host = useRef(null), settings = useRef({ paused, cameraMode, intensity });
  settings.current = { paused, cameraMode, intensity };
  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' }); }
    catch { onReady(false); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
    const group = new THREE.Group(); scene.add(group);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 1.05, .7, .32); composer.addPass(bloom);
    let seed = 41;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const curves = [];
    for (let lane=0; lane<3; lane++) {
      const color = new THREE.Color(palette[lane]);
      for(let j=0;j<90;j++) {
        const endY = (rand()-.5)*13, endZ = (rand()-.5)*5;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-10, 4-lane*4+(rand()-.5)*.35, (rand()-.5)*.4),
          new THREE.Vector3(-5.6,4-lane*4,0),
          new THREE.Vector3(-1.2,endY*.75,endZ*.5),
          new THREE.Vector3(1.2,endY,endZ),
          new THREE.Vector3(7.6,endY,endZ)
        ]);
        curves.push({ curve, lane, offset: rand(), speed: .1+rand()*.12 });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({color,transparent:true,opacity:.025+rand()*.04,blending:THREE.AdditiveBlending,depthWrite:false}));
        group.add(line);
      }
    }
    const dotVertex=`attribute vec3 color; varying vec3 vColor; uniform float pixelRatio; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(95.0/-mv.z,1.,12.)*pixelRatio;gl_Position=projectionMatrix*mv;}`;
    const dotFragment=`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*21.);gl_FragColor=vec4(vColor*1.2,a);}`;
    const count=1620, pos=new Float32Array(count*3), cols=new Float32Array(count*3);
    for(let i=0;i<count;i++) new THREE.Color(palette[curves[i%curves.length].lane]).toArray(cols,i*3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(cols,3));
    const pm = new THREE.ShaderMaterial({vertexShader:dotVertex,fragmentShader:dotFragment,uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});group.add(new THREE.Points(pg,pm));
    // Binary glyph atlas: the matrix is a live 3D point field, not a screenshot.
    const atlas=document.createElement('canvas');atlas.width=128;atlas.height=64;const ctx=atlas.getContext('2d');ctx.font='54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('0',32,34);ctx.fillText('1',96,34);
    const texture=new THREE.CanvasTexture(atlas);
    const n=3500, mp=new Float32Array(n*3), mc=new Float32Array(n*3), glyph=new Float32Array(n), phase=new Float32Array(n);
    for(let i=0;i<n;i++){
      const col=i%50,row=Math.floor(i/50);
      mp[i*3]=1.4+col*.17;mp[i*3+1]=(row-35)*.2;mp[i*3+2]=(rand()-.5)*3.3;
      const c=new THREE.Color(palette[rand()<.7?0:rand()<.5?1:2]); c.lerp(new THREE.Color('#7982ff'),rand()*.9); c.multiplyScalar(.24+rand()*.42);c.toArray(mc,i*3);
      glyph[i]=rand()>.5?1:0;phase[i]=rand()*6.28;
    }
    const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(mp,3));mg.setAttribute('color',new THREE.BufferAttribute(mc,3));mg.setAttribute('glyph',new THREE.BufferAttribute(glyph,1));mg.setAttribute('phase',new THREE.BufferAttribute(phase,1));
    const mm=new THREE.ShaderMaterial({uniforms:{time:{value:0},atlas:{value:texture},pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`attribute vec3 color;attribute float glyph;attribute float phase;varying vec3 vColor;varying float vGlyph;uniform float time;uniform float pixelRatio;void main(){vec3 p=position;p.z+=sin(time*.35+p.y*.4+phase)*.16;vColor=color*(.6+.45*sin(time*1.5+phase+p.y*.2));vGlyph=glyph;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(235./-mv.z,3.,19.)*pixelRatio;gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform sampler2D atlas;varying vec3 vColor;varying float vGlyph;void main(){vec2 uv=vec2((gl_PointCoord.x+vGlyph)*.5,1.-gl_PointCoord.y);float a=texture2D(atlas,uv).a;gl_FragColor=vec4(vColor,a*.67);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});group.add(new THREE.Points(mg,mm));
    // Vertical decision gate: bright colored sample points at the merge plane.
    const gateP=[],gateC=[];
    for(let i=0;i<600;i++){gateP.push(.8+rand()*.18,(rand()-.5)*14,(rand()-.5)*4.7);const c=new THREE.Color(palette[i%3]);c.multiplyScalar(.45+rand());gateC.push(c.r,c.g,c.b);}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gateP,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(gateC,3));group.add(new THREE.Points(gg,pm));
    const sparksP=new Float32Array(32*3), sparksC=new Float32Array(32*3);
    for(let i=0;i<32;i++){sparksP[i*3]=.9+(rand()-.5)*.8;sparksP[i*3+1]=(rand()-.5)*13;sparksP[i*3+2]=(rand()-.5)*4;new THREE.Color(palette[i%3]).lerp(new THREE.Color('#ffffff'),.2).toArray(sparksC,i*3);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sparksP,3));sg.setAttribute('color',new THREE.BufferAttribute(sparksC,3));
    const sm=new THREE.ShaderMaterial({uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:dotVertex.replace('95.0','235.0').replace('1.,12.','2.,36.'),fragmentShader:dotFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});group.add(new THREE.Points(sg,sm));
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize);ro.observe(el);resize();
    let time=0,last=performance.now(),frame,drag=false,mouseX=0,mouseY=0;
    const move=e=>{if(drag){mouseX+=(e.movementX||0)*.006;mouseY=THREE.MathUtils.clamp(mouseY+(e.movementY||0)*.006,-.6,.6);}};
    const down=e=>{drag=true;el.setPointerCapture(e.pointerId);}; const up=()=>{drag=false;};
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    const animate=()=>{
      frame=requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
      const s=settings.current;if(!s.paused)time+=dt;
      for(let i=0;i<32;i++){sparksP[i*3+1]=((i*.406+time*(.45+(i%3)*.15))%13)-6.5;}sg.attributes.position.needsUpdate=true;
      mm.uniforms.time.value=time;bloom.strength=.35+s.intensity*.45;
      for(let i=0;i<count;i++){
        const track=curves[i%curves.length];const p=track.curve.getPoint((time*track.speed+track.offset+Math.floor(i/curves.length)/6)%1);p.toArray(pos,i*3);
      }pg.attributes.position.needsUpdate=true;
      const auto=s.cameraMode==='orbit'?Math.sin(time*.17)*.28:s.cameraMode==='side'?.62:0;
      group.scale.x=Math.min(2.25,Math.max(1,camera.aspect/1.5));group.rotation.y=auto+mouseX;group.rotation.x=mouseY+Math.sin(time*.1)*.035;
      const distance=camera.aspect<.9?27:camera.aspect<1.3?24:21;
      camera.position.set(-.7, .4, distance);camera.lookAt(-.6,0,0);
      composer.render();
    };animate();onReady(true);
    return()=>{cancelAnimationFrame(frame);ro.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);scene.traverse(o=>{o.geometry?.dispose();if(o.material && o.material!==pm)o.material.dispose();});pm.dispose();texture.dispose();composer.dispose();renderer.dispose();el.replaceChildren();};
  }, []);
  return <div className="loom-canvas" ref={host} aria-label="可拖动旋转的三维信号矩阵" />;
}
