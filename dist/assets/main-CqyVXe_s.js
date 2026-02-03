import{s as h}from"./supabase-DgD8GzGi.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{const w=document.querySelector(".header");let k=window.scrollY;window.addEventListener("scroll",()=>{const n=window.scrollY;w.classList.toggle("scrolled",n>50),n>k&&n>100?w.classList.add("hidden"):w.classList.remove("hidden"),k=n});const p=document.querySelector(".menu-toggle"),m=document.querySelector(".nav");p&&m&&(p.addEventListener("click",()=>{m.classList.toggle("active"),p.classList.toggle("is-active");const e=m.querySelector(".nav-list");if(e&&!e.querySelector(".mobile-auth-btn")){const o=document.createElement("li");o.innerHTML='<a href="/login.html" class="btn btn-primary mobile-auth-btn">Login / Sign Up</a>',e.appendChild(o)}}),document.querySelectorAll(".nav-link").forEach(e=>{e.addEventListener("click",()=>{m.classList.remove("active"),p.classList.remove("is-active")})})),document.addEventListener("click",n=>{m.classList.contains("active")&&!m.contains(n.target)&&!p.contains(n.target)&&(m.classList.remove("active"),p.classList.remove("is-active"))});const x=new IntersectionObserver(n=>{n.forEach(e=>{e.isIntersecting&&e.target.classList.add("visible")})},{threshold:.1});document.querySelectorAll(".fade-in-up").forEach(n=>x.observe(n));const f=document.querySelector(".contact-form");f&&f.addEventListener("submit",n=>{n.preventDefault();const e=f.querySelector("button"),o=e.textContent;e.textContent="Sending...",e.disabled=!0,fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({name:f.querySelector("#name").value,email:f.querySelector("#email").value,message:f.querySelector("#message").value})}).then(t=>t.text()).then(t=>{try{const i=JSON.parse(t);i.result==="success"?(alert("Thank you! Your message has been sent successfully."),f.reset()):(alert("Something went wrong. Please try again later."),console.error("Script Error:",i))}catch(i){console.error("Submission Error:",i),alert("There was a technical issue sending your message. Please try again later.")}}).catch(t=>{alert("Network error. Please try again."),console.error("Fetch Error:",t)}).finally(()=>{e.textContent=o,e.disabled=!1})});const y=document.getElementById("events-container");if(y){let e=function(o){if(y.innerHTML="",!o||o.length===0){y.innerHTML=`
                    <div class="empty-state">
                        <p>No upcoming events found.</p>
                    </div>
                `;return}o.forEach((t,i)=>{const r=new Date(t.date),u=isNaN(r)?t.date:r.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),a=i*.1,s=document.createElement("div");s.className="event-card",s.style.animationDelay=`${a}s`,`${t.id}`;const c=t.image_url||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80";s.innerHTML=`
                    <a href="/event.html?id=${t.id}" class="event-image-link">
                        <img src="${c}" alt="${t.title}" loading="lazy">
                    </a>
                    <div class="event-details">
                        <span class="event-badge">Event</span>
                        <h3 class="event-title">${t.title}</h3>
                        <p class="event-date">${u}</p>
                        <p class="event-location">📍 ${t.location||"TBA"}</p>
                    </div>
                `,y.appendChild(s)})};async function n(){try{const o=new Date;o.setHours(0,0,0,0);const t=o.toISOString(),{data:i,error:r}=await h.from("events").select("*").gte("date",t).order("date",{ascending:!0}).limit(20);if(r)throw r;e(i)}catch(o){console.error("Error fetching events:",o),y.innerHTML=`
                    <div class="error-state">
                        <p>Unable to load events.</p>
                    </div>
                `}}n()}const v=document.getElementById("portfolio-container");if(v){async function n(){try{const{data:e,error:o}=await h.from("featured_events").select("*, events(*)").order("display_order",{ascending:!0});if(o)throw o;if(!e||e.length===0){v.innerHTML='<p class="text-muted text-center">More work coming soon.</p>';return}v.innerHTML="",e.forEach((t,i)=>{const r=t.events;if(!r)return;const u=r.title,a=r.image_url||"https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80",s=`/event.html?id=${r.id}`,c=i*.15,l=document.createElement("div");l.className="portfolio-item",l.style.animation=`fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${c}s`,l.style.opacity="0",l.onclick=()=>{r.external_link?window.open(r.external_link,"_blank"):window.location.href=s},l.style.cursor="pointer",l.innerHTML=`
                        <img src="${a}" alt="${u}" loading="lazy">
                        <div class="portfolio-overlay">
                            <h3 class="portfolio-title">${u}</h3>
                        </div>
                    `,v.appendChild(l)})}catch(e){console.error("Error fetching featured:",e),v.innerHTML='<p class="text-muted text-center">Unable to load featured work.</p>'}}n()}const b=document.getElementById("influencers-container");if(b){async function n(){try{const{data:e,error:o}=await h.from("influencers").select("*, profiles(full_name)").eq("active",!0);if(o)throw o;if(!e||e.length===0){b.innerHTML='<p class="text-muted text-center">Join our network of influencers.</p>';return}b.innerHTML="",e.forEach((t,i)=>{const r=t.profiles&&t.profiles.full_name||"Influencer",u=t.image_url||"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",a=i*.1,s=document.createElement("div");s.className="influencer-card",s.style.animation=`fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${a}s`,s.style.opacity="0";let c="";t.instagram&&(c+=`<a href="${t.instagram}" target="_blank" title="Instagram" class="social-icon insta"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Insta"></a>`),t.facebook&&(c+=`<a href="${t.facebook}" target="_blank" title="Facebook" class="social-icon fb"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="FB"></a>`),t.youtube&&(c+=`<a href="${t.youtube}" target="_blank" title="YouTube" class="social-icon yt"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YT"></a>`),c||(c='<span class="text-muted" style="font-size:0.8rem;">Socials coming soon</span>'),s.innerHTML=`
                        <div class="influencer-img-wrapper">
                            <img src="${u}" alt="${r}" loading="lazy">
                        </div>
                        <h3 class="influencer-name">${r}</h3>
                        <div class="influencer-contact social-links">
                            ${c}
                        </div>
                    `,b.appendChild(s)})}catch(e){console.error("Error fetching influencers:",e),b.innerHTML='<p class="text-muted text-center">Unable to load influencers.</p>'}}n()}const g=document.querySelector(".header-cta");g&&S();async function S(){const{data:{session:n}}=await h.auth.getSession();if(!n)return;const{data:e}=await h.from("profiles").select("*").eq("id",n.user.id).single(),o=e?e.full_name:"User",t=e?e.role:"user",i=o.charAt(0).toUpperCase(),r=g.querySelector('a[href="/login.html"].nav-link'),u=g.querySelector('a[href="/login.html"].btn');r&&(r.style.display="none"),u&&(u.style.display="none");const a=document.createElement("div");a.className="auth-profile-dropdown",Object.assign(a.style,{position:"relative",marginRight:window.innerWidth<768?"3.5rem":"1.5rem",cursor:"pointer",display:"inline-block",zIndex:"1100"}),a.innerHTML=`
        <div class="profile-trigger" style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 38px; height: 38px; background: #ffd700; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                ${i}
            </div>
            <span class="desktop-only" style="color: #fff; font-size: 0.95rem; font-weight: 500;">${o.split(" ")[0]}</span>
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
            ${t==="influencer"||t==="admin"?`
            <a href="/${t}/" style="display: block; padding: 12px 20px; color: #fff; text-decoration: none; font-size: 1rem; border-bottom: 1px solid #333;">
                Dashboard
            </a>`:""}
            <div id="header-logout" style="display: block; padding: 12px 20px; color: #ff4d4d; text-decoration: none; font-size: 1rem; cursor: pointer;">
                Sign Out
            </div>
        </div>
    `;const s=g.querySelector(".menu-toggle");s?g.insertBefore(a,s):g.appendChild(a);const c=a.querySelector(".profile-trigger"),l=a.querySelector(".profile-menu");c.addEventListener("click",d=>{d.stopPropagation();const E=l.style.display==="none"||l.style.display==="";l.style.display=E?"block":"none"}),document.addEventListener("click",d=>{a.contains(d.target)||(l.style.display="none")}),l.querySelectorAll("a, div").forEach(d=>{d.addEventListener("mouseenter",()=>d.style.background="#333"),d.addEventListener("mouseleave",()=>d.style.background="transparent")});const L=a.querySelector("#header-logout");L&&L.addEventListener("click",async d=>{d.stopPropagation(),await h.auth.signOut(),window.location.reload()})}});
