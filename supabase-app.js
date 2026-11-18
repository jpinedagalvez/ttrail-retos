(function(){
'use strict';
const URL='https://stczajnyopbndppqlwww.supabase.co';
const KEY='sb_publishable_8o54ll-FIQvptpPZusN5yw_Js7GJQMH';
const api=window.supabase;
if(!api){document.getElementById('ttrailAuthStatus').textContent='No se pudo cargar la conexión. Recarga la página.';return;}
const sb=api.createClient(URL,KEY),$=id=>document.getElementById(id);
let current=null,athlete=null;
const season=2027;
const notify=(msg)=>{$('ttrailAuthStatus').textContent=msg};
const safe=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 const {data:{user},error}=await sb.auth.getUser();current=error?null:user;athlete=null;
 $('ttrailLogin').hidden=!!current;$('ttrailLogged').hidden=!current;
 if(!current){$('adminp').hidden=true; $('ttrailAnnualScores').textContent='Accede para consultar la clasificación.';$('ttrailMonthlyScores').textContent='Accede para consultar la clasificación.';$('homeGreeting').textContent='Accede con tu email para ver tus posiciones, puntos y participaciones.';$('adminNavBtn')?.style.setProperty('display','none');return;}
 $('ttrailEmailShown').textContent=current.email||'Atleta';
 const p=await sb.from('ttrail_athletes').select('display_name,role,tcenter_enabled').eq('id',current.id).maybeSingle();
 if(p.error){notify('No se pudo leer el perfil: '+p.error.message);return;}
 athlete=p.data;
 $('homeGreeting').textContent=athlete?'Hola, '+athlete.display_name+'. Tu temporada TTRAIL.':'Tu cuenta está activa. Un administrador debe darte de alta como atleta.';
 $('adminNavBtn')?.style.setProperty('display',athlete?.role==='admin'?'':'none');
 $('adminp').hidden=athlete?.role!=='admin';
 $('ttrailTcEntry').hidden=!athlete?.tcenter_enabled;
 $('tcProfileAction').disabled=!athlete?.tcenter_enabled;
 $('tcProfileAction').textContent=athlete?.tcenter_enabled?'Registrar actividad':'Pendiente de inscripción';
 if(!athlete)return;
 await Promise.all([renderScores(),athlete.role==='admin'?renderQueue():Promise.resolve()]);
 const res=await sb.from('ttrail_challenge_entries').select('challenge_id').eq('athlete_id',current.id).eq('status','approved');
 if(!res.error)$('homeChallenges').textContent=new Set((res.data||[]).map(x=>x.challenge_id)).size;
 const tc=await sb.from('ttrail_tc_entries').select('activity_date,kind,status').eq('athlete_id',current.id).order('activity_date',{ascending:false}).limit(30);
 if(!tc.error)$('ttrailMyEntries').innerHTML=(tc.data||[]).map(x=>'<div style="padding:8px 0;border-bottom:1px solid #eee">'+safe(x.activity_date)+' · '+safe(x.kind)+' · '+safe(x.status)+'</div>').join('')||'Sin actividades registradas';
}
$('ttrailSendOtp').onclick=async()=>{
 const email=$('ttrailEmail').value.trim();if(!email)return notify('Introduce tu email.');
 const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
 notify(error?error.message:'Comprueba tu correo. Introduce el código recibido.');if(!error)$('ttrailOtpWrap').hidden=false;
};
$('ttrailVerifyOtp').onclick=async()=>{
 const {error}=await sb.auth.verifyOtp({email:$('ttrailEmail').value.trim(),token:$('ttrailOtp').value.trim(),type:'email'});
 notify(error?error.message:'Sesión iniciada.');if(!error)await refresh();
};
$('ttrailSignOut').onclick=async()=>{await sb.auth.signOut();notify('Sesión cerrada.');await refresh()};
$('ttrailTcSubmit').onclick=async()=>{
 if(!current||!athlete?.tcenter_enabled)return notify('Necesitas una inscripción activa.');
 const kind=$('ttrailTcKind').value,date=$('ttrailTcDate').value;
 if(!date)return notify('Selecciona la fecha.');
 const payload={athlete_id:current.id,kind,activity_date:date,distance_km:$('ttrailTcKm').value?Number($('ttrailTcKm').value):null,elevation_m:$('ttrailTcElevation').value?Number($('ttrailTcElevation').value):null,evidence_url:$('ttrailTcEvidence').value.trim()||null};
 const {error}=await sb.from('ttrail_tc_entries').insert(payload);
 notify(error?'No se ha registrado: '+error.message:'Actividad enviada a validación.');
 if(!error)await refresh();
};

const activityNames={TTR:'T-TRAIL',TR:'T-Run',TRK:'Track',ST:'Salida técnica',AE:'Animación',IBKT:'IBK Trail',OP:'Objetivo principal'};
async function renderScores(){
 const [annual,monthly]=await Promise.all([
  sb.from('ttrail_tc_annual').select('athlete_id,display_name,sex,points').eq('season',season).order('points',{ascending:false}),
  sb.from('ttrail_tc_scores').select('athlete_id,display_name,sex,month,kind,points').eq('season',season)
 ]);
 if(annual.error){$('ttrailAnnualScores').textContent=annual.error.message;return;}
 const rows=annual.data||[];
 $('ttrailAnnualScores').innerHTML=rows.length?rows.map((r,i)=>'<div style="padding:10px;border-bottom:1px solid #eee">'+(i+1)+'. '+safe(r.display_name)+' · <b>'+r.points+' puntos</b></div>').join(''):'Todavía no hay actividades validadas en 2027.';
 const myIndex=rows.findIndex(x=>x.athlete_id===current.id);
 $('homeTcenterRank').textContent=athlete?.tcenter_enabled&&myIndex>=0?'#'+(myIndex+1):'—';
 if(monthly.error){$('ttrailMonthlyScores').textContent=monthly.error.message;return;}
 const paint=()=>{
  const month=Number($('tcMonth').value),sex=$('ttrailTcSexFilter').value,kind=$('ttrailTcActivityFilter').value;
  const scores=new Map();
  (monthly.data||[]).filter(r=>r.month===month&&(sex==='all'||r.sex===sex)&&(kind==='all'||r.kind===kind)).forEach(r=>{
   const x=scores.get(r.athlete_id)||{name:r.display_name,points:0};x.points+=r.points;scores.set(r.athlete_id,x);
  });
  const ordered=[...scores.values()].sort((a,b)=>b.points-a.points);
  $('ttrailMonthlyScores').innerHTML=ordered.length?ordered.map((r,i)=>'<div style="padding:10px;border-bottom:1px solid #eee">'+(i+1)+'. '+safe(r.name)+' · <b>'+r.points+' puntos</b></div>').join(''):'Sin actividades aprobadas con estos filtros.';
 };
 ['tcMonth','ttrailTcSexFilter','ttrailTcActivityFilter'].forEach(id=>$(id).onchange=paint);
 paint();
}
async function renderQueue(){
 const {data,error}=await sb.from('ttrail_tc_entries').select('id,athlete_id,activity_date,kind,distance_km,elevation_m,evidence_url,status').eq('status','pending').order('created_at',{ascending:true}).limit(100);
 if(error){$('ttrailReviewQueue').textContent=error.message;return;}
 const names=await sb.from('ttrail_athletes').select('id,display_name');
 const byId=new Map((names.data||[]).map(a=>[a.id,a.display_name]));
 $('ttrailReviewQueue').replaceChildren();
 if(!data?.length){$('ttrailReviewQueue').textContent='No hay actividades pendientes.';return;}
 for(const e of data){
  const box=document.createElement('div');box.style='padding:12px 0;border-bottom:1px solid #ddd';
  const info=document.createElement('div');info.textContent=(byId.get(e.athlete_id)||'Atleta')+' · '+e.activity_date+' · '+(activityNames[e.kind]||e.kind)+(e.kind==='TRK'?' · '+(e.distance_km||0)+' km / '+(e.elevation_m||0)+' m+':'');box.append(info);
  if(e.evidence_url&&/^https:\/\//i.test(e.evidence_url)){const a=document.createElement('a');a.href=e.evidence_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Ver evidencia';box.append(a);}
  for(const [label,status] of [['Aprobar','approved'],['Rechazar','rejected']]){
   const b=document.createElement('button');b.className='btn '+(status==='approved'?'red':'light');b.textContent=label;b.style.margin='6px';
   b.onclick=async()=>{b.disabled=true;const {error}=await sb.from('ttrail_tc_entries').update({status,reviewed_by:current.id,reviewed_at:new Date().toISOString()}).eq('id',e.id).eq('status','pending');notify(error?error.message:'Actividad '+(status==='approved'?'aprobada':'rechazada'));if(!error)await Promise.all([renderQueue(),renderScores()]);else b.disabled=false;};
   box.append(b);
  }
  $('ttrailReviewQueue').append(box);
 }
}

sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
refresh();
})();