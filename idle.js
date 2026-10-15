(function(root){
  'use strict';
  // Each bank sets its cycle period; legacy ping-pong banks default to 2.8s.
  // The endpoint appears once, avoiding an extra hold when reversing.
  function frameAt(time,count,mode='pingpong',period=2.8){
    if(!Number.isFinite(time)||time<0||count<2)return 0;
    const steps=mode==='cycle'?count:2*count-2;
    if(!Number.isFinite(period)||period<=0)return 0;
    const step=Math.floor((time%period)/(period/steps));
    return mode==='cycle'||step<count?step:steps-step;
  }
  const api={frameAt};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WhaleIdle=api;
})(typeof window!=='undefined'?window:globalThis);
