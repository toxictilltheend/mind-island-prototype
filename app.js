/* Mind Island: a private, browser-local interactive prototype. */
(() => {
  'use strict';
  const C = window.MindCore;
  const $ = (s, root = document) => root.querySelector(s);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const STORAGE = 'mind-island.v1';
  const FEEDBACK = ['有帮助', '一般', '不适合'];
  let storageIssue = '';
  let entries = [], feedback = [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.entries)) throw new Error('Invalid local data');
      entries = saved.entries.filter(C.validateEntry);
      feedback = Array.isArray(saved.feedback) ? saved.feedback.filter(f => f && ['breath','sound','move'].includes(f.type) && FEEDBACK.includes(f.value) && Number.isFinite(new Date(f.date).getTime())).slice(-200) : [];
      if (entries.length !== saved.entries.length) storageIssue = '部分本地记录格式异常，已跳过显示。请先导出可读取的记录。';
    }
  } catch {
    storageIssue = '无法读取本地记录。当前操作只保留在本次会话中；请导出备份。';
  }
  let memoryOnly = Boolean(storageIssue);
  let page = ['home','journal','insights','care'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  let mode = entries.length ? 'personal' : 'demo';
  let days = 7;
  let selectedMood = null, formMood = null, formTags = [], editingId = null;
  let session = null, sessionInterval = null, audio = null;
  let toastTimeout = null;
  const demo = C.demoEntries();
  const activeEntries = () => mode === 'demo' ? demo : entries;
  const sortedEntries = () => [...activeEntries()].sort((a,b) => new Date(b.date)-new Date(a.date));

  function saveData() {
    if (memoryOnly) return false;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({version:1,entries,feedback}));
      return true;
    } catch {
      memoryOnly = true;
      storageIssue = '浏览器暂时无法保存数据，修改仅保留在本次会话中。请及时导出记录。';
      return false;
    }
  }
  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 4500);
  }
  function face(value, extraClass='') {
    const m = C.moods.find(m => m.value === value) || C.moods[2];
    return `<svg class="face ${extraClass}" viewBox="0 0 48 48" aria-hidden="true"><circle class="face-fill" cx="24" cy="24" r="22" fill="${m.color}" fill-opacity=".23"/><circle cx="24" cy="24" r="20" stroke="${m.color}" fill="none"/><path d="M17 17v2m14-2v2" stroke="#687263"/><path d="${m.face}" stroke="#687263" fill="${value===5?'#687263':'none'}"/></svg>`;
  }
  function moodButtons(selected, context) {
    return C.moods.map(m => `<button type="button" class="mood-choice ${selected===m.value?'selected':''}" data-${context}-mood="${m.value}" aria-pressed="${selected===m.value}">${face(m.value)}<span>${m.name}</span></button>`).join('');
  }
  function prettyDate(date, full = false) {
    return new Date(date).toLocaleString('zh-CN', {month:'long',day:'numeric',...(full?{hour:'2-digit',minute:'2-digit'}:{})});
  }
  function empty(message='你还没有留下记录。', action=true) {
    return `<div class="empty-state">${icon('book')}<h3>从一个小小的记录开始</h3><p>${message}<br>不需要写得完整，点选心情也可以。</p>${action?`<button class="button primary" data-new-entry>${icon('plus')}记录此刻</button>`:''}</div>`;
  }
  function banner() {
    return mode==='demo'?`<div class="demo-banner"><span>正在查看虚构示例，与你的私人记录分开。</span><button data-switch-personal>开始我的记录 →</button></div>`:'';
  }
  function heading(title, description, eyebrow, button='') {
    return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div>${button||'<span class="heading-aside">a little space for yourself</span>'}</div>`;
  }
  function segments() {
    return `<div class="segments" aria-label="查看时间范围"><button class="segment ${days===7?'active':''}" data-days="7" aria-pressed="${days===7}">近 7 天</button><button class="segment ${days===30?'active':''}" data-days="30" aria-pressed="${days===30}">近 30 天</button></div>`;
  }
  function chart(summary) {
    const width=520, height=160, left=42, right=12, top=12, bottom=30;
    const xs = i => left+i*(width-left-right)/Math.max(summary.points.length-1,1);
    const ys = value => top+(5-value)*(height-top-bottom)/4;
    let svg = [1,3,5].map((value,i) => `<line x1="${left}" x2="${width-right}" y1="${ys(value)}" y2="${ys(value)}" stroke="#e7eadd" stroke-dasharray="3 5"/><text x="0" y="${ys(value)+4}">${['低落','平静','开心'][i]}</text>`).join('');
    let previous = null;
    summary.points.forEach((p,i) => {
      const x=xs(i);
      if (p.value !== null) {
        const y=ys(p.value);
        if (previous) svg+=`<line x1="${previous.x}" y1="${previous.y}" x2="${x}" y2="${y}" stroke="#9aaf86" stroke-width="2.5"/>`;
        svg+=`<circle cx="${x}" cy="${y}" r="4" fill="#fffefb" stroke="#8fa77c" stroke-width="2"><title>${p.label}：平均感受 ${p.value.toFixed(1)} / 5</title></circle>`;
        previous={x,y};
      } else previous=null;
      if (summary.points.length===7 || i%5===0 || i===summary.points.length-1) svg+=`<text x="${x}" y="${height-7}" text-anchor="${i===0?'start':i===summary.points.length-1?'end':'middle'}">${p.label}</text>`;
    });
    if (!summary.count) svg+=`<text x="${width/2+10}" y="76" text-anchor="middle">还没有记录，变化会从这里慢慢出现</text>`;
    const textSummary=summary.points.filter(p=>p.value!==null).map(p=>`${p.label} ${p.value.toFixed(1)}/5`).join('；');
    return `<div class="chart-wrap"><svg class="mood-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(textSummary||'尚无情绪记录')}">${svg}</svg></div><p class="chart-note">每日点位为当天记录的平均感受，缺失日期不补值。仅呈现你记录的片段，不是心理健康评分。</p>`;
  }
  function miniEntries() {
    const latest=sortedEntries().slice(0,3);
    if (!latest.length) return `<p class="muted" style="margin-top:20px">还没有记录，今天可以从一个感受开始。</p>`;
    return `<div class="recent-list">${latest.map(e=>`<div class="mini-entry">${face(e.mood)}<div class="entry-preview"><h3><time>${prettyDate(e.date)}</time>${C.moods[e.mood-1].name}</h3><p>${escape(e.note||'为此刻的感受留了一个位置。')}</p></div></div>`).join('')}</div>`;
  }
  const art = `<svg class="island-art" viewBox="0 0 200 220" aria-hidden="true"><path d="M-10 207c36-53 113-64 228-31v44H-10" fill="#ccd7b5"/><path d="M0 220c50-45 125-41 210-7" fill="#b8c9a0"/><path d="M124 191c-5-38-3-79 1-117" stroke="#8e9b72" stroke-width="3" fill="none"/><path d="M126 106C89 91 89 57 103 48c30 4 43 32 23 58" fill="#a0b487"/><path d="M127 133c-3-35 17-58 44-55 10 28-9 54-44 55" fill="#b5c49a"/><path d="M125 163c-34-3-54-24-48-48 32-5 53 18 48 48" fill="#a5b98b"/><circle cx="64" cy="55" r="26" fill="#f0e9c8"/><path d="M15 144c17-8 38-8 52 2" stroke="#c6d1b1" stroke-width="2" fill="none"/></svg>`;
  function homeView() {
    const summary=C.summarize(activeEntries(),days);
    const rec=C.recommend(activeEntries());
    return heading('今天，也照顾一下自己。','无论此刻是什么感受，你都可以在这里停留。','YOUR DAILY PAUSE')+banner()+
    `<div class="home-grid"><div class="main-column">
      <section class="card checkin-card"><div class="card-header"><h2 class="checkin-title">此刻，你的心情怎么样？</h2><span class="small-label">与自己相处 30 秒</span></div><p class="card-subtitle">每一种情绪，都值得被好好看见。</p><div class="mood-row">${moodButtons(selectedMood,'quick')}</div><div class="checkin-bottom"><p>不用想太多，跟随此刻的感受就好。</p><button class="button primary" data-new-entry>记录此刻 ${icon('arrow')}</button></div></section>
      <section class="card"><div class="card-header"><h2>情绪的晴与雨</h2>${segments()}</div><p class="card-subtitle">已记录 ${summary.recordedDays} 天，留意那些细微的变化。</p>${chart(summary)}<button class="text-button" data-go="insights">看看我的情绪洞察 ${icon('arrow')}</button></section>
      <section class="card"><div class="card-header"><h2>最近的小小记录</h2><button class="text-button" data-go="journal">全部日记 ${icon('arrow')}</button></div>${miniEntries()}</section>
    </div><aside class="side-column"><section class="card hero-quote"><span class="eyebrow">A GENTLE REMINDER</span><h2>不必时刻晴朗，<br>阴天也有它的温柔。</h2><p>允许自己，按照自己的节奏生长。</p>${art}</section>
      <section class="card breath-preview"><span class="eyebrow">YOUR LITTLE MOMENT</span><div class="breath-orb">${icon(rec.type==='sound'?'wave':rec.type==='move'?'move':'leaf')}</div><h3>${rec.type==='sound'?'听一会儿，慢下来':rec.type==='move'?'让身体，轻轻动一动':'停一下，深呼吸'}</h3><p>${rec.reason}</p><button class="button" data-care="${rec.type}">开始一个小练习 ${icon('arrow')}</button><span class="duration">可随时结束 · 不必完成任务</span></section>
    </aside></div>`;
  }
  function journalView() {
    const list=sortedEntries();
    return heading('给感受，一个安放的地方。','这里装着你的日常，也装着慢慢认识自己的过程。','LITTLE NOTES, REAL FEELINGS',`<button class="button primary" data-new-entry>${icon('plus')}写一条日记</button>`)+banner()+
    `<div class="page-tools"><span>共 ${list.length} 条${mode==='demo'?'示例':''}记录</span><span>按记录时间倒序</span></div>`+
    (list.length?`<div class="journal-grid">${list.map(e=>`<article class="card journal-entry"><div class="entry-top">${face(e.mood)}<div><h3>${C.moods[e.mood-1].name}</h3><time datetime="${escape(e.date)}">${prettyDate(e.date,true)}</time></div></div><p class="note">${escape(e.note||'这一刻，先记下感受就足够了。')}</p><div class="entry-tags">${e.tags.map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</div>${mode==='personal'?`<div class="entry-actions"><button data-edit="${escape(e.id)}">编辑</button><button class="delete" data-delete="${escape(e.id)}">删除</button></div>`:'<div class="entry-actions"><span class="subtle-link">虚构示例 · 不属于你的记录</span></div>'}</article>`).join('')}</div>`:`<section class="card">${empty()}</section>`);
  }
  function insightsView() {
    const s=C.summarize(activeEntries(),days);
    const top=s.factors[0];
    return heading('看见情绪，也看见自己。','从记录中寻找线索，用好奇代替评判。','NOTICE YOUR OWN RHYTHM')+banner()+
      `<div class="page-tools"><span>关于最近 ${days} 天的记录</span>${segments()}</div><div class="stats-row"><section class="card stat-card"><p>留下的情绪记录</p><strong>${s.count}<small> 条</small></strong><small>每一条都是看见自己的开始</small></section><section class="card stat-card"><p>有记录的日子</p><strong>${s.recordedDays}<small> 天</small></strong><small>不用每天来，也不会断签</small></section><section class="card stat-card"><p>最常提到的情境</p><strong style="font-family:inherit;font-size:25px">${top?escape(top[0]):'待发现'}</strong><small>${top?`${s.count} 条记录中出现 ${top[1]} 次`:'记录之后慢慢了解'}</small></section></div>
      <div class="insights-grid"><section class="card"><div class="card-header"><h2>情绪变化</h2><span class="small-label">${mode==='demo'?'示例数据':'我的记录'}</span></div>${chart(s)}</section><section class="card"><h2 style="font-size:16px">哪些情境经常出现？</h2><p class="card-subtitle">仅统计你主动选择的标签</p>${s.factors.length?s.factorDetails.map(({tag,count,tired,calm,pleasant})=>`<div class="factor-row"><div class="factor-caption"><span>${escape(tag)}</span><span>${count} / ${s.count} 条</span></div><div class="factor-track"><span style="width:${count/s.count*100}%"></span></div><p class="factor-detail">低落 / 有点累 ${tired} 条 · 平静 ${calm} 条 · 还不错 / 很开心 ${pleasant} 条</p></div>`).join(''):'<p class="muted" style="margin-top:25px">还没有情境标签，下次记录时可以试着选一个。</p>'}<p class="chart-note" style="margin-top:20px">同一条记录可以包含多个情境，比例之和可能超过 100%。</p></section></div>
      <div class="insight-explainer">${top?`在你最近 ${days} 天的 ${s.count} 条记录中，「${escape(top[0])}」出现了 ${top[1]} 次。你可以回看这些日记，留意当时发生了什么，以及自己需要什么。`:'数据还少时，不急着下结论。先从记录一些日常开始，也欢迎记下轻松或开心的时刻。'}<br>情境同时出现，不代表它导致了某种情绪；这些线索不能用于诊断。</div>`;
  }
  const careItems = {
    breath:{title:'一分钟呼吸',desc:'跟随缓慢的节奏，把注意力轻轻带回当下。',icon:'leaf',meta:'1 分钟 · 无需闭眼'},
    sound:{title:'一片舒缓声景',desc:'柔和的沙沙声与轻音，让外界暂时安静一点。',icon:'wave',meta:'5 分钟 · 主动开启声音'},
    move:{title:'给身体一点空间',desc:'三个简单的小动作，松一松紧绷的身体。',icon:'move',meta:'约 2 分钟 · 按舒适程度进行'}
  };
  function careView() {
    const rec=C.recommend(activeEntries());
    return heading('照顾自己，从一个小行动开始。','无需立刻变好，找到此刻适合自己的方式就足够。','SMALL ACTS OF KINDNESS')+banner()+
      `<section class="care-intro">${icon('sun')}<div><h3>为此刻的你，留一点时间</h3><p>${rec.reason} 推荐来自简单的记录规则，你可以自由选择其他方式。</p></div></section><div class="care-grid">${Object.entries(careItems).map(([key,item])=>`<article class="card care-card"><div class="care-art ${key}">${icon(item.icon)}</div><h3>${item.title}</h3><p>${item.desc}</p><button class="button ${rec.type===key?'primary':'secondary'}" data-care="${key}">开始练习 ${icon('arrow')}</button><span class="care-meta">${item.meta}</span></article>`).join('')}</div><p class="care-reminder">练习不适合每一个时刻。你可以随时停止，或只是坐一会儿。呼吸练习保持自然呼吸、不屏息，出现不适请停止；轻活动以身体舒适为限。<br>这些是日常自我关怀工具，不提供诊断或治疗；如果困扰持续加重或影响生活，可以考虑寻求专业支持。</p>`;
  }
  function render() {
    const main=$('#main-content');
    main.innerHTML=(storageIssue?`<div class="storage-warning" role="status">${escape(storageIssue)}</div>`:'')+({home:homeView,journal:journalView,insights:insightsView,care:careView}[page])();
    $('#mode-toggle').textContent=mode==='demo'?'示例体验 · 切换我的记录':'我的记录 · 查看示例';
    $('.local-badge').innerHTML=icon('lock')+(memoryOnly?'仅本次会话':'仅存于此浏览器');
    document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  }
  function navigate(next) {
    page=next;
    history.replaceState(null,'',`#${page}`);
    render();
    window.scrollTo({top:0,behavior:'auto'});
    $('#main-content').focus({preventScroll:true});
  }
  function switchMode(next) {mode=next;selectedMood=null;render();}
  function renderFormMoods() {$('#form-moods').innerHTML=moodButtons(formMood,'form');}
  function renderFormTags() {$('#form-tags').innerHTML=C.tags.map(t=>`<button type="button" class="tag-option ${formTags.includes(t)?'selected':''}" data-form-tag="${t}" aria-pressed="${formTags.includes(t)}">${t}</button>`).join('');}
  function openEntry(id=null) {
    const entry=id?entries.find(e=>e.id===id):null;
    editingId=entry?entry.id:null;
    formMood=entry?entry.mood:selectedMood;
    formTags=entry?[...entry.tags]:[];
    $('#entry-title').textContent=entry?'重新看看那一刻的感受':'此刻，你的心情怎么样？';
    $('#entry-note').value=entry?entry.note:'';
    $('#note-count').textContent=$('#entry-note').value.length;
    $('#form-error').textContent='';
    $('#entry-hint').textContent=mode==='demo'?'保存后会进入你的私人记录，示例不会混入。记录保存在浏览器中，共用设备请注意隐私。':'只保存在当前浏览器。共用设备请注意隐私，清除浏览器数据会丢失记录。';
    renderFormMoods();renderFormTags();
    $('#entry-dialog').showModal();
  }
  function deleteEntry(id) {
    if (!entries.some(e=>e.id===id)) return;
    if (!window.confirm('删除这条日记？删除后无法恢复。')) return;
    entries=entries.filter(e=>e.id!==id);
    const persisted=saveData();render();
    notify(persisted?'这条日记已删除。':'已从当前会话移除；浏览器保存失败，旧记录可能仍在。');
  }
  function openInfo(title,body) {
    $('#info-dialog-body').innerHTML=`<div class="dialog-head"><div><span class="eyebrow">YOUR SAFE SPACE</span><h2 id="info-title">${title}</h2></div><button class="icon-button" data-close aria-label="关闭">×</button></div>${body}`;
    $('#info-dialog').showModal();
  }
  function dataPanel() {
    openInfo('你的记录，属于你自己。',`<div class="info-copy"><p>这个网站和源代码公开，但你填写的日记仅保存在当前浏览器中，不会上传 GitHub，也不会发送给 AI 或其他服务。</p><p><strong>请留意：</strong>本地记录未加密，共用设备的其他使用者可能看到；更换浏览器或清除浏览器数据后，记录不会跟随你。建议定期导出。</p><p>目前有 ${entries.length} 条私人日记、${feedback.length} 条练习反馈。虚构示例不计入，也不会导出。</p>${storageIssue?`<p>${escape(storageIssue)}</p>`:''}</div><div class="data-actions"><button class="button secondary" id="export-data">导出私人记录</button><button class="button danger" id="clear-data">清空私人数据</button></div>`);
  }
  function exportData() {
    if (!entries.length&&!feedback.length) {notify('目前还没有私人记录。示例数据不会导出。');return;}
    const blob=new Blob([JSON.stringify({app:'心屿',version:1,exportedAt:new Date().toISOString(),entries,feedback},null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url;a.download=`心屿-私人记录-${C.dayKey(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('已生成私人记录备份，请妥善保存下载文件。');
  }
  function clearData() {
    if (!window.confirm('清空此浏览器中的全部私人日记和练习反馈？此操作无法撤销，建议先导出。')) return;
    try {localStorage.removeItem(STORAGE);entries=[];feedback=[];memoryOnly=false;storageIssue='';mode='personal';$('#info-dialog').close();render();notify('此浏览器中的私人数据已清空。');}
    catch {notify('浏览器未允许清空数据，请使用浏览器设置清除本站数据。');}
  }
  function stopResources() {
    clearInterval(sessionInterval);sessionInterval=null;
    if (audio) {const context=audio;audio=null;context.close().catch(()=>{});}
  }
  function openCare(type) {
    stopResources();
    const item=careItems[type];
    if (!item) return;
    session={type,started:false,finished:false,startTime:null,duration:type==='breath'?60:type==='sound'?300:120};
    $('#care-dialog-body').innerHTML=`<div class="dialog-head"><div><span class="eyebrow">A LITTLE CARE FOR YOU</span><h2 id="care-title">${item.title}</h2></div><button class="icon-button" data-close aria-label="关闭练习">×</button></div><div class="session-center">${type==='breath'?'<div class="session-orb" id="session-orb"><strong id="breath-label">准备好了</strong><span>按舒适节奏呼吸</span></div>':type==='sound'?'<div class="sound-wave" id="sound-wave" aria-hidden="true">'+Array(13).fill('<i></i>').join('')+'</div>':'<ol class="move-steps"><li>让双脚落地，留意脚下的支撑，慢慢放松肩膀。</li><li>在舒适范围内，轻轻舒展手臂和肩颈；不需要拉到很紧。</li><li>如果方便，起身走几步，看看窗外，给自己一点空间。</li></ol>'}<p class="muted">${type==='breath'?'跟随 4 秒吸气、6 秒呼气的提示，也可以按自己的自然节奏。无需屏息或深吸气，不舒服时请随时停止。':type==='sound'?'这里播放的是浏览器本地合成的柔和声景。请先调低设备音量，点击下方按钮才会播放。':'动作以身体舒适为限，也可以保持坐姿完成。任何不适，都可以停下来。'}</p><div class="time-display" id="session-time">${type==='breath'?'1 分钟':type==='sound'?'5 分钟':'约 2 分钟'} · 随时可以结束</div><button class="button primary" id="session-action">${type==='sound'?'开启声景':'开始练习'}</button><div id="session-feedback"></div></div>`;
    $('#care-dialog').showModal();
  }
  async function startSound() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if (!Audio) throw new Error('Audio unavailable');
    const context=new Audio();audio=context;
    await context.resume();
    if (audio!==context || !session || session.finished || !$('#care-dialog').open) {await context.close().catch(()=>{});return false;}
    const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const channel=buffer.getChannelData(0);let last=0;
    for(let i=0;i<channel.length;i++){last=(last+Math.random()*0.04-0.02)/1.02;channel[i]=last*3.5;}
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;
    const volume=context.createGain();volume.gain.value=0;volume.gain.linearRampToValueAtTime(.12,context.currentTime+2);
    source.connect(filter).connect(volume).connect(context.destination);source.start();
    [220,330].forEach(freq=>{const osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=freq;gain.gain.value=.006;osc.connect(gain).connect(context.destination);osc.start();});
    return true;
  }
  async function startSession() {
    if (!session) return;
    if (session.started) {finishSession();return;}
    const button=$('#session-action');button.disabled=true;
    if (session.type==='sound') {
      try {if (!(await startSound())) return;}
      catch {stopResources();button.disabled=false;notify('当前浏览器无法播放声音，可以换一个练习。');return;}
    }
    if (!session || !$('#care-dialog').open) return;
    session.started=true;session.startTime=performance.now();
    button.disabled=false;button.textContent='结束练习';
    if ($('#sound-wave')) $('#sound-wave').classList.add('playing');
    tickSession();sessionInterval=setInterval(tickSession,250);
  }
  function tickSession() {
    if (!session || session.finished) return;
    const elapsed=(performance.now()-session.startTime)/1000;
    const left=Math.max(0,Math.ceil(session.duration-elapsed));
    $('#session-time').textContent=`剩余 ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} · 随时可以结束`;
    if (session.type==='breath') {
      const inhale=elapsed%10<4;
      $('#breath-label').textContent=inhale?'轻轻吸气':'慢慢呼气';
      $('#session-orb').classList.toggle('inhale',inhale);$('#session-orb').classList.toggle('exhale',!inhale);
    }
    if (left===0) finishSession();
  }
  function finishSession() {
    if (!session || session.finished) return;
    stopResources();session.finished=true;
    if ($('#sound-wave')) $('#sound-wave').classList.remove('playing');
    if ($('#breath-label')) $('#breath-label').textContent='谢谢自己';
    if ($('#session-orb')) $('#session-orb').classList.remove('inhale','exhale');
    $('#session-time').textContent='愿意为自己留一点时间，就已经很好。';
    $('#session-action').hidden=true;
    $('#session-feedback').innerHTML=`<p class="muted" style="margin-top:20px">这次练习对你有帮助吗？<br><small>可以跳过，反馈仅保存在此浏览器。</small></p><div class="feedback-row">${FEEDBACK.map(value=>`<button data-feedback="${value}">${value}</button>`).join('')}</div>`;
  }
  function submitFeedback(value) {
    if (!session || !session.finished || session.feedbackSaved || !FEEDBACK.includes(value)) return;
    feedback.push({type:session.type,value,date:new Date().toISOString()});feedback=feedback.slice(-200);
    session.feedbackSaved=true;
    const persisted=saveData();
    $('#session-feedback').innerHTML='<p class="muted" style="margin-top:23px">谢谢你的反馈。不适合的时候，换一种方式也没关系。</p><button class="button secondary" data-close style="margin-top:18px">回到关怀</button>';
    if (!persisted) {render();notify('反馈仅保留在本次会话，浏览器无法保存。');}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('button'); if (!button) return;
    const d=button.dataset;
    if (d.page || d.go) navigate(d.page||d.go);
    else if ('newEntry' in d) openEntry();
    else if ('quickMood' in d) {selectedMood=Number(d.quickMood);$('.checkin-card .mood-row').innerHTML=moodButtons(selectedMood,'quick');$(`[data-quick-mood="${selectedMood}"]`).focus();}
    else if ('formMood' in d) {formMood=Number(d.formMood);renderFormMoods();$('#form-error').textContent='';$(`[data-form-mood="${formMood}"]`).focus();}
    else if ('formTag' in d) {formTags=formTags.includes(d.formTag)?formTags.filter(t=>t!==d.formTag):[...formTags,d.formTag];renderFormTags();$(`[data-form-tag="${d.formTag}"]`).focus();}
    else if ('days' in d) {days=Number(d.days);render();$(`[data-days="${days}"]`).focus();}
    else if ('switchPersonal' in d) switchMode('personal');
    else if ('edit' in d) openEntry(d.edit);
    else if ('delete' in d) deleteEntry(d.delete);
    else if ('care' in d) openCare(d.care);
    else if ('feedback' in d) submitFeedback(d.feedback);
    else if ('close' in d) button.closest('dialog')?.close();
    else if (button.id==='mode-toggle') switchMode(mode==='demo'?'personal':'demo');
    else if (button.id==='data-button' || 'openData' in d) dataPanel();
    else if (button.id==='support-button') openInfo('你不需要独自撑着。','<div class="info-copy"><p>自我关怀是一个小小的支持，但不能替代专业帮助。如果困扰持续加重、影响睡眠或日常生活，可以联系当地合格的心理健康专业人员、学校心理中心或医疗机构。</p><p>如果你正处于即时危险中，请联系当地紧急服务，或请一位可信任的人陪在身边、帮助你获得支持。</p><p>心屿不提供实时人工监测、危机干预或诊断服务。练习中感到不适时，可以立即停止。</p></div>');
    else if (button.id==='export-data') exportData();
    else if (button.id==='clear-data') clearData();
    else if (button.id==='session-action') startSession();
  });
  $('#entry-note').addEventListener('input',()=>{$('#note-count').textContent=$('#entry-note').value.length;});
  $('#entry-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!formMood) {$('#form-error').textContent='先选一个最接近此刻的心情吧。';$('#form-moods button').focus();return;}
    const old=entries.find(e=>e.id===editingId);
    const entry={id:old?old.id:(crypto.randomUUID?crypto.randomUUID():`entry-${Date.now()}-${Math.random().toString(16).slice(2)}`),date:old?old.date:new Date().toISOString(),mood:formMood,tags:[...formTags],note:$('#entry-note').value.trim()};
    if (!C.validateEntry(entry)) {$('#form-error').textContent='记录格式有误，请检查内容后重试。';return;}
    if (old) entries=entries.map(e=>e.id===entry.id?entry:e);else entries.push(entry);
    const persisted=saveData();mode='personal';selectedMood=null;
    $('#entry-dialog').close();render();
    notify(persisted?(old?'记录已更新。':'这一刻，已经好好记下了。'):'记录仅保留在本次会话，请通过“隐私与数据”导出备份。');
  });
  $('#care-dialog').addEventListener('close',()=>{stopResources();session=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.type==='sound'&&session.started&&!session.finished)finishSession();});
  window.addEventListener('pagehide',stopResources);
  window.addEventListener('hashchange',()=>{const hash=location.hash.slice(1);if(['home','journal','insights','care'].includes(hash)){page=hash;render();}});
  $('#current-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  render();
})();


