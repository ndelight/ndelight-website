import{s as h}from"./supabase-DgD8GzGi.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{const w=document.querySelector(".header");let k=window.scrollY;window.addEventListener("scroll",()=>{const o=window.scrollY;w.classList.toggle("scrolled",o>50),o>k&&o>100?w.classList.add("hidden"):w.classList.remove("hidden"),k=o});const p=document.querySelector(".menu-toggle"),m=document.querySelector(".nav");p&&m&&(p.addEventListener("click",()=>{m.classList.toggle("active"),p.classList.toggle("is-active");const t=m.querySelector(".nav-list");if(t&&!t.querySelector(".mobile-auth-btn")){const a=document.createElement("li");a.innerHTML='<a href="/login.html" class="btn btn-primary mobile-auth-btn">Login / Sign Up</a>',t.appendChild(a)}}),document.querySelectorAll(".nav-link").forEach(t=>{t.addEventListener("click",()=>{m.classList.remove("active"),p.classList.remove("is-active")})})),document.addEventListener("click",o=>{m.classList.contains("active")&&!m.contains(o.target)&&!p.contains(o.target)&&(m.classList.remove("active"),p.classList.remove("is-active"))});const x=new IntersectionObserver(o=>{o.forEach(t=>{t.isIntersecting&&t.target.classList.add("visible")})},{threshold:.1});document.querySelectorAll(".fade-in-up").forEach(o=>x.observe(o));const f=document.querySelector(".contact-form");f&&f.addEventListener("submit",o=>{o.preventDefault();const t=f.querySelector("button"),a=t.textContent;t.textContent="Sending...",t.disabled=!0,fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({name:f.querySelector("#name").value,email:f.querySelector("#email").value,message:f.querySelector("#message").value})}).then(e=>e.text()).then(e=>{try{const i=JSON.parse(e);i.result==="success"?(alert("Thank you! Your message has been sent successfully."),f.reset()):(alert("Something went wrong. Please try again later."),console.error("Script Error:",i))}catch(i){console.error("Submission Error:",i),alert("There was a technical issue sending your message. Please try again later.")}}).catch(e=>{alert("Network error. Please try again."),console.error("Fetch Error:",e)}).finally(()=>{t.textContent=a,t.disabled=!1})});const y=document.getElementById("events-container");if(y){let t=function(a){if(y.innerHTML="",!a||a.length===0){y.innerHTML=`
                    <div class="empty-state">
                        <p>No upcoming events found.</p>
                    </div>
                `;return}a.forEach((e,i)=>{const n=new Date(e.date),u=isNaN(n)?e.date:n.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),r=i*.1,s=document.createElement("div");s.className="event-card",s.style.animationDelay=`${r}s`,`${e.id}`;const c=e.image_url||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80";s.innerHTML=`
                    <a href="/event.html?id=${e.id}" class="event-image-link">
                        <img src="${c}" alt="${e.title}" loading="lazy">
                    </a>
                    <div class="event-details">
                        <span class="event-badge">Event</span>
                        <h3 class="event-title">${e.title}</h3>
                        <p class="event-date">${u}</p>
                        <p class="event-location">📍 ${e.location||"TBA"}</p>
                    </div>
                `,y.appendChild(s)})};async function o(){try{const a=new Date;a.setHours(0,0,0,0);const e=a.toISOString(),{data:i,error:n}=await h.from("events").select("*").gte("date",e).order("date",{ascending:!0}).limit(20);if(n)throw n;t(i)}catch(a){console.error("Error fetching events:",a),y.innerHTML=`
                    <div class="error-state">
                        <p>Unable to load events.</p>
                    </div>
                `}}o()}const v=document.getElementById("portfolio-container");if(v){async function o(){try{const{data:t,error:a}=await h.from("featured_events").select("*, events(*)").order("display_order",{ascending:!0});if(a)throw a;if(!t||t.length===0){v.innerHTML='<p class="text-muted text-center">More work coming soon.</p>';return}v.innerHTML="",t.forEach((e,i)=>{const n=e.events;if(!n)return;const u=n.title,r=n.image_url||"https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80",s=`/event.html?id=${n.id}`,c=i*.15,l=document.createElement("div");l.className="portfolio-item",l.style.animation=`fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${c}s`,l.style.opacity="0",l.onclick=()=>{n.external_link?window.open(n.external_link,"_blank"):window.location.href=s},l.style.cursor="pointer",l.innerHTML=`
                        <img src="${r}" alt="${u}" loading="lazy">
                        <div class="portfolio-overlay">
                            <h3 class="portfolio-title">${u}</h3>
                        </div>
                    `,v.appendChild(l)})}catch(t){console.error("Error fetching featured:",t),v.innerHTML='<p class="text-muted text-center">Unable to load featured work.</p>'}}o()}const b=document.getElementById("influencers-container");if(b){async function o(){try{const{data:t,error:a}=await h.from("influencers").select("*, profiles(full_name)").eq("active",!0);if(a)throw a;if(!t||t.length===0){b.innerHTML='<p class="text-muted text-center">Join our network of influencers.</p>';return}b.innerHTML="",t.forEach((e,i)=>{let n="Influencer";e.profiles&&(Array.isArray(e.profiles)&&e.profiles.length>0?n=e.profiles[0].full_name||n:typeof e.profiles=="object"&&(n=e.profiles.full_name||n)),n==="Influencer"&&(e.name||e.full_name)&&(n=e.name||e.full_name);const u=e.image_url||"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",r=i*.1,s=document.createElement("div");s.className="influencer-card",s.style.animation=`fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${r}s`,s.style.opacity="0";let c="";e.instagram&&(c+=`<a href="${e.instagram}" target="_blank" title="Instagram" class="social-icon insta"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Insta" class="social-icon-img"></a>`),e.facebook&&(c+=`<a href="${e.facebook}" target="_blank" title="Facebook" class="social-icon fb"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="FB" class="social-icon-img"></a>`),e.youtube&&(c+=`<a href="${e.youtube}" target="_blank" title="YouTube" class="social-icon yt"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YT" class="social-icon-img"></a>`),c||(c='<span class="text-muted" style="font-size:0.8rem;">Socials coming soon</span>'),s.innerHTML=`
                    <div class="influencer-img-wrapper">
                        <img src="${u}" alt="${n}" loading="lazy">
                    </div>
                    <div class="influencer-info">
                        <h3 class="influencer-name">${n}</h3>
                        <div class="influencer-contact social-links">
                            ${c}
                        </div>
                    </div>
                `,b.appendChild(s)})}catch(t){console.error("Error fetching influencers:",t),b.innerHTML='<p class="text-muted text-center">Unable to load influencers.</p>'}}o()}const g=document.querySelector(".header-cta");g&&S();async function S(){const{data:{session:o}}=await h.auth.getSession();if(!o)return;const{data:t}=await h.from("profiles").select("*").eq("id",o.user.id).single(),a=t?t.full_name:"User",e=t?t.role:"user",i=a.charAt(0).toUpperCase(),n=g.querySelector('a[href="/login.html"].nav-link'),u=g.querySelector('a[href="/login.html"].btn');n&&(n.style.display="none"),u&&(u.style.display="none");const r=document.createElement("div");r.className="auth-profile-dropdown",Object.assign(r.style,{position:"relative",marginRight:window.innerWidth<768?"3.5rem":"1.5rem",cursor:"pointer",display:"inline-block",zIndex:"1100"}),r.innerHTML=`
        <div class="profile-trigger" style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 38px; height: 38px; background: #ffd700; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                ${i}
            </div>
            <span class="desktop-only" style="color: #fff; font-size: 0.95rem; font-weight: 500;">${a.split(" ")[0]}</span>
            <span style="color: #ffd700; font-size: 1.2rem; margin-left: 2px;">▼</span> <!-- Larger Arrow -->
        </div>
        
        <div class="profile-menu" style="
            display: none;
            position: absolute;
            top: 120%;
            right: 0;
            background: #1e1e1e;
            border: 1px solid #ffd700;
            border-radius: 8px;
            min-width: 200px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.8);
            padding: 0.5rem 0;
            z-index: 1000;
        ">
            ${e==="influencer"||e==="admin"?`
            <a href="/${e}/" style="display: block; padding: 12px 20px; color: #fff; text-decoration: none; font-size: 1rem; border-bottom: 1px solid #333;">
                Dashboard
            </a>`:""}
            <div id="header-logout" style="display: block; padding: 12px 20px; color: #ff4d4d; text-decoration: none; font-size: 1rem; cursor: pointer;">
                Sign Out
            </div>
        </div>
    `;const s=g.querySelector(".menu-toggle");s?g.insertBefore(r,s):g.appendChild(r);const c=r.querySelector(".profile-trigger"),l=r.querySelector(".profile-menu");c.addEventListener("click",d=>{d.stopPropagation();const E=l.style.display==="none"||l.style.display==="";l.style.display=E?"block":"none"}),document.addEventListener("click",d=>{r.contains(d.target)||(l.style.display="none")}),l.querySelectorAll("a, div").forEach(d=>{d.addEventListener("mouseenter",()=>d.style.background="#333"),d.addEventListener("mouseleave",()=>d.style.background="transparent")});const L=r.querySelector("#header-logout");L&&L.addEventListener("click",async d=>{d.stopPropagation(),await h.auth.signOut(),window.location.reload()})}});
