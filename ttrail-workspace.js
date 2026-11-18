(function(){
'use strict';
const root=document.getElementById('ttrail2027Workspace');
if(!root)return;
const sb=window.ttrailDb;
if(!sb){root.textContent='No se ha podido iniciar el módulo de gestión.';return;}
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={user:null,profile:null,athletes:[],challenges:[],events:[]};
const msg=(s,bad=false)=>{el('t27Status').textContent=s;el('t27Status').style.color=bad?'#b42318':''};
const months=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const kindNames={ST:'Salida técnica',AE:'Animación',IBKT:'Iberika Trail',OP:'Objetivo principal'};
function table(rows,headers){if(!rows.length)return '<p class="muted">Sin registros.</p>';return '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>'+headers.map(h=>'<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'}
const cell=x=>'<td style="padding:8px;border-bottom:1px solid #eee">'+esc(x)+'</td>';
async function load(){
 const {data:{user}}=await sb.auth.getUser();state.user=user;
 if(!user){root.hidden=true;return;}
 const {data:profile}=await sb.from('ttrail_athletes').select('id,role,tcenter_enabled').eq('id',user.id).maybeSingle();
 state.profile=profile;root.hidden=false;
 el('t27Admin').hidden=profile?.role!=='admin';
 el('t27Athlete').hidden=!profile;
 el('t27EventSubmit').hidden=!profile?.tcenter_enabled;
 await Promise.all([loadChallenges(),loadEvents(),loadOwn()]);
 if(profile?.role==='admin')await Promise.all([loadAthletes(),loadReviews()]);
}
async function loadAthletes(){
 const {data,error}=await sb.from('ttrail_athletes').select('id,display_name,sex,season_size,tcenter_enabled,role').order('display_name');
 if(error)return msg(error.message,true);
 state.athletes=data||[];
 el('t27Athletes').innerHTML=table(state.athletes.map(a=>'<tr>'+cell(a.display_name)+cell(a.sex||'—')+cell(a.season_size||'—')+cell(a.tcenter_enabled?'Sí':'No')+cell(a.role)+'</tr>'),['Atleta','Sexo','Talla','T-Center','Rol']);
 const options=state.athletes.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.display_name)+'</option>').join('');
 el('t27AthleteSelect').innerHTML=options;
}
async function loadChallenges(){
 const {data,error}=await sb.from('ttrail_challenges').select('id,title,description,season,month,metric,published_at').eq('season',2027).order('month');
 if(error)return msg(error.message,true);
 state.challenges=data||[];
 el('t27ChallengeSelect').innerHTML=state.challenges.filter(c=>new Date(c.published_at)<=new Date()).map(c=>'<option value="'+esc(c.id)+'">'+esc(months[c.month]+' · '+c.title)+'</option>').join('');
 el('t27Challenges').innerHTML=table(state.challenges.map(c=>'<tr>'+cell(months[c.month])+cell(c.title)+cell(c.metric)+cell(new Date(c.published_at)>new Date()?'Programado':'Publicado')+'</tr>'),['Mes','Reto','Métrica','Publicación']);
 await loadChallengeRanking();
}
async function loadEvents(){
 const {data,error}=await sb.from('ttrail_events').select('id,event_date,title,kind,official').gte('event_date','2027-01-01').lte('event_date','2027-12-31').order('event_date');
 if(error)return msg(error.message,true);
 state.events=data||[];
 el('t27Events').innerHTML=table(state.events.map(e=>'<tr>'+cell(e.event_date)+cell(e.title)+cell(kindNames[e.kind]||e.kind)+cell(e.official?'Oficial':'Borrador')+'</tr>'),['Fecha','Evento','Tipo','Estado']);
 el('t27EventSelect').innerHTML=state.events.filter(e=>e.official).map(e=>'<option value="'+esc(e.id)+'">'+esc(e.event_date+' · '+e.title)+'</option>').join('');
}
async function loadOwn(){
 if(!state.user)return;
 const [tc,ch]=await Promise.all([sb.from('ttrail_tc_entries').select('activity_date,kind,status').eq('athlete_id',state.user.id).order('activity_date',{ascending:false}).limit(20),sb.from('ttrail_challenge_entries').select('mark,status,challenge_id').eq('athlete_id',state.user.id).limit(30)]);
 if(tc.error||ch.error)return msg((tc.error||ch.error).message,true);
 const names=new Map(state.challenges.map(c=>[c.id,c.title]));
 el('t27Own').innerHTML=table([...(tc.data||[]).map(e=>'<tr>'+cell(e.activity_date)+cell(e.kind)+cell(e.status)+'</tr>'),...(ch.data||[]).map(e=>'<tr>'+cell(names.get(e.challenge_id)||'Reto')+cell(e.mark)+cell(e.status)+'</tr>')],['Fecha / reto','Actividad / marca','Estado']);
}
async function loadReviews(){
 const [tc,ch]=await Promise.all([sb.from('ttrail_tc_entries').select('id,athlete_id,activity_date,kind,status').eq('status','pending').order('created_at').limit(100),sb.from('ttrail_challenge_entries').select('id,athlete_id,challenge_id,mark,evidence_url').eq('status','pending').order('created_at').limit(100)]);
 if(tc.error||ch.error)return msg((tc.error||ch.error).message,true);
 const names=new Map(state.athletes.map(a=>[a.id,a.display_name]));
 const challenges=new Map(state.challenges.map(c=>[c.id,c.title]));
 const rows=[...(tc.data||[]).map(e=>({table:'ttrail_tc_entries',...e,detail:e.activity_date+' · '+e.kind})),...(ch.data||[]).map(e=>({table:'ttrail_challenge_entries',...e,detail:(challenges.get(e.challenge_id)||'Reto')+' · '+e.mark}))];
 const target=el('t27Reviews');target.replaceChildren();
 if(!rows.length){target.textContent='No hay registros pendientes.';return;}
 for(const r of rows){
  const div=document.createElement('div');div.style='padding:12px 0;border-bottom:1px solid #ddd';
  const span=document.createElement('span');span.textContent=(names.get(r.athlete_id)||'Atleta')+' · '+r.detail+' ';div.append(span);
  if(r.evidence_url&&/^https:\/\//i.test(r.evidence_url)){const a=document.createElement('a');a.href=r.evidence_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Evidencia';div.append(a);}
  for(const [title,status] of [['Aprobar','approved'],['Rechazar','rejected']]){
   const btn=document.createElement('button');btn.textContent=title;btn.className='btn '+(status==='approved'?'red':'light');btn.style.margin='4px';
   btn.onclick=async()=>{btn.disabled=true;const {data,error}=await sb.from(r.table).update({status,reviewed_by:state.user.id,reviewed_at:new Date().toISOString()}).eq('id',r.id).eq('status','pending').select('id');if(error||!data?.length){msg(error?.message||'No se ha actualizado el registro.',true);btn.disabled=false;return;}msg('Registro '+(status==='approved'?'aprobado':'rechazado'));await Promise.all([loadReviews(),loadChallengeRanking(),loadOwn()]);};
   div.append(btn);
  }
  target.append(div);
 }
}
async function loadChallengeRanking(){
 const challengeId=el('t27RankChallenge').value||state.challenges.find(c=>new Date(c.published_at)<=new Date())?.id;
 const available=state.challenges.filter(c=>new Date(c.published_at)<=new Date()||state.profile?.role==='admin');
 el('t27RankChallenge').innerHTML=available.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===challengeId?'selected':'')+'>'+esc(c.title)+'</option>').join('');
 const chosen=el('t27RankChallenge').value;
 if(!chosen){el('t27Ranking').textContent='Todavía no hay retos publicados.';return;}
 const {data,error}=await sb.from('ttrail_challenge_entries').select('athlete_id,mark,status').eq('challenge_id',chosen).eq('status','approved');
 if(error)return msg(error.message,true);
 const c=state.challenges.find(x=>x.id===chosen),desc=/vam|desnivel|distancia/i.test(c?.metric||'');
 const names=new Map(state.athletes.map(a=>[a.id,a]));
 const rows=(data||[]).map(e=>({...e,a:names.get(e.athlete_id)})).filter(e=>e.a);
 const size=el('t27RankSize').value,sex=el('t27RankSex').value;
 rows.sort((a,b)=>desc?b.mark-a.mark:a.mark-b.mark);
 el('t27Ranking').innerHTML=table(rows.filter(e=>(size==='all'||e.a.season_size===size)&&(sex==='all'||e.a.sex===sex)).map((e,i)=>'<tr>'+cell(i+1)+cell(e.a.display_name)+cell(e.a.season_size||'—')+cell(e.mark)+'</tr>'),['Puesto','Atleta','Talla','Marca']);
}
async function submit(form,tableName,payload,after){
 const btn=form.querySelector('button[type=submit]');btn.disabled=true;
 const {error}=await sb.from(tableName).insert(payload);
 btn.disabled=false;if(error)return msg(error.message,true);
 form.reset();msg('Guardado correctamente.');if(after)await after();
}
el('t27NewAthlete').onsubmit=async ev=>{
 ev.preventDefault();const f=ev.target, email=f.email.value.trim().toLowerCase();
 const {data,error}=await sb.rpc('ttrail_admin_register_existing_user',{p_email:email,p_name:f.display_name.value.trim(),p_sex:f.sex.value,p_size:f.season_size.value,p_tcenter:f.tcenter_enabled.checked,p_role:f.role.value});
 if(error)return msg(error.message,true);
 msg(data?'Atleta actualizado.':'No se encontró una cuenta de acceso para ese email. Primero debe existir en Supabase Auth.');
 if(data){f.reset();await loadAthletes();}
};
el('t27NewChallenge').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;const month=Number(f.month.value),published_at=new Date(Date.UTC(2027,month-1,1,0,0)).toISOString();await submit(f,'ttrail_challenges',{season:2027,month,title:f.title.value.trim(),description:f.description.value.trim(),metric:f.metric.value,published_at},loadChallenges)};
el('t27NewEvent').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;await submit(f,'ttrail_events',{event_date:f.event_date.value,title:f.title.value.trim(),kind:f.kind.value,official:f.official.checked},loadEvents)};
el('t27NewResult').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;await submit(f,'ttrail_challenge_entries',{athlete_id:state.user.id,challenge_id:f.challenge_id.value,mark:Number(f.mark.value),evidence_url:f.evidence_url.value.trim()||null},loadOwn)};
el('t27NewEventEntry').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;const e=state.events.find(x=>x.id===f.event_id.value);if(!e)return msg('Selecciona un evento oficial.',true);await submit(f,'ttrail_tc_entries',{athlete_id:state.user.id,event_id:e.id,activity_date:e.event_date,kind:e.kind,evidence_url:f.evidence_url.value.trim()||null},loadOwn)};
el('t27RankChallenge').onchange=loadChallengeRanking;el('t27RankSize').onchange=loadChallengeRanking;el('t27RankSex').onchange=loadChallengeRanking;
window.ttrailWorkspaceRefresh=load;
sb.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();