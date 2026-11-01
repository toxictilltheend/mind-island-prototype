/* Three ways to express a moment; one private, shared draft. */
(() => {
 'use strict';
 const A=window.AsciiCore,C=window.MindCore;
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=o=>JSON.parse(JSON.stringify(o));
 let bridge,mode='island',frame=0,timer=null,selected=null,drag=null,undo=[],talkStep=0;
 let paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let draft={mood:null,energy:50,need:'',tags:[],note:'',scene:{version:1,objects:A.defaultObjects()}};
 let savedFingerprint='';
 const fingerprint=()=>JSON.stringify(draft);
 const weather=()=>A.weather[(draft.mood||3)-1];
 const canSave=()=>Boolean(draft.mood)&&fingerprint()!==savedFingerprint&&!window.Expression.busy('studio');
 function status(text){const s=$('#studio-status');if(s)s.textContent=text;}
 function stateDescription(){return A.description({...draft,mood:draft.mood||3}).replace('字符','');}
 function controls(){return `<aside class="weather-controls checkin-card primary-record" aria-labelledby="primary-record-heading"><div class="record-priority">记录此刻 · 约 30 秒</div><h2 id="primary-record-heading">先看看，现在的自己。</h2><p class="control-description">选一种心情，就可以留下记录。其他都可选。</p><div class="weather-options">${A.weather.map(w=>`<button class="weather-choice ${draft.mood===w.mood?'selected':''}" data-studio-weather="${w.mood}" aria-pressed="${draft.mood===w.mood}"><span class="weather-glyph">${GardenArt.weatherIcon(w.mood)}</span><span>${w.name}<small>${w.feeling}</small></span><span class="choice-dot"></span></button>`).join('')}</div><div data-expression-host="studio">${Expression.html('studio')}</div><label class="record-note-label" for="record-note">想说的话 <small>可选</small></label><textarea id="record-note" maxlength="500" rows="3" placeholder="发生了什么？也可以只留下一个词。">${esc(draft.note)}</textarea><details class="more-feelings"><summary>记录能量与需要 <span>选填</span></summary><label class="energy-label" for="island-energy">此刻的能量 <span id="energy-label">${energyName()}</span></label><input type="range" id="island-energy" min="0" max="100" step="10" value="${draft.energy}"><div class="range-ends"><span>想歇一歇</span><span>有点力量</span></div><div class="need-label">我现在需要…</div><div class="need-options">${A.needs.map(n=>`<button data-studio-need="${n}" aria-pressed="${draft.need===n}" class="${draft.need===n?'selected':''}">${n}</button>`).join('')}</div></details><button class="button primary studio-save" data-studio-save ${canSave()?'':'disabled'}>保存这次记录 <span>↗</span></button><p class="control-footnote">文字、照片与语音只保存在此浏览器，不会公开。</p></aside>`;}
 function energyName(){return draft.energy<30?'轻一点':draft.energy>70?'充足一些':'刚刚好';}
 function scene(){return `<div class="landscape" data-weather="${draft.mood||3}"><div class="landscape-top"><span>一座属于自己的小岛</span><button data-studio-motion aria-pressed="${paused}">${paused?'让风景流动':'暂停风景'}</button></div><div class="landscape-description"><span id="weather-title">${draft.mood?weather().name:'此刻，慢慢感受'}</span><p id="weather-line">${draft.mood?weather().line:'天气没有好坏，每一种感受都可以停留。'}</p></div><div class="garden-scene-wrap" id="scene-surface" role="group" aria-label="${esc(stateDescription())}"><div id="scene-pre" class="scene-visual">${GardenArt.render({...draft,mood:draft.mood||3},frame)}</div><div id="object-handles" class="object-hit-layer"></div></div><div class="landscape-bottom"><span>所有天气，都有被留下的意义</span><span>把感受，轻轻放在这里</span></div></div>`;}
 function islandPanel(){return scene()+`<div class="island-actions"><div><span class="studio-kicker">让风景，接住此刻的感受</span><p>你可以先记录，再慢慢照顾自己。</p></div><button class="quiet-button" data-care="breath">呼吸一分钟 →</button></div>`;}
 function sandboxPanel(){return scene()+`<div class="sandbox-toolbar"><div><strong>把心里装着的东西，放到岛上。</strong><p>点选添加，拖动摆放；也可以用方向键移动，Delete 删除。</p></div><div class="sandbox-history"><button data-studio-undo ${undo.length?'':'disabled'}>↶ 撤销摆放</button><button data-studio-clear>清空布景</button></div></div><div class="object-palette">${Object.entries(A.definitions).map(([type,d])=>`<button data-studio-add="${type}" aria-label="添加${d.name}">${GardenArt.icon(type)}<strong>${d.name}</strong><span>${d.meaning}</span></button>`).join('')}</div><div class="selection-tools"><span id="selected-description">${selected?'已选择一个物件，可拖动或用方向键移动。':'物件的意义，由你决定；这里没有标准答案。'}</span><button data-studio-remove ${selected?'':'disabled'}>移除选中物件</button></div><label class="sandbox-caption" for="sandbox-note">这幅风景，对你意味着什么？ <span>可选</span></label><textarea id="sandbox-note" maxlength="500" rows="2" placeholder="比如：我想在那座山旁边，留一盏灯。">${esc(draft.note)}</textarea>`;}
 const prompts=['如果感受是一种天气，此刻是什么样？','此刻，你最想给自己什么？','这片天气，和哪些事情有关？','想留一句话吗？一句也好，留白也好。','这一刻，已经有了自己的模样。'];
 function terminalPanel(){
  let answer='';
  if(talkStep===0)answer=`<div class="terminal-options">${A.weather.map(w=>`<button data-talk-weather="${w.mood}"><span>${GardenArt.weatherIcon(w.mood)}</span>${w.name} / ${w.feeling}</button>`).join('')}</div>`;
  if(talkStep===1)answer=`<div class="terminal-options">${A.needs.map(n=>`<button data-talk-need="${n}">${n}</button>`).join('')}<button data-talk-need="">暂时不知道</button></div>`;
  if(talkStep===2)answer=`<div class="terminal-options">${C.tags.map(t=>`<button data-talk-tag="${t}" aria-pressed="${draft.tags.includes(t)}" class="${draft.tags.includes(t)?'selected':''}">${t}</button>`).join('')}</div><button class="terminal-next" data-talk-next="3">${draft.tags.length?'就这些，继续':'先跳过'} →</button>`;
  if(talkStep===3)answer=`<form id="terminal-form"><label class="sr-only" for="terminal-note">留下一句话，最多 500 字</label><div class="terminal-input-line"><span aria-hidden="true">&gt;</span><textarea id="terminal-note" maxlength="500" rows="3" placeholder="在这里输入，也可以留白。">${esc(draft.note)}</textarea></div><button class="terminal-next" type="submit">${draft.note?'留下这句话':'保留这份留白'} →</button></form>`;
  if(talkStep===4)answer=`<div class="terminal-summary">${GardenArt.weatherIcon(draft.mood||3)} ${weather().name} / ${weather().feeling}<br>${draft.need?'此刻需要：'+esc(draft.need):'还不确定需要什么，也可以。'}<br>${draft.tags.length?'相关情境：'+draft.tags.map(esc).join(' / '):'情境：留白'}</div><div class="terminal-summary-actions"><button class="terminal-next" data-studio-save ${canSave()?'':'disabled'}>保存这次对话 →</button><button data-talk-next="0">再看看我的选择</button></div>`;
  const transcript=[];
  if(talkStep>0&&draft.mood)transcript.push(['天气',weather().name+' · '+weather().feeling]);
  if(talkStep>1)transcript.push(['需要',draft.need||'还不知道']);
  if(talkStep>2&&draft.tags.length)transcript.push(['情境',draft.tags.join(' / ')]);
  if(talkStep>3)transcript.push(['一句话',draft.note||'先留白']);
  return `<section class="feeling-terminal"><div class="terminal-title"><span><i></i><i></i><i></i></span><span>一封写给自己的信</span><span>写给此刻的你</span></div><div class="terminal-body"><div class="terminal-intro"><span>A LETTER TO MYSELF</span><p>这里不要求你表达完整。<br>一小步一小步，看看此刻的自己。</p><small>一步一步感受自己，内容只保存在此浏览器。</small></div><div class="terminal-transcript">${transcript.map(([label,value])=>`<p><span>${label}</span> ${esc(value)}</p>`).join('')}</div><div class="terminal-question"><span>0${talkStep+1} / 05</span><h3>${prompts[talkStep]}</h3></div><div id="terminal-answers">${answer}</div>${talkStep>0&&talkStep<4?`<button class="terminal-back" data-talk-next="${talkStep-1}">← 回到上一步</button>`:''}</div><div class="terminal-footer">你的每一种感受，都值得被温柔对待。 <span class="terminal-cursor" aria-hidden="true">_</span></div></section>`;
 }
 function home(){
  const entries=bridge?bridge.getEntries():[];
  const latest=[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  return `<div class="studio-page"><div class="studio-heading"><div><div class="studio-kicker">MIND ISLAND · A LITTLE SPACE FOR YOU</div><h1>先记录此刻，再照顾自己。</h1><p>心情是开始，文字、照片或声音，都可以接住你。</p></div><div class="studio-edition">慢一点，也很好。<br><span>GENTLE DAYS</span></div></div>${bridge&&bridge.getMode()==='demo'?'<div class="demo-banner"><span>下方回看区为虚构示例。你的新记录会单独保存，草稿不会自动上传。</span><button data-switch-personal>查看我的记录 →</button></div>':''}<div class="studio-tabs" role="tablist" aria-label="选择表达方式"><button id="tab-island" role="tab" aria-controls="studio-panel" data-studio-mode="island" aria-selected="${mode==='island'}"><span>01</span>快速记录<small>今天的主任务</small></button><button id="tab-terminal" role="tab" aria-controls="studio-panel" data-studio-mode="terminal" aria-selected="${mode==='terminal'}"><span>02</span>引导对话<small>需要时再展开</small></button><button id="tab-sandbox" role="tab" aria-controls="studio-panel" data-studio-mode="sandbox" aria-selected="${mode==='sandbox'}"><span>03</span>自由沙盘<small>另一种表达方式</small></button></div><div class="mobile-weather-strip" aria-label="选择此刻的天气">${A.weather.map(w=>`<button data-studio-weather="${w.mood}" aria-pressed="${draft.mood===w.mood}" class="${draft.mood===w.mood?"selected":""}"><span>${GardenArt.weatherIcon(w.mood)}</span>${w.name}</button>`).join('')}</div><div class="studio-layout"><div id="studio-panel" class="studio-panel" role="tabpanel" aria-labelledby="tab-${mode}">${mode==='terminal'?terminalPanel():mode==='sandbox'?sandboxPanel():islandPanel()}</div>${controls()}</div><div id="studio-status" class="studio-status" role="status" aria-live="polite">${draft.mood?'切换表达方式，会保留这一份草稿。':'先选一片天气，或者切换到终端，让问题陪你慢慢表达。'}</div><section class="weather-memory"><div class="memory-heading"><div><span class="studio-kicker">THE LITTLE DAYS WE KEEP</span><h2>把已记录的时刻，留给以后回看。</h2></div><button class="text-button" data-go="journal">打开天气标本集 →</button></div><div class="memory-grid">${latest.length?latest.map(e=>`<button class="memory-card mini-entry" data-studio-view="${esc(e.id)}"><div><span>${new Date(e.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}</span><strong>${A.weather[e.mood-1].name}</strong></div>${GardenArt.render(e,0)}<p>${esc(e.note||Expression.summary(e)||'没有写字，也留下了一种感受。')}</p><span class="memory-open">打开这片天气 ↗</span></button>`).join(''):'<div class="memory-empty">还没有收藏的天气。<br>今天的这一片，就可以是开始。</div>'}</div></section><div class="studio-bottom"><span>天气没有好坏，你也不必每天晴朗。</span><button data-new-entry>也可以只写一句话 →</button></div></div>`;
 }
 function stop(){clearInterval(timer);timer=null;drag=null;}
 function mount(){
  stop();
  if(!$('#studio-panel'))return;
  syncHandles();draw();Expression.mount();
  if(!paused&&mode!=='terminal')timer=setInterval(()=>{if(!document.hidden&&$('#scene-pre')){frame++;paint();}},1000);
 }
 function repaint(){bridge.render();}
 function paint(){const pre=$('#scene-pre');if(pre)pre.innerHTML=GardenArt.render({...draft,mood:draft.mood||3},frame);}
 function draw(){
  paint();const surface=$('#scene-surface');if(surface)surface.setAttribute('aria-label',stateDescription());
  document.querySelectorAll('[data-studio-weather]').forEach(b=>{const active=Number(b.dataset.studioWeather)===draft.mood;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-studio-need]').forEach(b=>{const active=b.dataset.studioNeed===draft.need;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  const title=$('#weather-title'),line=$('#weather-line'),energy=$('#energy-label');
  if(title)title.textContent=draft.mood?weather().name:'此刻，慢慢感受';if(line)line.textContent=draft.mood?weather().line:'先看一会儿，也可以。';if(energy)energy.textContent=energyName();
  const landscape=$('.landscape');if(landscape)landscape.dataset.weather=draft.mood||3;
  document.querySelectorAll('[data-studio-save]').forEach(b=>b.disabled=!canSave());
  document.querySelectorAll('[data-studio-undo]').forEach(b=>b.disabled=!undo.length);
  document.querySelectorAll('[data-studio-remove]').forEach(b=>b.disabled=!selected);
 }
 function remember(){undo.push(clone(draft.scene));if(undo.length>30)undo.shift();}
 function syncHandles(){
  const layer=$('#object-handles');if(!layer)return;
  layer.innerHTML=mode==='sandbox'?draft.scene.objects.map(o=>{const d=A.definitions[o.type];return `<button class="object-handle ${selected===o.id?'selected':''}" data-token-id="${o.id}" aria-label="${d.name}，可拖动或用方向键移动，Delete 删除" style="left:${o.x/A.W*100}%;top:${o.y/A.H*100}%;width:${Math.max(...d.art.map(s=>s.length))/A.W*100}%;height:${d.art.length/A.H*100}%"></button>`;}).join(''):'';
 }
 function positionHandle(o){const b=document.querySelector('[data-token-id="'+o.id+'"]');if(b){b.style.left=o.x/A.W*100+'%';b.style.top=o.y/A.H*100+'%';}}
 function selectObject(id){selected=id;document.querySelectorAll('[data-token-id]').forEach(b=>b.classList.toggle('selected',b.dataset.tokenId===id));const label=$('#selected-description');const o=draft.scene.objects.find(o=>o.id===id);if(label&&o)label.textContent='已选「'+A.definitions[o.type].name+'」：拖动或用方向键移动，Delete 删除。';draw();}
 function moveObject(o,x,y){const clean=A.sanitizeScene({objects:[{...o,x,y}]}).objects[0];if(clean){o.x=clean.x;o.y=clean.y;positionHandle(o);draw();}}
 function addObject(type){
  if(!Object.hasOwn(A.definitions,type))return;
  if(draft.scene.objects.length>=12){bridge.notify('一幅风景最多放 12 个物件，可以先移除一个，给新的感受留一点空间。');return;}
  remember();const count=draft.scene.objects.length;
  const o={id:'object-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type,x:20+(count*9)%35,y:11+(count%3)*3};
  draft.scene.objects.push(o);draft.scene=A.sanitizeScene(draft.scene);selected=o.id;
  syncHandles();draw();document.querySelector('[data-token-id="'+o.id+'"]')?.focus();status('放下了一'+(type==='lamp'?'盏':'个')+A.definitions[type].name+'。可以拖动或用方向键移动它。');
 }
 function removeObject(){if(!selected)return;remember();draft.scene.objects=draft.scene.objects.filter(o=>o.id!==selected);selected=null;syncHandles();draw();status('已移除，可以撤销这次摆放。');}
 function setMode(next){
  mode=next;if(mode==='terminal')talkStep=draft.mood?1:0;
  repaint();document.querySelector('[data-studio-mode="'+next+'"]')?.focus();
 }
 function refreshTalk(){const panel=$('#studio-panel');if(panel){panel.innerHTML=terminalPanel();draw();const first=panel.querySelector('button,textarea');if(first)first.focus({preventScroll:true});}status(prompts[talkStep]);}
 function save(){
  if(!draft.mood){status('先选一片最接近此刻感受的天气吧。');return;}
  if(!canSave())return;
  const moment=A.normalizeEntry({...clone(draft),source:mode});
  const stamp=fingerprint();
  if(bridge.saveMoment(moment)===false)return;
  savedFingerprint=stamp;
  status('这片天气已留下。继续改变草稿，可以再记录一个新的时刻。');
  draw();
 }
 function showEntry(id){
  const e=bridge.getEntries().find(e=>e.id===id);if(!e)return;
  const personal=bridge.getMode()==='personal';
  const dialog=$('#studio-dialog');
  const source={island:'小岛速记',terminal:'引导对话',sandbox:'自由沙盘'}[e.source]||'情绪记录';
  dialog.innerHTML=`<div class="dialog-head"><div><span class="studio-kicker">[ WEATHER SPECIMEN ]</span><h2 id="studio-dialog-title">${new Date(e.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})} · ${A.weather[e.mood-1].name}</h2></div><button class="icon-button" data-close aria-label="关闭天气标本">×</button></div><p class="specimen-meta">${source}${e.need?' / 需要'+esc(e.need):''}${Number.isFinite(e.energy)?' / 能量 '+e.energy+'%':''}</p><div class="postcard-world" role="img" aria-label="${esc(A.description(e).replace('字符',''))}">${GardenArt.render(e,0)}</div>${Expression.view(e)}<p class="postcard-note">${esc(e.note||'这一刻，没有写字也没有关系。')}</p><div class="entry-tags">${e.tags.map(t=>'<span class="tag">'+esc(t)+'</span>').join('')}</div><div class="dialog-actions">${personal?`<button class="button secondary" data-studio-download="${esc(e.id)}">导出风景插画</button>`:'<span class="specimen-meta">虚构示例 · 不属于你的记录</span>'}<button class="button primary" data-studio-continue="${esc(e.id)}">${personal?"从这里再出发":"借这幅布景试试"} →</button></div><p class="chart-note">${personal?"继续摆放会生成一份新草稿，原来的记录会保留。":"只借用小岛布景；示例文字与情境不会带入你的草稿。"}</p>`;
  dialog.showModal();Expression.mount(dialog);
 }
 function continueEntry(id){
  const e=bridge.getEntries().find(e=>e.id===id);if(!e)return;
  Expression.resetContext('studio');
  const clean=C.normalizeExtras(A.normalizeEntry(e)),personal=bridge.getMode()==='personal';
  draft={mood:e.mood,energy:clean.energy??50,need:personal?(clean.need||''):'',tags:personal?[...e.tags]:[],note:personal?e.note:'',scene:clean.scene?clone(clean.scene):{version:1,objects:A.defaultObjects()}};
  draft.emotionWords=personal?[...clean.emotionWords]:[];draft.attachments=personal?[...clean.attachments]:[];
  mode='sandbox';savedFingerprint='';undo=[];selected=null;$('#studio-dialog').close();bridge.navigate('home');status(personal?'这是一份新草稿，原来的天气已经好好收藏。':'借用了示例布景，文字与情境已经留白。你可以重新赋予它意义。');
 }
 function downloadEntry(id){
  const e=bridge.getEntries().find(e=>e.id===id);if(!e||bridge.getMode()!=='personal')return;
  const blob=new Blob([GardenArt.postcard(e)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='心屿-风景插画-'+C.dayKey(e.date)+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);bridge.notify('风景插画已生成，只包含你主动导出的这条记录。');
 }
 document.addEventListener('click',event=>{
  if(!bridge)return;const b=event.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.studioMode)setMode(d.studioMode);
  else if(d.studioWeather){draft.mood=Number(d.studioWeather);draw();status(weather().line);}
  else if('studioNeed' in d){draft.need=draft.need===d.studioNeed?'':d.studioNeed;draw();}
  else if('studioSave' in d)save();
  else if('studioMotion' in d){paused=!paused;b.setAttribute('aria-pressed',String(paused));b.textContent=paused?'▶ 让风景流动':'Ⅱ 暂停动态';mount();}
  else if(d.studioAdd)addObject(d.studioAdd);
  else if('studioUndo' in d){if(undo.length){draft.scene=undo.pop();selected=null;syncHandles();draw();status('恢复了上一步的风景。');}}
  else if('studioClear' in d){if(draft.scene.objects.length){remember();draft.scene={version:1,objects:[]};selected=null;syncHandles();draw();status('留下一片空地，也是一种表达。可以撤销。');}}
  else if('studioRemove' in d)removeObject();
  else if(d.studioView)showEntry(d.studioView);
  else if(d.studioContinue)continueEntry(d.studioContinue);
  else if(d.studioDownload)downloadEntry(d.studioDownload);
  else if(d.tokenId)selectObject(d.tokenId);
  else if(d.talkWeather){draft.mood=Number(d.talkWeather);talkStep=1;refreshTalk();}
  else if('talkNeed' in d){draft.need=d.talkNeed;talkStep=2;refreshTalk();}
  else if(d.talkTag){draft.tags=draft.tags.includes(d.talkTag)?draft.tags.filter(t=>t!==d.talkTag):[...draft.tags,d.talkTag];const active=draft.tags.includes(d.talkTag);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));const next=$('[data-talk-next="3"]');if(next)next.textContent=(draft.tags.length?'就这些，继续':'先跳过')+' →';draw();}
  else if('talkNext' in d){talkStep=Math.max(0,Math.min(4,Number(d.talkNext)));refreshTalk();}
 });
 document.addEventListener('input',event=>{
  if(['record-note','island-note','sandbox-note','terminal-note'].includes(event.target.id)){draft.note=event.target.value;for(const id of ['record-note','sandbox-note','terminal-note']){const peer=document.getElementById(id);if(peer&&peer!==event.target)peer.value=draft.note;}draw();}
  else if(event.target.id==='island-energy'){draft.energy=Number(event.target.value);draw();}
 });
 document.addEventListener('submit',event=>{if(event.target.id==='terminal-form'){event.preventDefault();talkStep=4;refreshTalk();}});
 document.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('[data-token-id]');if(!handle||mode!=='sandbox')return;
  const o=draft.scene.objects.find(o=>o.id===handle.dataset.tokenId),surface=$('#scene-surface');if(!o||!surface)return;
  event.preventDefault();handle.focus();selectObject(o.id);
  const rect=surface.getBoundingClientRect();drag={id:o.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:o.x,y:o.y,rect,before:clone(draft.scene),moved:false};
  surface.setPointerCapture(event.pointerId);
 });
 document.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  const dx=Math.round((event.clientX-drag.startX)/drag.rect.width*A.W),dy=Math.round((event.clientY-drag.startY)/drag.rect.height*A.H);
  if(!drag.moved&&(dx||dy)){undo.push(drag.before);if(undo.length>30)undo.shift();drag.moved=true;}
  const o=draft.scene.objects.find(o=>o.id===drag.id);if(o)moveObject(o,drag.x+dx,drag.y+dy);
 });
 function release(event){if(drag&&event.pointerId===drag.pointerId){const surface=$('#scene-surface');if(surface?.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);if(drag.moved)status('位置已改变，保存后会和这片天气一起留下。');drag=null;}}
 document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);
 document.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-studio-mode]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const modes=['island','terminal','sandbox'],index=modes.indexOf(tab.dataset.studioMode);setMode(event.key==='Home'?modes[0]:event.key==='End'?modes[2]:modes[(index+(event.key==='ArrowRight'?1:2))%3]);return;}
  const handle=event.target.closest('[data-token-id]');if(!handle)return;
  const o=draft.scene.objects.find(o=>o.id===handle.dataset.tokenId);if(!o)return;selected=o.id;
  if(['Delete','Backspace'].includes(event.key)){event.preventDefault();removeObject();return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(delta){event.preventDefault();remember();const step=event.shiftKey?3:1;moveObject(o,o.x+delta[0]*step,o.y+delta[1]*step);status('已移动'+A.definitions[o.type].name+'，方向键可继续调整。');}
 });
 window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){paused=true;if($('#studio-panel'))repaint();}});
 window.addEventListener('pagehide',stop);
 window.IslandStudio={getExtras(){return {emotionWords:draft.emotionWords||[],attachments:draft.attachments||[]};},setExtras(next){Object.assign(draft,next);draw();},refresh:draw,reset(){Expression.resetContext('studio');stop();draft={mood:null,energy:50,need:'',tags:[],note:'',scene:{version:1,objects:A.defaultObjects()}};undo=[];selected=null;savedFingerprint='';talkStep=0;mode='island';},connect(value){bridge=value;},home,mount,stop,showEntry,thumbnail(e){return '<button class="journal-landscape" data-studio-view="'+esc(e.id)+'" aria-label="打开'+A.weather[e.mood-1].name+'的天气标本">'+GardenArt.render(e,0)+'<span>'+A.weather[e.mood-1].name+' / 打开这片天气 ↗</span></button>';}};
})();

