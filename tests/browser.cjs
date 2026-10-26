const { chromium }=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(); const errors=[];page.on('requestfailed',r=>console.log('Request failure:',r.url(),r.failure().errorText));page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',route=>route.fulfill({path:process.env.TTRAIL_XLSX_PATH||'/tmp/ttrail-xlsx.full.min.js',contentType:'application/javascript'}));
 await page.goto('http://127.0.0.1:8000');
 console.log('XLSX:',await page.evaluate(()=>typeof XLSX));
 assert.equal(await page.title(),'TTRAIL Retos');
 const data=await page.evaluate(()=>({C,R,challenges,results,ath}));
 assert.equal(data.results.filter(r=>r.challenge==='ago').length,13);
 assert.equal(data.results.filter(r=>r.challenge==='oct').length,8);
 assert.equal(data.results.filter(r=>r.challenge==='sep').length,0);
 assert.equal(data.results.length,41);
 assert.ok(data.ath.some(a=>a.name==='Diana'));assert.ok(data.ath.some(a=>a.name==='Diana A.S.'));
 assert.equal(data.ath.filter(a=>a.name==='Maxi Roccia').length,1);
 for(const [month,sex,count,winner] of [['ago','H',9,'Gorka Santamaría'],['ago','M',4,'Laura Porta'],['oct','H',3,'Guaje'],['oct','M',5,'Eider']]){
  await page.evaluate(({month,sex})=>{pick(month);fSex.value=sex;ranking()},{month,sex});
  assert.equal(await page.locator('#rankBody tr').count(),count);
  assert.equal(await page.locator('#rankBody tr').first().locator('button').innerText(),winner);
 }
 await page.evaluate(()=>{fSex.value='all';pick('sep')});assert.match(await page.locator('#rankBody').innerText(),/No hay resultados/);
 // Exercise every challenge link, navigation destination and athlete profile.
 await page.evaluate(()=>{for(const c of challenges)pick(c.id);for(const id of ['inicio','retos','clas','liga','stats','atletas','adminp'])go(id);for(const a of ath)openAthlete(a.name)});
 await page.evaluate(()=>{go('liga')});
 const league=await page.locator('#league tr').allTextContents();assert.equal(league.length,data.ath.length);
 await page.evaluate(()=>openAthlete('Jon Pineda'));assert.match(await page.locator('#profileContent').innerText(),/Octubre/);
 // Existing browsers retain local registrations and edits; seed migration repeats safely.
 await page.evaluate(()=>{let old=R.filter(r=>r.challenge!=='oct');old[0].mark='20:00';localStorage.setItem('ttR',JSON.stringify(old));localStorage.setItem('ttC',JSON.stringify(C.filter(c=>c.id!=='oct')));localStorage.setItem('ttA',JSON.stringify([...ath.filter(a=>old.some(r=>r.name===a.name)),{name:'Atleta local',sex:'M',size:'S',state:'Activo'}]));localStorage.removeItem('ttSeedVersion')});
 await page.reload();assert.equal(await page.evaluate(()=>results.length),41);assert.equal(await page.evaluate(()=>results[0].mark),'20:00');assert.ok(await page.evaluate(()=>ath.some(a=>a.name==='Atleta local')));await page.reload();assert.equal(await page.evaluate(()=>results.length),41);
 await page.evaluate(()=>{go('adminp');aNom.value='  JON PINEDA ';addAthlete()});assert.equal(await page.evaluate(()=>ath.filter(a=>nameKey(a.name)==='jon pineda').length),1);
 await page.evaluate(()=>{nNom.value='Reto local';addChallenge();aNom.value='Atleta prueba';addAthlete()});
 assert.ok(await page.evaluate(()=>challenges.some(c=>c.name==='Reto local')));
 await page.evaluate(()=>tab('pImp',document.querySelectorAll('.adminNav button')[2]));
 await page.locator('#xl').setInputFiles({name:'resultados.csv',mimeType:'text/csv',buffer:Buffer.from('reto,atleta,sexo,talla,marca,dato\noct,Atleta importado,H,M,1:30:00,prueba\n')});
 await page.waitForFunction(()=>pend.length===1);await page.locator('#impBtn').click();assert.ok(await page.evaluate(()=>ath.some(a=>a.name==='Atleta importado')));
 const download=page.waitForEvent('download');await page.evaluate(()=>template());assert.equal((await download).suggestedFilename(),'plantilla_resultados_ttrail.csv');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.evaluate(()=>go('inicio'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS: data, gender rankings, pending September, profiles, navigation, migration, administration, CSV import/export, responsive layout; no JavaScript errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
