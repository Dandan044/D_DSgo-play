(function(root){
  'use strict';
  const CFG={width:80,standHeight:124,crouchHeight:90,speed:265,crouchSpeed:105,accel:2400,airAccel:1500,friction:2900,gravity:1680,jumpSpeed:635,maxFall:920,coyote:.105,buffer:.13,dashSpeed:760,dashDuration:.30,dashCooldown:.65};
  const WORLD={width:2920,height:720,spawn:{x:175,y:612},end:2720,solids:[
    {x:0,y:612,w:2920,h:160,kind:'ground'},
    {x:660,y:530,w:175,h:82,kind:'stone'},
    {x:910,y:450,w:190,h:28,kind:'float'},
    {x:1260,y:530,w:160,h:82,kind:'stone'},
    {x:1570,y:470,w:360,h:42,kind:'tunnel'},
    {x:2170,y:554,w:155,h:58,kind:'stone'}
  ]};
  function createPlayer(world=WORLD){return {x:world.spawn.x,y:world.spawn.y,vx:0,vy:0,height:CFG.standHeight,crouched:false,grounded:true,facing:1,coyote:CFG.coyote,jumpBuffer:0,jumpHeld:false,dashHeld:false,dashTime:0,dashCooldown:0,balance:0,landed:0,airTime:0,travel:0,state:'idle'};}
  function overlaps(x,y,w,h,r){return x<r.x+r.w-.001&&x+w>r.x+.001&&y<r.y+r.h-.001&&y+h>r.y+.001;}
  function blocked(p,h,world){return world.solids.some(r=>overlaps(p.x-CFG.width/2,p.y-h,CFG.width,h,r));}
  const toward=(v,t,a)=>v<t?Math.min(v+a,t):Math.max(v-a,t);
  function step(p,input,dt,world=WORLD){
    p.landed=Math.max(0,p.landed-dt);
    p.dashCooldown=Math.max(0,(p.dashCooldown||0)-dt);
    p.balance=Math.max(0,(p.balance||0)-dt);
    const axis=(input.right?1:0)-(input.left?1:0);
    if(axis||input.jump||input.crouch||input.attack)p.balance=0;
    if(input.dash&&!p.dashHeld&&!p.dashCooldown){
      p.dashTime=CFG.dashDuration;p.dashDirection=axis||p.facing;
      p.dashCooldown=CFG.dashCooldown;p.balance=0;
    }
    p.dashHeld=!!input.dash;
    const wasDashing=(p.dashTime||0)>0;
    p.dashTime=Math.max(0,(p.dashTime||0)-dt);
    if(wasDashing&&!p.dashTime&&!axis&&p.grounded&&!p.crouched)p.balance=.56;
    const previousGround=p.grounded;
    p.coyote=p.grounded?CFG.coyote:Math.max(0,p.coyote-dt);
    const wantCrouch=!!input.crouch;
    if(wantCrouch&&p.grounded){p.crouched=true;p.height=CFG.crouchHeight;}
    else if(p.crouched&&!blocked(p,CFG.standHeight,world)){p.crouched=false;p.height=CFG.standHeight;}
    if(input.jump&&!p.jumpHeld)p.jumpBuffer=CFG.buffer;
    else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
    if(!input.jump&&p.jumpHeld&&p.vy< -280)p.vy=-280;
    p.jumpHeld=!!input.jump;
    if(p.jumpBuffer>0&&p.coyote>0&&!p.dashTime&&!blocked(p,CFG.standHeight,world)){
      p.crouched=false;p.height=CFG.standHeight;p.vy=-CFG.jumpSpeed;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.airTime=0;
    }
    if(axis&&!p.dashTime)p.facing=axis;
    const speed=p.crouched?CFG.crouchSpeed:CFG.speed;
    p.vx=toward(p.vx,axis*speed,(axis?(p.grounded?CFG.accel:CFG.airAccel):CFG.friction)*dt);
    if(p.dashTime){
      p.facing=p.dashDirection;
      const elapsed=CFG.dashDuration-p.dashTime;
      p.vx=p.dashDirection*(elapsed<.055?90:elapsed<.225?CFG.dashSpeed:(axis?CFG.speed:120));
    }else if(p.balance)p.vx=0;
    const oldX=p.x;p.x+=p.vx*dt;
    for(const r of world.solids){if(overlaps(p.x-CFG.width/2,p.y-p.height,CFG.width,p.height,r)){
      if(p.vx>0)p.x=r.x-CFG.width/2;else if(p.vx<0)p.x=r.x+r.w+CFG.width/2;p.vx=0;
    }}
    p.x=Math.max(CFG.width/2,Math.min(world.width-CFG.width/2,p.x));p.travel+=Math.abs(p.x-oldX);
    // Dash freezes vertical velocity during ascent as well as descent.
    // After it ends, gravity resumes from rest instead of restoring fall speed.
    p.vy=p.dashTime?0:Math.min(CFG.maxFall,p.vy+CFG.gravity*dt);p.y+=p.vy*dt;p.grounded=false;
    for(const r of world.solids){if(overlaps(p.x-CFG.width/2,p.y-p.height,CFG.width,p.height,r)){
      if(p.vy>=0){p.y=r.y;p.grounded=true;p.vy=0;}else{p.y=r.y+r.h+p.height;p.vy=0;}
    }}
    if(p.dashTime&&!p.grounded)p.grounded=world.solids.some(r=>Math.abs(p.y-r.y)<.01&&p.x+CFG.width/2>r.x+.001&&p.x-CFG.width/2<r.x+r.w-.001);
    if(p.grounded&&!previousGround)p.landed=.12;
    if(!p.grounded)p.airTime+=dt;
    p.state=!p.grounded?'jump':p.crouched?(Math.abs(p.vx)>12?'crouchWalk':'crouch'):Math.abs(p.vx)>12?'run':'idle';
    if(p.dashTime)p.state='dash';else if(p.balance&&p.grounded&&!p.crouched)p.state='balance';
    if(p.y>world.height+400)Object.assign(p,createPlayer(world));
    return p;
  }
  const api={CFG,WORLD,createPlayer,step,overlaps,blocked};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WhalePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
