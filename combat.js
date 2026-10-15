(function(root){
  'use strict';
  // Five painted right-facing elevations, mirrored into eight compass sectors.
  function aim(dx,dy,facing=1){
    if(Math.hypot(dx,dy)<8)return {sector:facing===1?0:4,column:2,facing,angle:facing===1?0:Math.PI};
    const angle=Math.atan2(dy,dx),sector=(Math.round(angle/(Math.PI/4))+8)%8;
    const face=sector===2||sector===6?facing:(sector<2||sector>6?1:sector>2&&sector<6?-1:1);
    const column=[2,3,4,3,2,1,0,1][sector];
    return {sector,column,facing:face,angle};
  }
  function segmentRect(x,y,nx,ny,r){
    let low=0,high=1;
    for(const [p,d,min,max] of [[x,nx-x,r.x,r.x+r.w],[y,ny-y,r.y,r.y+r.h]]){
      if(Math.abs(d)<1e-9){if(p<min||p>max)return false;continue;}
      const a=(min-p)/d,b=(max-p)/d;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));
      if(low>high)return false;
    }
    return true;
  }
  function advanceBullet(b,dt,solids){
    const x=b.x+b.vx*dt,y=b.y+b.vy*dt;b.life-=dt;
    if(solids.some(r=>segmentRect(b.x,b.y,x,y,r)))return false;
    b.x=x;b.y=y;return b.life>0;
  }
  const api={aim,segmentRect,advanceBullet};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WhaleCombat=api;
})(typeof window!=='undefined'?window:globalThis);
