(function(root){
  'use strict';
  // Expression clocks are independent of gait frames, speed and aim direction.
  const ATTACKS=new Set(['attack','attackRun','attackCrouch','attackRunBack','attackCrouchBack','attacking']);
  const phase=(time,period)=>Number.isFinite(time)&&time>=0?time%period:0;
  function mouthState(action,actionTime){
    if(ATTACKS.has(action))return phase(actionTime,2.4)>=1.65?'open':'closed';
    if(action==='run'||action==='running')return phase(actionTime,3.85)>=3.5?'open':'closed';
    return 'closed';
  }
  function blinkState(action,actionTime){
    return (action==='idle'||action==='idleSide'||action==='sideidle')&&phase(actionTime,4.8)>=4.64;
  }
  const api={mouthState,blinkState};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WhaleFace=api;
})(typeof window!=='undefined'?window:globalThis);
