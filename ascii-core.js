/* Fixed-width, deterministic ASCII landscapes. No images or remote services. */
(function(root){
 'use strict';
 const W=72,H=29,BS=String.fromCharCode(92);
 const weather=[
  {mood:1,name:'小雨',feeling:'低落',glyph:'///',line:'雨落下来，也可以什么都不解释。'},
  {mood:2,name:'多云',feeling:'有点累',glyph:'(~)',line:'云多的时候，允许自己慢一点。'},
  {mood:3,name:'薄雾',feeling:'平静',glyph:'...',line:'还说不清的感受，也有它的位置。'},
  {mood:4,name:'微风',feeling:'还不错',glyph:'~ ~',line:'有风经过，把此刻轻轻留下。'},
  {mood:5,name:'晴光',feeling:'很开心',glyph:'[*]',line:'那些很小的光，也值得被记住。'}
 ];
 const needs=['休息一下','被理解','有人陪伴','迈出一步','留一点白'];
 const definitions={
  tree:{name:'树',meaning:'一点生长',art:['  *  ',' *** ','*****','  |  ',' _|_ ']},
  mountain:{name:'山',meaning:'有分量的事',art:['   /q   ','  /::q  ',' /:  :q ','/______q']},
  lamp:{name:'灯塔',meaning:'一点支持',art:['  _  ',' [_] ',' /|q ','  |  ','  |  ',' _|_ ']},
  rain:{name:'雨',meaning:'流动的感受',art:[' .--. ','(____)',' / / /','/ / / ']},
  bridge:{name:'桥',meaning:'一次连接',art:[' |     | ','_|_____|_','/ / / / /']},
  star:{name:'星',meaning:'小小盼头',art:[' .|. ','--*--'," '|\u0027 "]},
  home:{name:'小屋',meaning:'安心的地方',art:['  /q  ',' /__q ',' |[]| ','_|__|_']},
  flower:{name:'花',meaning:'一件小确幸',art:[' .*. ','(*)*','  |/',' _|_']},
  boat:{name:'小船',meaning:'一点自由',art:['  |q  ','  | q ',' _|__q','q____/']}
 };
 for(const d of Object.values(definitions))d.art=d.art.map(row=>row.replace(/q/g,BS));
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function defaultObjects(){return [{id:'seed-tree',type:'tree',x:12,y:14},{id:'seed-home',type:'home',x:39,y:16},{id:'seed-lamp',type:'lamp',x:54,y:13}];}
 function sanitizeScene(scene){
  if(!scene||typeof scene!=='object'||!Array.isArray(scene.objects))return {version:1,objects:[]};
  const seen=new Set();const objects=[];
  for(const o of scene.objects.slice(0,12)){
   if(!o||!Object.hasOwn(definitions,o.type)||typeof o.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(o.id)||seen.has(o.id)||!Number.isFinite(o.x)||!Number.isFinite(o.y))continue;
   seen.add(o.id);const d=definitions[o.type],width=Math.max(...d.art.map(s=>s.length));
   objects.push({id:o.id,type:o.type,x:clamp(Math.round(o.x),0,W-width),y:clamp(Math.round(o.y),0,H-d.art.length)});
  }
  return {version:1,objects};
 }
 function normalizeEntry(entry){
  const normalized={...entry};
  if(entry.scene!==undefined)normalized.scene=sanitizeScene(entry.scene);
  if(entry.energy!==undefined){if(Number.isFinite(entry.energy))normalized.energy=clamp(Math.round(entry.energy),0,100);else delete normalized.energy;}
  if(entry.need!==undefined&&!needs.includes(entry.need))delete normalized.need;
  if(entry.source!==undefined&&!['island','terminal','sandbox'].includes(entry.source))delete normalized.source;
  return normalized;
 }
 function render(state={},frame=0){
  const grid=Array.from({length:H},()=>Array(W).fill(' '));
  const mood=Number.isInteger(state.mood)&&state.mood>=1&&state.mood<=5?state.mood:3;
  const energy=Number.isFinite(state.energy)?clamp(state.energy,0,100):50;
  const f=Number.isFinite(frame)?Math.floor(frame):0;
  function put(x,y,lines){(Array.isArray(lines)?lines:[lines]).forEach((row,dy)=>Array.from(row.replace(/q/g,BS)).forEach((ch,dx)=>{if(ch!==' '&&x+dx>=0&&x+dx<W&&y+dy>=0&&y+dy<H)grid[y+dy][x+dx]=ch;}));}
  function hash(x,y){return Math.abs(Math.sin(x*127.1+y*311.7)*43758.5)%1;}
  // The same living island exists in every kind of weather.
  for(let y=17;y<27;y++)for(let x=3;x<69;x++){
   const shape=Math.pow((x-36)/31,2)+Math.pow((y-21)/5.3,2);
   if(shape<1){grid[y][x]=shape>.83?'.':shape>.65?':':hash(x,y)>.8?'+':hash(x,y)>.45?':':'.';}
  }
  put(20,11,['         /q          ','        /..q         ','       /:  :q        ','   /q /:    :q       ','  /:.q:  .   :q      ',' /:   q . :   :q     ','/______q________q    ']);
  if(mood===5){put(54,2,['   |   ','q  |  /',' --*-- ','/  |  q','   |   ']);put(10,5,[' .--.','(____)']);}
  if(mood===4){put(8+(f%3),3,['   .--.',' .(    ).','(________)']);put(47,5,[' ~~~   ~~~~~','     ~~~~']);}
  if(mood<=2){put(7+(f%2),3,['    .----.',' .-(      )-.','(____________)']);put(43,2,['   .---.',' .(     ).','(_________)']);}
  if(mood===1){for(let y=7;y<16;y++)for(let x=5;x<67;x++)if((x*7+y*3+f)%17===0)grid[y][x]='/';}
  if(mood===3){put(10,5,['. . . . . . . .']);put(45,7,['. . . . . . . . .']);put(3,12,['. . . .']);}
  // Tide moves gently; energy changes wave density, not the value of a mood.
  for(let y=25;y<H;y++)for(let x=2;x<W-2;x++){if((x+f+y*3)%Math.round(19-energy/15)===0&&grid[y][x]===' ')put(x,y,'~');}
  const objects=state.scene?sanitizeScene(state.scene).objects:defaultObjects();
  objects.forEach(o=>put(o.x,o.y,definitions[o.type].art));
  put(3,28,'.');put(68,28,'.');
  return grid.map(row=>row.join('')).join('\n');
 }
 function description(state){const w=weather[(state.mood||3)-1]||weather[2];const objects=state.scene?sanitizeScene(state.scene).objects:defaultObjects();return w.name+'中的字符小岛'+(objects.length?'，放着'+objects.map(o=>definitions[o.type].name).join('、'):'，留有一片空地')+(state.need?'。此刻需要'+state.need:'')+'。';}
 function postcard(entry){return '[ MIND ISLAND // '+new Date(entry.date).toLocaleDateString('zh-CN').replaceAll('/','.')+' ]\n'+description(entry)+'\n\n'+render(entry,0)+'\n\n'+(entry.note||'这一刻，没有写字也没有关系。')+'\n// 每一种天气，都有被留下的意义。';}
 const api={W,H,weather,needs,definitions,clamp,defaultObjects,sanitizeScene,normalizeEntry,render,description,postcard};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.AsciiCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
