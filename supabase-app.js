(function(){
'use strict';
const URL='https://stczajnyopbndppqlwww.supabase.co';
const KEY='sb_publishable_8o54ll-FIQvptpPZusN5yw_Js7GJQMH';
const api=window.supabase;
if(!api){document.getElementById('ttrailAuthStatus').textContent='No se pudo cargar la conexión. Recarga la página.';return;}
const sb=api.createClient(URL,KEY),$=id=>document.getElementById(id);
let current=null,athlete=null;
const notify=(msg)=>{$('ttrailAuthStatus').textContent=msg};
const safe=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 const {data:{user},error}=await sb.auth.getUser();current=error?null:user;athlete=null;
 $('ttrailLogin').hidden=!!current;$('ttrailLogged').hidden=!current;
 if(!current){$('homeGreeting').textContent='Accede con tu email para ver tus posiciones, puntos y participaciones.';$('adminNavBtn')?.style.setProperty('display','none');return;}
 $('ttrailEmailShown').textContent=current.email||'Atleta';
 const p=await sb.from('ttrail_athletes').select('display_name,role,tcenter_enabled').eq('id',current.id).maybeSingle();
 if(p.error){notify('No se pudo leer el perfil: '+p.error.message);return;}
 athlete=p.data;
 $('homeGreeting').textContent=athlete?'Hola, '+athlete.display_name+'. Tu temporada TTRAIL.':'Tu cuenta está activa. Un administrador debe darte de alta como atleta.';
 $('adminNavBtn')?.style.setProperty('display',athlete?.role==='admin'?'':'none');
 $('ttrailTcEntry').hidden=!athlete?.tcenter_enabled;
 $('tcProfileAction').disabled=!athlete?.tcenter_enabled;
 $('tcProfileAction').textContent=athlete?.tcenter_enabled?'Registrar actividad':'Pendiente de inscripción';
 if(!athlete)return;
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
sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
refresh();
})();