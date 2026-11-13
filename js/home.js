/* Homepage room: intro, cat, light switch, Spanish note, shelf tooltips. */
(function(){
  var root=document.documentElement, $=function(id){return document.getElementById(id);};
  var stage=$('stage'), bubble=$('bubble'), typed=$('typed'), ghost=$('ghost'), typed2=$('typed2'), ghost2=$('ghost2'), line2=$('line2'), cursor=$('cursor'),
      cat=$('cat'), look=$('look'), skipBtn=$('skip'), themeToggle=$('themeToggle'), note=$('note'), noteWord=$('noteWord'), noteMean=$('noteMean'),
      metaTheme=document.querySelector('meta[name="theme-color"]'),
      metaScheme=document.querySelector('meta[name="color-scheme"]');
  var intro=typed.textContent.trim(), outro=typed2.textContent.trim();
  var reduceMotion=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqlScheme=window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var timers=[], started=false, skipped=false, finishing=false, interactive=false;
  function later(fn,ms){var id=setTimeout(fn,ms);timers.push(id);return id;}

  // Screen readers get the full text at once; the typed bubble is decorative.
  $('srText').textContent=intro+' '+outro; bubble.setAttribute('aria-hidden','true');
  // Typed text + invisible remainder keeps the bubble's final size and line breaks from the first character.
  typed.textContent=''; ghost.textContent=intro; typed2.textContent=''; ghost2.textContent=outro;

  /* Light switch = theme. First visit follows system/clock; manual override sticks. */
  var COLORS={light:'#e3e6de',dark:'#131816'};
  function systemTheme(){
    if(mqlScheme) return mqlScheme.matches?'dark':'light';
    var hour=new Date().getHours();
    return (hour>=6&&hour<18)?'light':'dark';
  }
  function applyTheme(t,schemeContent){
    root.setAttribute('data-theme',t);
    themeToggle.setAttribute('aria-label','Dark mode');
    themeToggle.setAttribute('aria-checked',t==='dark'?'true':'false');
    if(metaTheme)metaTheme.setAttribute('content',COLORS[t]);
    if(metaScheme&&schemeContent)metaScheme.setAttribute('content',schemeContent);
  }
  var initialSaved=null;
  try{initialSaved=localStorage.getItem('ms-theme');}catch(e){}
  var initialHasOverride=(initialSaved==='light'||initialSaved==='dark');
  applyTheme(root.getAttribute('data-theme')||'light',initialHasOverride?initialSaved:'light dark');
  themeToggle.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    var sys=systemTheme();
    if(next===sys){
      applyTheme(next,'light dark');
      try{localStorage.removeItem('ms-theme');}catch(e){}
    }else{
      applyTheme(next,next);
      try{localStorage.setItem('ms-theme',next);}catch(e){}
    }
  });
  if(mqlScheme){
    var onSchemeChange=function(){
      var saved=null;
      try{saved=localStorage.getItem('ms-theme');}catch(e){}
      if(saved!=='light'&&saved!=='dark'){applyTheme(systemTheme(),'light dark');}
    };
    if(mqlScheme.addEventListener)mqlScheme.addEventListener('change',onSchemeChange);
    else if(mqlScheme.addListener)mqlScheme.addListener(onSchemeChange);
  }
  window.addEventListener('storage',function(e){
    if(!e||e.key==='ms-theme'||e.key===null){
      var saved=null;
      try{saved=localStorage.getItem('ms-theme');}catch(e){}
      var hasOverride=(saved==='light'||saved==='dark');
      applyTheme(hasOverride?saved:systemTheme(),hasOverride?saved:'light dark');
    }
  });

  /* Sticky note: a Spanish word, picked by day, cycled on click */
  var WORDS=[['gato','cat'],['hogar','home'],['ventana','window'],['luna','moon'],['ajedrez','chess'],['brújula','compass'],['datos','data'],['azar','chance'],['tranquilo','calm'],['lluvia','rain'],['estadística','statistics'],['curioso','curious']];
  var wi=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5)%WORDS.length;
  function showWord(){var w=WORDS[wi];noteWord.textContent=w[0];noteMean.textContent=w[1];note.setAttribute('aria-label','Spanish word: '+w[0]+', meaning '+w[1]+'. Tap for another.');}
  showWord();
  note.addEventListener('click',function(){wi=(wi+1)%WORDS.length;showWord();note.classList.remove('flip');void note.offsetWidth;note.classList.add('flip');});

  /* Shelf tooltips (popover="hint" + interestfor, with WCAG 1.4.13 fallback) */
  var hasPopover=Object.hasOwn(HTMLElement.prototype,'popover');
  var hasInterest=('interestForElement' in HTMLButtonElement.prototype);
  var hasAnchor=window.CSS && CSS.supports('position-area: block-start');
  var triggers=Array.prototype.slice.call(document.querySelectorAll('.thing[interestfor]'));

  if(hasPopover){
    var probe=document.createElement('div');
    probe.popover='hint';
    if(probe.popover!=='hint'){
      document.addEventListener('beforetoggle',function(e){
        var t=e.target;
        if(t && t.getAttribute('popover')==='hint' && document.querySelector('[popovertarget="'+t.id+'"]')){
          if(e.newState==='open') t.popover='auto';
        }
      },true);
    }
    if(!hasAnchor){
      document.addEventListener('toggle',function(e){
        var t=e.target;
        if(!t || !t.classList || !t.classList.contains('tip') || e.newState!=='open') return;
        var btn=document.querySelector('[interestfor="'+t.id+'"]');
        if(!btn) return;
        var br=btn.getBoundingClientRect(), tr=t.getBoundingClientRect();
        var top=Math.max(8,br.top-tr.height-10);
        var left=Math.max(8,Math.min(window.innerWidth-tr.width-8,br.right-tr.width));
        t.style.top=top+'px';
        t.style.left=left+'px';
      },true);
    }
  }

  if(!hasInterest){
    var activeTip=null, closeTimer=0;
    function hideTip(tip){
      if(!tip) return;
      if(hasPopover && tip.matches(':popover-open')) tip.hidePopover();
      tip.classList.remove('tip-open');
      if(activeTip===tip) activeTip=null;
    }
    function showTip(tip,trigger){
      clearTimeout(closeTimer);
      if(activeTip && activeTip!==tip) hideTip(activeTip);
      activeTip=tip;
      if(hasPopover){
        if(!tip.matches(':popover-open')) tip.showPopover({source:trigger});
      }else{
        tip.classList.add('tip-open');
      }
    }
    function scheduleHide(tip){
      clearTimeout(closeTimer);
      closeTimer=setTimeout(function(){hideTip(tip);},160);
    }
    triggers.forEach(function(btn){
      var tip=$(btn.getAttribute('interestfor'));
      if(!tip) return;
      btn.addEventListener('pointerenter',function(e){if(e.pointerType!=='touch')showTip(tip,btn);});
      btn.addEventListener('pointerleave',function(e){if(e.pointerType!=='touch')scheduleHide(tip);});
      tip.addEventListener('pointerenter',function(){clearTimeout(closeTimer);});
      tip.addEventListener('pointerleave',function(){scheduleHide(tip);});
      btn.addEventListener('focus',function(){showTip(tip,btn);});
      btn.addEventListener('blur',function(){scheduleHide(tip);});
      btn.addEventListener('click',function(){showTip(tip,btn);});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape' && activeTip)hideTip(activeTip);});
    document.addEventListener('click',function(e){
      if(activeTip && !e.target.closest('.shelf-item')) hideTip(activeTip);
    });
  }

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
  cat.addEventListener('keydown',function(e){
    if(e.key==='Enter'){pet();}
    else if(e.key===' '){e.preventDefault();}
  });
  cat.addEventListener('keyup',function(e){
    if(e.key===' '){pet();}
  });

  /* Begin once fonts/layout are ready so nothing reflows mid-intro */
  function begin(){
    if(started)return; started=true; fit();
    if(reduceMotion){finishing=true;cat.classList.add('out');sit();return;}
    skipBtn.classList.add('on'); later(start,700);
  }
  if(document.readyState==='complete')begin(); else window.addEventListener('load',begin);
})();
