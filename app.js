let DATA=null;
const state={unlocked:1,parent:false,selected:1};

function loadState(){
  const s=JSON.parse(localStorage.getItem('trevorProgV2')||'{}');
  state.unlocked=s.unlocked||1;
  state.selected=s.selected||1;
  state.parent=!!s.parent;
}
function saveState(){
  localStorage.setItem('trevorProgV2', JSON.stringify({unlocked:state.unlocked, selected:state.selected, parent:state.parent}));
}

function mdToHtml(md){
  let html=(md||'')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^\s*\-\s(.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>');
  html='<p>'+html+'</p>';
  html=html.replace(/<p>\s*<li>/g,'<ul><li>').replace(/<\/li>\s*<\/p>/g,'</li></ul>');
  return html;
}

function ytEmbed(url){
  try{
    if(!url) return null;
    if(url.includes('youtube.com/watch')){
      const id=new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}`;
    }
    if(url.includes('youtu.be/')){
      const id=url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
  }catch(e){}
  return null;
}

function updateProgress(){
  const total=DATA?.total_sessions || DATA?.sessions?.length || 150;
  const pct=Math.round((state.unlocked-1)/total*100);
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('progressText').textContent=`Unlocked: ${state.unlocked-1} / ${total} (${pct}%)`;
}

function filteredSessions(){
  const q=document.getElementById('search').value.trim().toLowerCase();
  const subj=document.getElementById('subjectFilter').value;
  return DATA.sessions.filter(s=>{
    if(subj && s.subject_code!==subj) return false;
    if(!q) return true;
    const hay=[s.title,s.subject,s.module,s.hook,s.dayOfWeek,String(s.week),String(s.month)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function renderList(){
  const list=document.getElementById('sessionList');
  list.innerHTML='';
  const items=filteredSessions();

  for(const s of items){
    const locked=s.id>state.unlocked;
    const item=document.createElement('div');
    item.className='session-item'+(locked?' locked':'')+(s.id===state.selected?' active':'');
    item.innerHTML=`
      <img src="${s.picture}" alt=""/>
      <div class="meta">
        <div><strong>${s.id}. ${s.title.replace('Session '+s.id+': ','')}</strong></div>
        <div class="small">Month ${s.month} • Week ${s.week} • ${s.dayOfWeek} • <span class="badge">${s.subject}</span></div>
      </div>`;
    item.onclick=()=>{ if(locked) return; state.selected=s.id; saveState(); renderList(); renderSession(s.id); };
    list.appendChild(item);
  }
}

function renderSession(id){
  const s=DATA.sessions.find(x=>x.id===id) || DATA.sessions[0];
  const wrap=document.getElementById('sessionView');

  const linksHtml=(s.materials||[]).map(m=>{
    const icon = m.type==='youtube'?'▶️':(m.type==='web'?'🌐':(m.type==='activity'?'🧩':'🔗'));
    return `<a class="badge" href="${m.url}" target="_blank" rel="noreferrer">${icon} ${m.title}</a>`;
  }).join(' ');

  const firstYT=(s.materials||[]).find(m=>m.type==='youtube');
  const embed=ytEmbed(firstYT?.url);

  wrap.innerHTML=`
    <div class="content">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between">
        <div>
          <h2>${s.title}</h2>
          <div class="small">Subject: <span class="badge">${s.subject}</span> • Module: <span class="badge">${s.module}</span> • ${s.dayOfWeek}</div>
        </div>
        <div class="small">Unlocked up to: <strong>${state.unlocked-1}</strong></div>
      </div>

      <img class="hero" src="${s.picture}" alt="" />
      <hr/>
      <div class="links">${linksHtml || '<span class="small">No links for this session.</span>'}</div>
      <hr/>
      ${embed ? `<iframe class="video" src="${embed}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<div class="small">Tip: open a link above (YouTube/activity) for this session.</div>`}
      <hr/>
      <div class="lesson">${mdToHtml(s.lesson_text)}</div>

      <hr/>
      <h3>Steps</h3>
      <ol>${(s.steps||[]).map(x=>`<li>${x}</li>`).join('')}</ol>

      <hr/>
      <h3>Quick Q&A</h3>
      <ul>
        ${(s.qa||[]).map(x=>`<li><strong>${x.q}</strong><div class="answer">${x.a}</div></li>`).join('')}
      </ul>

      <hr/>
      <h3>5‑Question Quiz (get 5/5 to unlock next)</h3>
      <div class="quiz" id="quiz"></div>
    </div>
  `;

  renderQuiz(s);
  updateProgress();
}

function renderQuiz(s){
  const qWrap=document.getElementById('quiz');
  qWrap.innerHTML='';

  (s.quiz||[]).slice(0,5).forEach((q,idx)=>{
    const div=document.createElement('div');
    div.className='q';
    div.dataset.idx=idx;

    if(q.type==='mc'){
      div.innerHTML=`<div><strong>Q${idx+1}.</strong> ${q.question}</div>`+
        q.options.map(opt=>{
          const letter=opt.split('.')[0];
          return `<label><input type="radio" name="q${idx}" value="${letter}"/> ${opt}</label>`;
        }).join('')+
        (state.parent?`<div class="answer">Answer: <strong>${q.answer}</strong> — ${q.answer_text||''}</div>`:'');
    }else{
      div.innerHTML=`<div><strong>Q${idx+1}.</strong> ${q.question}</div>`+
        `<input type="text" placeholder="Type your answer…" />`+
        (state.parent?`<div class="answer">Suggested: ${q.answer||'(varies)'}<br/><span class="small">${q.grading||''}</span></div>`:'');
    }

    qWrap.appendChild(div);
  });

  const btn=document.createElement('button');
  btn.className='primary';
  btn.textContent='Check answers';
  btn.onclick=()=>checkQuiz(s);
  qWrap.appendChild(btn);

  const fb=document.createElement('div');
  fb.id='feedback';
  fb.className='feedback';
  fb.style.display='none';
  qWrap.appendChild(fb);
}

function norm(str){
  return (str||'').trim().toLowerCase().replace(/\s+/g,' ');
}

function checkQuiz(s){
  const quiz=(s.quiz||[]).slice(0,5);
  let correct=0;
  const feedback=[];

  quiz.forEach((q,idx)=>{
    const block=document.querySelector(`.q[data-idx="${idx}"]`);
    let ok=false;

    if(q.type==='mc'){
      const chosen=block.querySelector('input[type=radio]:checked');
      ok=chosen && chosen.value===q.answer;
    }else{
      const ans=block.querySelector('input[type=text]').value;
      ok=norm(ans).split(' ').filter(Boolean).length>=4;
    }

    if(ok) correct++; else feedback.push(`Q${idx+1} needs a better answer.`);
  });

  const fb=document.getElementById('feedback');
  fb.style.display='block';

  if(correct===quiz.length){
    fb.className='feedback ok';
    fb.innerHTML=`✅ Great job! You passed (5/5). Next session unlocked.`;
    if(state.unlocked<=s.id){ state.unlocked=Math.min((DATA.total_sessions||150)+1, s.id+1); }
    saveState();
    updateProgress();
    renderList();
  }else{
    fb.className='feedback no';
    fb.innerHTML=`❌ You got ${correct}/5. Try again.<br/>${feedback.map(x=>`• ${x}`).join('<br/>')}`;
  }
}

function exportProgress(){
  const payload={unlocked:state.unlocked, selected:state.selected, parent:state.parent, exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trevor_progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function init(){
  loadState();
  document.getElementById('parentMode').checked=state.parent;
  document.getElementById('parentMode').addEventListener('change', e=>{ state.parent=e.target.checked; saveState(); renderSession(state.selected); });
  document.getElementById('resetBtn').addEventListener('click', ()=>{ localStorage.removeItem('trevorProgV2'); location.reload(); });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);

  document.getElementById('search').addEventListener('input', ()=>renderList());
  document.getElementById('subjectFilter').addEventListener('change', ()=>renderList());

  const res=await fetch('sessions.json', {cache:'no-store'});
  DATA=await res.json();

  const total=DATA.total_sessions || DATA.sessions.length;
  state.unlocked=Math.min(state.unlocked, total+1);
  if(state.selected>state.unlocked) state.selected=state.unlocked;
  if(state.selected<1) state.selected=1;

  saveState();
  renderList();
  renderSession(state.selected);
}

init();
