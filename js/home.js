/* Homepage room: intro, cat, light switch, Spanish note, shelf tooltips. */
(function(){
  var root=document.documentElement, $=function(id){return document.getElementById(id);};
  var stage=document.querySelector('.stage'), bubble=$('bubble'), typed=$('typed'), ghost=$('ghost'), typed2=$('typed2'), ghost2=$('ghost2'), line2=$('line2'), cursor=$('cursor'),
      cat=$('cat'), look=$('look'), skipBtn=$('skip'), themeToggle=$('themeToggle'), note=$('note'), noteWord=$('noteWord'), noteMean=$('noteMean'),
      metaTheme=document.querySelector('meta[name="theme-color"]');
  var intro=typed.textContent.trim(), outro=typed2.textContent.trim();
  var reduceMotion=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers=[], started=false, skipped=false, finishing=false, interactive=false;
  function later(fn,ms){var id=setTimeout(fn,ms);timers.push(id);return id;}

  // Screen readers get the full text at once; the typed bubble is decorative.
  $('srText').textContent=intro+' '+outro; bubble.setAttribute('aria-hidden','true');
  // Typed text + invisible remainder keeps the bubble's final size and line breaks from the first character.
  typed.textContent=''; ghost.textContent=intro; typed2.textContent=''; ghost2.textContent=outro;

  /* Light switch = theme. First visit follows the local clock; the choice sticks. */
  var COLORS={light:'#e3e6de',dark:'#131816'};
  function applyTheme(t){
    root.setAttribute('data-theme',t); themeToggle.setAttribute('aria-checked',t==='dark');
    themeToggle.setAttribute('aria-label','Light switch: '+(t==='dark'?'night':'day')+' mode');
    if(metaTheme)metaTheme.setAttribute('content',COLORS[t]);
  }
  applyTheme(root.getAttribute('data-theme')||'light');
  themeToggle.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark'; applyTheme(next);
    try{localStorage.setItem('ms-theme',next);}catch(e){}
  });

  /* Sticky note: a Spanish word, picked by day, cycled on click */
  var WORDS=[['gato','cat'],['hogar','home'],['ventana','window'],['luna','moon'],['ajedrez','chess'],['brújula','compass'],['datos','data'],['azar','chance'],['tranquilo','calm'],['lluvia','rain'],['estadística','statistics'],['curioso','curious']];
  var wi=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5)%WORDS.length;
  function showWord(){var w=WORDS[wi];noteWord.textContent=w[0];noteMean.textContent=w[1];note.setAttribute('aria-label','Spanish word: '+w[0]+', meaning '+w[1]+'. Tap for another.');}
  showWord();
  note.addEventListener('click',function(){wi=(wi+1)%WORDS.length;showWord();note.classList.remove('flip');void note.offsetWidth;note.classList.add('flip');});

  /* Shelf tooltips (hover, focus, or tap) */
  var things=Array.prototype.slice.call(document.querySelectorAll('.thing[data-tip]')), tipTimer;
  things.forEach(function(el){
    var tip=document.createElement('span'); tip.className='tip'; tip.setAttribute('aria-hidden','true'); tip.textContent=el.getAttribute('data-tip'); el.appendChild(tip);
    el.addEventListener('click',function(){
      things.forEach(function(o){if(o!==el)o.classList.remove('tip-on');});
      el.classList.add('tip-on'); clearTimeout(tipTimer); tipTimer=setTimeout(function(){el.classList.remove('tip-on');},2600);
    });
  });

  /* Layout: size the cat to the room (mirrors --cat-b and the frame height in CSS) */
  function fit(){
    var h=cat.offsetHeight, w=cat.offsetWidth, mobile=window.innerWidth<=640;
    var catB=mobile?162:168, topR=mobile?100:128, cap=mobile?1.35:1.5;
    var s=Math.max(.6,Math.min(cap,(window.innerHeight-catB-topR)/h,(window.innerWidth-40)/w));
    root.style.setProperty('--cat-scale',s.toFixed(3));
  }
  window.addEventListener('resize',function(){requestAnimationFrame(fit);});
  fit();
  $('brand').addEventListener('click',function(e){e.preventDefault();location.reload();});

  /* Intro: typing with natural pauses at punctuation */
  function typeInto(str,tEl,gEl,speed,done){
    var i=0;
    (function step(){
      if(skipped)return;
      i++; tEl.textContent=str.slice(0,i); gEl.textContent=str.slice(i);
      if(i>=str.length){if(done)done();return;}
      var ch=str.charAt(i-1), d=speed*(.6+Math.random()*.8);
      if('.!?'.indexOf(ch)>-1)d+=320; else if(ch===',')d+=150;
      later(step,d);
    })();
  }
  function start(){
    if(skipped)return;
    bubble.classList.add('show');
    typeInto(intro,typed,ghost,24,function(){
      later(function(){
        line2.insertBefore(cursor,ghost2);
        typeInto(outro,typed2,ghost2,60,function(){
          cursor.style.display='none';
          later(function(){finish(false);},2400);
        });
      },950);
    });
  }
  function finish(fast){
    finishing=true; skipBtn.classList.remove('on'); bubble.classList.remove('show');
    if(fast)root.classList.add('fast');
    later(function(){cat.classList.add('out');},fast?100:500);
    later(sit,fast?1100:2400);
  }
  function sit(){
    cat.classList.add('sit','waving'); document.body.classList.add('settled'); // lights on
    later(function(){
      cat.setAttribute('role','button'); cat.setAttribute('tabindex','0'); cat.setAttribute('aria-label','Pet the cat');
      interactive=true;
    },350);
  }
  function skip(){
    if(skipped||finishing)return;
    skipped=true; started=true; timers.forEach(clearTimeout); timers=[];
    cursor.style.display='none'; finish(true);
  }
  skipBtn.addEventListener('click',skip);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')skip();});

  /* The cat: eyes follow the pointer; a click gets a wave, a squish and a little purr */
  window.addEventListener('pointermove',function(e){
    if(!interactive)return;
    var r=cat.getBoundingClientRect(), dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height*.37);
    var dist=Math.hypot(dx,dy)||1, m=Math.min(1,dist/(r.width*.9));
    look.style.transform='translate('+(dx/dist*m*5).toFixed(2)+'px,'+(dy/dist*m*4).toFixed(2)+'px)';
  },{passive:true});
  root.addEventListener('mouseleave',function(){look.style.transform='';});
  function pet(){
    if(!interactive)return;
    cat.classList.remove('waving','petted'); void cat.offsetWidth; cat.classList.add('waving','petted');
    var r=cat.getBoundingClientRect(), sr=stage.getBoundingClientRect(), f=document.createElement('span');
    f.className='fx'; f.textContent=Math.random()<.25?'purr…':'♥';
    f.style.left=(r.left-sr.left+r.width*(.3+Math.random()*.4))+'px'; f.style.top=(r.top-sr.top+r.height*.1)+'px';
    stage.appendChild(f); setTimeout(function(){f.remove();},1400);
  }
  cat.addEventListener('click',pet);
  cat.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pet();}});

  /* Begin once fonts/layout are ready so nothing reflows mid-intro */
  function begin(){
    if(started)return; started=true; fit();
    if(reduceMotion){finishing=true;cat.classList.add('out');sit();return;}
    skipBtn.classList.add('on'); later(start,700);
  }
  if(document.readyState==='complete')begin(); else window.addEventListener('load',begin);
})();
