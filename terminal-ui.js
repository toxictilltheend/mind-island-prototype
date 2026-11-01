/* A whole-interface character terminal, with semantic HTML controls beneath it. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s);
 let scheduled=false;
 const observed=new Set();
 const measure=document.createElement('span');measure.className='ascii-ruler';measure.textContent='0000000000';measure.setAttribute('aria-hidden','true');document.body.append(measure);
 function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
 function frame(el){
  if(el.querySelector(':scope > .ascii-frame-lines'))return;
  el.classList.add('ascii-framed');
  const lines=document.createElement('div');lines.className='ascii-frame-lines';lines.setAttribute('aria-hidden','true');
  for(const side of ['top','bottom','left','right']){const part=document.createElement('pre');part.className='ascii-frame-'+side;lines.append(part);}
  el.append(lines);resize.observe(el);observed.add(el);
 }
 function resizeFrame(el){
  if(!el.isConnected)return;
  const lines=el.querySelector(':scope > .ascii-frame-lines');if(!lines)return;
  const width=el.clientWidth,height=el.clientHeight;if(width<20||height<25)return;
  const unit=measure.getBoundingClientRect().width/10||7.2,cols=Math.max(3,Math.floor(width/unit));
  const horizontal='+'+'-'.repeat(cols-2)+'+',rows=Math.max(1,Math.floor((height-30)/18));
  setText(lines.querySelector('.ascii-frame-top'),horizontal);setText(lines.querySelector('.ascii-frame-bottom'),horizontal);
  setText(lines.querySelector('.ascii-frame-left'),Array(rows).fill('|').join('\n'));setText(lines.querySelector('.ascii-frame-right'),Array(rows).fill('|').join('\n'));
  lines.querySelector('.ascii-frame-right').style.left=(cols-1)*unit+'px';
 }
 const resize=new ResizeObserver(items=>items.forEach(item=>resizeFrame(item.target)));
 const careArt={
  breath:['       . . . . .       ','    .             .    ','  .    IN  <-> OUT   .  ','    .             .    ','       . . . . .       '],
  sound:['      .     .       .  ','  .   | .   |   .   |  ',' -|---|-|---|---|---|--','  |   | |   |   |   |  ','  .   .     .       .  '],
  move:['          o            ','       --/|--          ','         / q           ','        /   q          ','   ____/     q____     '].map(s=>s.replaceAll('q',String.fromCharCode(92)))
 };
 function energy(){
  const input=$('#island-energy');if(!input)return;
  let shell=input.parentElement;
  if(!shell.classList.contains('ascii-range-shell')){shell=document.createElement('div');shell.className='ascii-range-shell';input.before(shell);shell.append(input);const meter=document.createElement('pre');meter.className='ascii-energy-meter';meter.setAttribute('aria-hidden','true');shell.prepend(meter);}
  const n=Math.round(Number(input.value)/100*16);
  setText(shell.querySelector('pre'),'['+'#'.repeat(n)+'.'.repeat(16-n)+'] '+String(input.value).padStart(3,' ')+'%');
 }
 function apply(){
  scheduled=false;
  document.querySelectorAll('.landscape,.weather-controls,.feeling-terminal,.memory-card,.journal-entry,.insights-grid>.card,.care-card,.care-intro,.stats-row,.insight-explainer,.demo-banner,.empty-state,dialog,.storage-warning').forEach(frame);
  document.querySelectorAll('textarea').forEach(input=>{if(!input.parentElement.classList.contains('ascii-input-shell')){const shell=document.createElement('div');shell.className='ascii-input-shell';input.before(shell);shell.append(input);frame(shell);}});
  const labels={home:'[01] 小岛',journal:'[02] 标本',insights:'[03] 洞察',care:'[04] 关怀'};
  document.querySelectorAll('.nav-item').forEach(b=>setText(b,labels[b.dataset.page]));
  document.querySelectorAll('[data-studio-mode]').forEach(b=>{const names={island:'ISLAND / 小岛',terminal:'TALK / 终端',sandbox:'PLAY / 沙盘'};setText(b,(b.getAttribute('aria-selected')==='true'?'[*] ':'[ ] ')+names[b.dataset.studioMode]);});
  document.querySelectorAll('.weather-choice').forEach(b=>{let mark=b.querySelector('.choice-dot');if(mark)setText(mark,b.getAttribute('aria-pressed')==='true'?'[x]':'[ ]');});
  document.querySelectorAll('.care-art').forEach(el=>{if(el.dataset.terminalArt)return;el.dataset.terminalArt='true';const type=el.classList.contains('sound')?'sound':el.classList.contains('move')?'move':'breath';const pre=document.createElement('pre');pre.textContent=careArt[type].join('\n');pre.setAttribute('aria-hidden','true');el.replaceChildren(pre);});
  document.querySelectorAll('.terminal-title>span:first-child').forEach(el=>setText(el,'[ : : : ]'));
  document.querySelectorAll('.icon-button').forEach(el=>setText(el,'X'));
  document.querySelectorAll('.landscape-top [data-studio-motion]').forEach(el=>setText(el,el.getAttribute('aria-pressed')==='true'?'[>] 流动':'[||] 暂停'));
  document.querySelectorAll('button:not(.memory-card):not(.journal-landscape):not(.object-handle)').forEach(el=>{
   if(el.hasAttribute('aria-label')&&!el.dataset.terminalLabel)return;
   el.dataset.terminalLabel='true';const label=el.textContent.trim();
   if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);
  });
  energy();
  for(const el of observed){if(!el.isConnected){resize.unobserve(el);observed.delete(el);}else resizeFrame(el);}
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(apply);}}
 const observer=new MutationObserver(schedule);
 observer.observe(document.querySelector('.app-shell'),{childList:true,subtree:true});
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{childList:true,subtree:true,attributes:true,attributeFilter:['open']}));
 document.addEventListener('input',event=>{if(event.target.id==='island-energy')energy();});
 window.addEventListener('resize',schedule);
 apply();
})();
