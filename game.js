(() => {
  'use strict';
  const {CFG,WORLD,createPlayer,step}=WhalePhysics;
  const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
  const $=s=>document.querySelector(s),overlay=$('#overlay'),keys=new Set(),touch=new Map();
  const W=1280,H=720,scale=.36,images={},facePatches={};
  let player=createPlayer(),started=false,paused=true,ready=false,camera=0,time=0,last=0,accumulator=0,animTime=0,oldState='idle',toastUntil=0,completed=false;
  const accomplishments={move:false,jump:false,crouch:false};
  let shooting=false,attackTime=0,attackHold=0,shotClock=0,ghostClock=0;
  // Idle direction records movement input, independently of mouse aim or dash.
  // Zero means the original front-facing rest pose.
  let idleFacing=0,frontAfterCrouch=false,frontAfterJump=false;
  const pointer={x:650,y:350,active:false},bullets=[],ghosts=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels={idle:'站立休息',run:'奔跑中',jump:'跳跃中',crouch:'抱头蹲',crouchWalk:'蹲着移动',dash:'咻——冲刺',balance:'哇哇…站稳！'};
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function text(s,x,y,size,color,align='center'){ctx.font=`${size}px "Microsoft YaHei", sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);}
  function path(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  const noise=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
  function resize(){const dpr=Math.min(2,devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
  addEventListener('resize',resize);resize();
  function cloud(x,y,size){ctx.save();ctx.globalAlpha=.5;ellipse(x,y,size*1.2,size*.22,'#fffdf3');ellipse(x-size*.25,y-size*.15,size*.6,size*.28,'#fffdf3');ellipse(x+size*.28,y-size*.11,size*.45,size*.25,'#fffdf3');ctx.restore();}
  function tree(x,y,s,tint){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,0,-127,'#91a69a',7);line(0,-55,-30,-103,'#91a69a',4);ellipse(-29,-112,42,55,tint);ellipse(23,-133,47,66,tint);ellipse(-5,-178,43,53,tint);ellipse(44,-98,31,43,tint);ctx.restore();}
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#ddecf0');sky.addColorStop(.65,'#f6f0dd');sky.addColorStop(1,'#d4e7d7');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sunX=1035-camera*.045;
    const halo=ctx.createRadialGradient(sunX,145,4,sunX,145,180);halo.addColorStop(0,'#fffef4c0');halo.addColorStop(1,'#fffde900');ctx.fillStyle=halo;ctx.fillRect(sunX-180,-40,360,370);ellipse(sunX,145,39,39,'#fffcdf');
    for(let i=0;i<8;i++)cloud(i*390-camera*.12+(reduced?0:time*1.2)%390,145+noise(i)*115,45+noise(i+20)*55);
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+20;x+=20){const q=x+camera*(.1+layer*.11);const y=395+layer*52-Math.sin(q*.004+layer*1.8)*(58-layer*8)-Math.sin(q*.009+layer)*19;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=['#c2dcd7','#accfc7','#99c3b7'][layer];ctx.fill();
    }
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#eff9ec';ctx.fillRect(0,536,W,45);for(let i=0;i<18;i++)line(i*92-camera*.22%92,550+(i%3)*9,i*92+45-camera*.22%92,550+(i%3)*9,'#fdfdf2',2);ctx.restore();
    for(let i=0;i<11;i++){const x=i*360-camera*.38-140;if(x> -160&&x<W+160)tree(x,590,.7+noise(i)*.25,['#b1cdb7','#b8d2bd','#a7c6b0'][i%3]);}
    ctx.save();ctx.translate(-camera*.6,0);cottage(110,535);fence(420,568,280);fence(1980,568,270);ctx.restore();
    for(let i=0;i<22;i++){const x=(i*83-camera*.3+time*(reduced?0:2))%1400;const y=250+noise(i+37)*310;ellipse(x,y,1.4,1.4,'#fffdf5a0');}
  }
  function cottage(x,y){
    rounded(x,y-122,145,122,6,'#eee5cc','#c8ccb6');path([[x-13,y-116],[x+67,y-192],[x+159,y-116]],'#7299a0');path([[x-13,y-116],[x+67,y-192],[x+159,y-116],[x+159,y-108],[x+67,y-180],[x-13,y-108]],'#5f858e');
    rounded(x+53,y-64,40,64,[20,20,0,0],'#8fa7a1');ellipse(x+72,y-98,17,17,'#f8e5ab');line(x+72,y-113,x+72,y-83,'#c3c5a5',3);line(x+57,y-98,x+87,y-98,'#c3c5a5',3);
    for(const dx of [13,110]){rounded(x+dx,y-63,23,33,10,'#f8edc1');line(x+dx+11,y-61,x+dx+11,y-33,'#b9c0a6',2);}ellipse(x+89,y-25,2,2,'#e6e3b7');
    tree(x-27,y,.48,'#9cbea7');tree(x+160,y,.4,'#abc8ae');
  }
  function fence(x,y,width){for(let xx=x;xx<x+width;xx+=32){rounded(xx,y-33,7,44,3,'#b7c1a7');}rounded(x-4,y-25,width,6,3,'#c3cab1');rounded(x-4,y-7,width,5,3,'#c3cab1');}
  function flowers(x,y,seed,dense=false){const n=dense?8:4;for(let i=0;i<n;i++){const px=x+(i-n/2)*10,stem=8+noise(seed+i)*12;line(px,y,px+2,y-stem,'#789e7e',1.4);ellipse(px-2,y-stem*.5,4,1.8,'#94af80');const col=['#f9e9ad','#f2c9bd','#dce8ef'][Math.floor(noise(seed+i+50)*3)];for(let a=0;a<5;a++){const ang=a*Math.PI*.4;ellipse(px+2+Math.cos(ang)*3,y-stem+Math.sin(ang)*3,2.4,2.4,col);}ellipse(px+2,y-stem,1.7,1.7,'#d4b982');}}
  function ground(){
    const g=ctx.createLinearGradient(0,612,0,720);g.addColorStop(0,'#dce4c7');g.addColorStop(1,'#eef0d9');ctx.fillStyle=g;ctx.fillRect(0,612,WORLD.width,108);
    rounded(0,607,WORLD.width,10,3,'#9fbb91');rounded(0,615,WORLD.width,4,2,'#d5dcb7');
    for(let i=0;i<160;i++){const x=i*21;if(x<camera-50||x>camera+W+50)continue;const y=625+noise(i)*48;ellipse(x,y,1+noise(i+30)*3,1,'#b6c59b70');if(i%4===0)flowers(x,609,i);}
    for(let i=0;i<30;i++){const x=i*114+48;if(x<camera-100||x>camera+W+100)continue;path([[x,609],[x+4,594],[x+7,609],[x+12,599],[x+10,611]],'#8faa81');}
  }
  function platform(r){
    if(r.kind==='ground')return;
    if(r.kind==='tunnel'){
      // Posts sit behind the playable opening; the lintel is the solid ceiling.
      for(const x of [r.x+16,r.x+r.w-26]){rounded(x,480,10,132,3,'#b7b79a');rounded(x-3,598,16,14,3,'#c8c7a6');}
      rounded(r.x-7,r.y,r.w+14,r.h,9,'#c5c4a4','#aab49a');rounded(r.x-12,r.y-6,r.w+24,13,6,'#93ad85');
      for(let xx=r.x+14;xx<r.x+r.w;xx+=22){line(xx,r.y+12,xx+5,r.y+34,'#b1b79a',1);const length=12+noise(xx)*22;line(xx,r.y,xx-3,r.y+length,'#7eaa85',2);ellipse(xx-4,r.y+length,4,7,'#8bb58e');if(xx%3===0)ellipse(xx+2,r.y+length-4,3,4,'#e5ccd8');}
      flowers(r.x+45,r.y-5,40,true);flowers(r.x+r.w-48,r.y-5,54,true);text('抱头，悄悄通过',r.x+r.w/2,r.y-25,14,'#567c6e');return;
    }
    ellipse(r.x+r.w/2,612,r.w*.55,7,'#6d8b7020');
    rounded(r.x,r.y,r.w,r.h,9,'#c9ccb5','#aebda2');rounded(r.x+3,r.y+4,r.w-6,r.h-8,7,'#d5d5be');
    ctx.save();ctx.beginPath();ctx.roundRect(r.x+2,r.y+2,r.w-4,r.h-4,8);ctx.clip();
    for(let y=r.y+28;y<r.y+r.h;y+=24){line(r.x,y,r.x+r.w,y,'#b9c3aa',1);for(let x=r.x+(Math.round(y)%2?30:57);x<r.x+r.w;x+=61)line(x,y-24,x,y,'#b9c3aa',1);}
    ctx.restore();rounded(r.x-4,r.y-4,r.w+8,10,4,'#a1b98b');rounded(r.x,r.y+5,r.w,3,1,'#e4e4c7');flowers(r.x+r.w-25,r.y-3,r.x);
    if(r.kind==='float'){for(let k=0;k<4;k++){const x=r.x+12+k*43;line(x,r.y+r.h,x-5,r.y+r.h+17+noise(k)*17,'#98b589',2);ellipse(x-4,r.y+r.h+14,4,7,'#9bb88a');}}
  }
  function sign(x,y,heading,sub){line(x,y-46,x,y,'#b5b49a',7);rounded(x-63,y-88,126,48,7,'#fff5d9','#d3d0af');text(heading,x,y-67,13,'#67877a');text(sub,x,y-50,9,'#98a48b');}
  function gate(){
    const x=2705,y=612;rounded(x-68,y-170,10,170,4,'#b4bb9d');rounded(x+58,y-170,10,170,4,'#b4bb9d');
    ctx.beginPath();ctx.arc(x,y-166,63,Math.PI,0);ctx.strokeStyle='#b4bb9d';ctx.lineWidth=10;ctx.stroke();
    for(let i=0;i<13;i++){const a=Math.PI+i*Math.PI/12;const xx=x+Math.cos(a)*64,yy=y-166+Math.sin(a)*64;ellipse(xx,yy,12,9,i%2?'#a6c19b':'#91b58c');if(i%3===0)ellipse(xx+4,yy-2,5,5,'#f3d2c3');}
    const sway=reduced?0:Math.sin(time*1.8)*.05;ctx.save();ctx.translate(x,y-166);ctx.rotate(sway);line(0,0,0,34,'#adb8a1',1);path([[-10,34],[10,34],[14,51],[-14,51]],'#d6ba83');ellipse(0,51,14,3,'#bea975');line(0,52,0,68,'#8fa79c',1);rounded(-6,67,12,25,2,'#b8d1c3');ctx.restore();
    rounded(x-41,y-36,82,36,7,'#dae0bf');flowers(x-70,y,3,true);flowers(x+75,y,6,true);text('风铃小憩',x,y-245,19,'#5c8578');
  }
  function aiming(){
    return WhaleCombat.aim(pointer.x+camera-player.x,pointer.y-(player.y-player.height*.65),player.facing);
  }
  function pose(){
    let name='idle',frame=0,cols=4,foot=458,anchor=284,facing=player.facing;
    const state=player.state;
    if(state==='dash'){
      name='motion';const elapsed=CFG.dashDuration-player.dashTime;
      frame=player.crouched?Math.floor(animTime/.09)%4:elapsed<.055?4:elapsed<.225?5+Math.floor(elapsed/.06)%2:7;
    }else if(attackHold>0){
      const aim=aiming();facing=aim.facing;cols=5;
      const moving=Math.abs(player.vx)>12;
      const moveFacing=player.vx<0?-1:1;
      const backward=moving&&aim.column>0&&aim.column<4&&aim.facing!==moveFacing;
      // Expression timing is independent of distance-driven footwork.
      if(backward){
        // These painted cels move right and look left; mirror by travel, not aim.
        name=player.crouched?'attackCrouchBack':'attackRunBack';cols=3;facing=moveFacing;
        const phase=Math.floor(player.travel/(player.crouched?13:40))%4;
        frame=phase*3+aim.column-1;
      }
      else if(player.crouched){name='attackCrouch';const phase=moving?Math.floor(player.travel/13)%4:1;frame=phase*5+aim.column;}
      else if(moving){name='attackRun';const phase=Math.floor(player.travel/40)%4;frame=phase*5+aim.column;}
      else {name='attack';frame=aim.column;}
    }else if(state==='balance'){name='motion';frame=8+Math.min(3,Math.floor((.56-player.balance)/.14));}
    else if(state==='crouchWalk'){name='motion';frame=Math.floor(player.travel/12)%4;}
    else if(state==='run'){name='run';frame=Math.floor(animTime/.1)%8;foot=474;anchor=305;}
    else if(state==='crouch'){name='crouch';const t=animTime%3.8;frame=t<2.4?2:t<2.65?3:t<3.15?4:5;}
    else if(state==='jump'){name='jump';frame=player.vy< -160?2:player.vy<130?4:5;}
    else if(player.landed>0){name='jump';frame=6;}
    else {
      name=idleFacing?'idleSide':'idle';facing=idleFacing||1;
      frame=reduced?0:WhaleIdle.frameAt(animTime,WhaleArt[name].length,WhaleArt[name][0].idle_mode,WhaleArt[name][0].idle_period);
    }
    anchor=WhaleArt[name]?.[frame]?.anchor??anchor;
    foot=WhaleArt[name]?.[frame]?.foot??foot;
    cols=WhaleArt[name]?.[frame]?.atlas_cols??cols;
    return {name,frame,cols,foot,anchor,facing,mouth:WhaleFace.mouthState(name,name.startsWith('attack')?attackTime:time),blink:WhaleFace.blinkState(name,time)};
  }
  function cacheFacePatches(){
    for(const [id,tile] of Object.entries(WhaleFaceArt.tiles)){
        const [x,y,w,h]=tile.rect;
        const patch=document.createElement('canvas');patch.width=w;patch.height=h;
        patch.__whaleFace={tile:id,channel:tile.channel};
        const pc=patch.getContext('2d');pc.imageSmoothingQuality='high';
        if(tile.paper_key){
          // Keep the supplied painted line; remove its paper only in rendering.
          // Raw bytes avoid canvas readback, preserving offline file:// play.
          const pixels=pc.createImageData(w,h),data=pixels.data;data.set(tile.rgba);
          const key=tile.paper_key;
          for(let i=0;i<data.length;i+=4){
            const difference=Math.max(key.rgb[0]-data[i],key.rgb[1]-data[i+1],key.rgb[2]-data[i+2]);
            data[i+3]*=Math.max(0,Math.min(1,(difference-key.threshold)/key.softness));
          }
          pc.putImageData(pixels,0,0);
        }else pc.drawImage(images.expressions,x,y,w,h,0,0,w,h);
        pc.globalCompositeOperation='destination-in';
        if(tile.feather_shape==='rectangle'){
          // Four edge fades preserve the exact supplied w stroke in the center.
          const edge=1-tile.feather_inner;
          for(const vertical of [false,true]){
            const extent=vertical?h:w,g=pc.createLinearGradient(0,0,vertical?0:extent,vertical?extent:0);
            g.addColorStop(0,'#ffffff00');g.addColorStop(edge/2,'#ffffffff');g.addColorStop(1-edge/2,'#ffffffff');g.addColorStop(1,'#ffffff00');
            pc.fillStyle=g;pc.fillRect(0,0,w,h);
          }
        }else if(tile.feather_shape==='ellipse'){
          // Fade all four edges of a wide eye region without a rectangular seam.
          pc.save();pc.translate(w/2,h/2);pc.scale(1,h/w);
          const g=pc.createRadialGradient(0,0,0,0,0,w/2);
          g.addColorStop(0,'#ffffffff');g.addColorStop(tile.feather_inner,'#ffffffff');g.addColorStop(1,'#ffffff00');
          pc.fillStyle=g;pc.fillRect(-w/2,-w/2,w,w);pc.restore();
        }else{
          const g=pc.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)/2);
          g.addColorStop(0,'#ffffffff');g.addColorStop(tile.feather_inner,'#ffffffff');g.addColorStop(1,'#ffffff00');
          pc.fillStyle=g;pc.fillRect(0,0,w,h);
        }
        facePatches[id]=patch;
    }
  }
  function paintCel(p,x,y,alpha=1){
    if(!images[p.name])return;
    const frame=p.frame,face=WhaleArt[p.name]?.[frame]?.facial;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(p.facing,1);
    ctx.drawImage(images[p.name],frame%p.cols*512,Math.floor(frame/p.cols)*512,512,512,-p.anchor*scale,-p.foot*scale,512*scale,512*scale);
    const bindings=[p.blink?face?.eyes?.blink:null,face?.mouth?.[p.mouth]];
    for(const binding of bindings){
      if(!binding)continue;
      for(const part of [binding.underlay,binding]){
        if(!part)continue;
        const patch=facePatches[part.tile];if(!patch)continue;
        const [mx,my,w,h]=part.target;ctx.drawImage(patch,(mx-p.anchor)*scale,(my-p.foot)*scale,w*scale,h*scale);
      }
    }
    ctx.restore();
  }
  function muzzle(p){
    const m=WhaleArt[p.name]?.[p.frame]?.palm||[p.anchor+70,p.foot-185];
    return {x:player.x+(m[0]-p.anchor)*scale*p.facing,y:player.y+(m[1]-p.foot)*scale};
  }
  function sprite(){
    for(const g of ghosts)paintCel(g.pose,g.x,g.y,g.life/.24*.32);
    const groundDistance=Math.max(0,612-player.y);
    ellipse(player.x,Math.min(player.y+2,612),38-Math.min(14,groundDistance*.08),5,'#517b6e24');
    const p=pose();paintCel(p,player.x,player.y);
    canvas.dataset.pose=p.name;canvas.dataset.bodyFrame=String(p.frame);canvas.dataset.mouth=p.mouth;canvas.dataset.blink=String(p.blink);
    if(shooting&&!player.dashTime){const m=muzzle(p);ellipse(m.x,m.y,5+Math.sin(attackTime*48)*1.5,5,'#a7ecffb0');ellipse(m.x,m.y,2.5,2.5,'#f4ffff');}
    for(const b of bullets){line(b.x-b.vx*.016,b.y-b.vy*.016,b.x,b.y,'#6bbce8a0',6);ellipse(b.x,b.y,4.5,4.5,'#63b9ef');ellipse(b.x,b.y,2.2,2.2,'#e9fcff');}
    if(pointer.active&&!paused){const x=pointer.x+camera,y=pointer.y;ctx.strokeStyle='#569ac0a0';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();line(x-13,y,x-5,y,'#569ac0a0');line(x+5,y,x+13,y,'#569ac0a0');line(x,y-13,x,y-5,'#569ac0a0');line(x,y+5,x,y+13,'#569ac0a0');}
  }
  function updateCombat(dt){
    attackHold=shooting?.12:Math.max(0,attackHold-dt);
    if(attackHold)attackTime+=dt;else attackTime=0;
    shotClock=Math.max(0,shotClock-dt);
    if(shooting&&!player.dashTime&&shotClock<=0){
      const m=muzzle(pose()),dx=pointer.x+camera-m.x,dy=pointer.y-m.y;
      const angle=Math.hypot(dx,dy)<8?aiming().angle:Math.atan2(dy,dx);
      bullets.push({x:m.x,y:m.y,vx:Math.cos(angle)*720,vy:Math.sin(angle)*720,life:1.6});shotClock=.095;
    }
    for(let i=bullets.length-1;i>=0;i--)if(!WhaleCombat.advanceBullet(bullets[i],dt,WORLD.solids))bullets.splice(i,1);
    ghostClock-=dt;
    if(player.dashTime>.075&&player.dashTime<.245&&ghostClock<=0){ghosts.push({x:player.x,y:player.y,pose:pose(),life:.24});ghostClock=.028;}
    for(let i=ghosts.length-1;i>=0;i--){ghosts[i].life-=dt;if(ghosts[i].life<=0)ghosts.splice(i,1);}
  }
  function draw(){
    ctx.clearRect(0,0,W,H);background();ctx.save();ctx.translate(-camera,0);ground();
    sign(330,612,'向前走走','A / D   左右移动');sign(583,612,'跳上石阶','SPACE   跳跃');sign(1463,612,'低一点，再低一点','S   抱头蹲');
    WORLD.solids.forEach(platform);gate();sprite();
    ctx.restore();
    const shade=ctx.createLinearGradient(0,660,0,720);shade.addColorStop(0,'#eff1da00');shade.addColorStop(1,'#eff1dad9');ctx.fillStyle=shade;ctx.fillRect(0,660,W,60);
  }
  function input(){const values=[...touch.values()];return {left:keys.has('KeyA')||keys.has('ArrowLeft')||values.includes('left'),right:keys.has('KeyD')||keys.has('ArrowRight')||values.includes('right'),crouch:keys.has('KeyS')||keys.has('ArrowDown')||values.includes('crouch'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight')||values.includes('dash'),attack:shooting,jump:keys.has('Space')||values.includes('jump')};}
  function advancePlayer(dt){
    const controls=input(),axis=(controls.right?1:0)-(controls.left?1:0);
    const wasGrounded=player.grounded,wasCrouched=player.crouched;
    step(player,controls,dt);
    if(axis){idleFacing=axis;frontAfterCrouch=frontAfterJump=false;}
    else {
      // Record the beginning of a stationary action, not the later moment when
      // movement keys are released during a moving crouch or a moving jump.
      if(!wasCrouched&&player.crouched)frontAfterCrouch=true;
      if(wasGrounded&&!player.grounded&&player.vy<0&&!player.dashTime)frontAfterJump=true;
      if(frontAfterCrouch&&!player.crouched){idleFacing=0;frontAfterCrouch=false;}
      if(frontAfterJump&&!wasGrounded&&player.grounded){idleFacing=0;frontAfterJump=false;}
    }
  }
  function clearInput(){keys.clear();touch.clear();player.jumpHeld=false;player.dashHeld=false;shooting=false;attackHold=0;}
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');toastUntil=time+3.5;}
  function start(){if(!ready)return;started=true;paused=false;overlay.classList.add('hidden');clearInput();canvas.focus({preventScroll:true});last=performance.now();accumulator=0;}
  function pause(){if(!started||paused)return;paused=true;clearInput();$('#overlay-title').textContent='在这里歇一会儿';$('#overlay-copy').innerHTML='小肥鲸会等你回来。<br>点击继续，或按 Esc 返回庭院。';$('#play').innerHTML='继续散步 <span>→</span>';overlay.classList.remove('hidden');}
  function reset(){bullets.length=0;ghosts.length=0;attackTime=shotClock=0;player=createPlayer();idleFacing=0;frontAfterCrouch=frontAfterJump=false;camera=0;time=0;animTime=0;oldState='idle';completed=false;Object.keys(accomplishments).forEach(k=>accomplishments[k]=false);$('#toast').classList.remove('show');$('#toast').textContent='';toastUntil=0;start();}
  $('#play').addEventListener('click',start);$('#restart').addEventListener('click',()=>ready&&reset());
  $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.game-shell').requestFullscreen();canvas.focus();}catch{toast('浏览器暂不支持全屏，可以直接在这里玩。');}});
  function trackPointer(e){
    const r=canvas.getBoundingClientRect(),fit=Math.min(r.width/W,r.height/H);
    pointer.x=(e.clientX-r.left-(r.width-W*fit)/2)/fit;pointer.y=(e.clientY-r.top-(r.height-H*fit)/2)/fit;
    pointer.active=pointer.x>=0&&pointer.x<=W&&pointer.y>=0&&pointer.y<=H;
  }
  canvas.addEventListener('pointermove',trackPointer);
  canvas.addEventListener('pointerleave',()=>{pointer.active=false;});
  canvas.addEventListener('pointerdown',e=>{if(started&&!paused&&e.button===0){trackPointer(e);if(!pointer.active)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);shooting=true;shotClock=0;player.balance=0;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{shooting=false;});
  const gameKeys=new Set(['KeyA','KeyD','KeyS','ArrowLeft','ArrowRight','ArrowDown','Space','ShiftLeft','ShiftRight']);
  addEventListener('keydown',e=>{
    if(e.code==='Escape'){if(started){e.preventDefault();paused?start():pause();}return;}
    if(e.code==='KeyR'&&started&&!e.repeat){e.preventDefault();reset();return;}
    if(!started||paused)return;
    if(gameKeys.has(e.code)){e.preventDefault();keys.add(e.code);}
  });
  addEventListener('keyup',e=>{if(gameKeys.has(e.code)){if(started)e.preventDefault();keys.delete(e.code);}});
  addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  document.querySelectorAll('[data-key]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>touch.delete(e.pointerId));
  });
  function updateUI(){
    const attackLabel=pose().name.endsWith('Back')?'回头反击':'瞄准射击';
    $('#action').textContent=paused?(started?'已暂停':'准备出发'):labels[player.state]+(shooting&&!player.dashTime?' · '+attackLabel:'');
    const names={move:'移动',jump:'跳跃',crouch:'抱头蹲'};
    for(const k of Object.keys(accomplishments)){const el=$('#task-'+k);el.textContent=(accomplishments[k]?'✓ ':'○ ')+names[k];el.classList.toggle('done',accomplishments[k]);}
    const progress=Math.max(0,Math.min(1,(player.x-WORLD.spawn.x)/(WORLD.end-WORLD.spawn.x)));$('#progress').style.width=progress*100+'%';
    $('#place').textContent=player.x<600?'庭院入口':player.x<1480?'跳台小径':player.x<1970?'藤花长廊':'风铃小憩';
  }
  function loop(now){
    requestAnimationFrame(loop);const dt=Math.min(.05,Math.max(0,(now-last)/1000||0));last=now;
    if(!paused&&ready){
      time+=dt;accumulator+=dt;
      while(accumulator>=1/120){advancePlayer(1/120);updateCombat(1/120);accumulator-=1/120;}
      if(player.state!==oldState){animTime=0;oldState=player.state;}else animTime+=dt;
      const target=Math.max(0,Math.min(WORLD.width-W,player.x-W*.36));camera+=(target-camera)*(1-Math.exp(-dt*6));
      if(player.travel>45)accomplishments.move=true;if(!player.grounded)accomplishments.jump=true;if(player.crouched)accomplishments.crouch=true;
      if(!completed&&player.x>=WORLD.end){completed=true;toast('到啦！小肥鲸的第一次散步，完成。也可以往回走走。');}
      if(toastUntil&&time>toastUntil){$('#toast').classList.remove('show');toastUntil=0;}
    }
    draw();updateUI();
  }
  Promise.all(['idle','idleSide','run','crouch','jump','motion','attack','attackRun','attackCrouch','attackRunBack','attackCrouchBack','expressions'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(new Error(name));im.src='assets/'+name+'.png';}))).then(()=>{cacheFacePatches();ready=true;$('#loading').style.display='none';draw();}).catch(e=>{$('#loading').textContent='角色素材加载失败：'+e.message+'。请保留 assets 文件夹并重新打开。';});
  requestAnimationFrame(loop);
})();
