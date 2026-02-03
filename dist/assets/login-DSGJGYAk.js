import{s as i}from"./supabase-DgD8GzGi.js";/* empty css              */const g=document.getElementById("authForm"),x=document.getElementById("email"),w=document.getElementById("password"),u=document.getElementById("fullName"),f=document.getElementById("nameGroup"),a=document.getElementById("submitBtn"),c=document.getElementById("toggleBtn"),p=document.getElementById("toggleText"),o=document.getElementById("message"),y=document.querySelector(".login-title");let d=!1,h=!1;c.addEventListener("click",t=>{t.preventDefault(),d=!d,d?(y.textContent="Join NDelight",a.textContent="Create Account",p.textContent="Already have an account?",c.textContent="Sign In",f.style.display="block",document.getElementById("influencerGroup").style.display="flex",u.required=!0):(y.textContent="NDelight",a.textContent="Sign In",p.textContent="New here?",c.textContent="Create Account",f.style.display="none",document.getElementById("influencerGroup").style.display="none",u.required=!1),o.textContent="",o.className="message"});const b=document.getElementById("influencerCheck");b&&b.addEventListener("change",t=>{h=t.target.checked});g.addEventListener("submit",async t=>{t.preventDefault();const r=x.value,l=w.value,e=u.value;a.disabled=!0,a.textContent="Processing...",o.textContent="",o.className="message";try{if(d){const{data:n,error:s}=await i.auth.signUp({email:r,password:l,options:{data:{full_name:e,full_name:e,role:h?"pending_influencer":"user"}}});if(s)throw s;n.session?m(n.user.id):(o.textContent="Account created! Please sign in.",o.classList.add("success"),c.click())}else{const{data:n,error:s}=await i.auth.signInWithPassword({email:r,password:l});if(s)throw s;m(n.user.id)}}catch(n){console.error("Auth error:",n),o.textContent=n.message,o.classList.add("error"),a.disabled=!1,a.textContent=d?"Create Account":"Sign In"}});async function m(t){var r,l;try{const{data:e,error:n}=await i.from("profiles").select("role").eq("id",t).single();if(n)throw n;(e==null?void 0:e.role)==="admin"?window.location.href="/admin/":(e==null?void 0:e.role)==="influencer"?window.location.href="/influencer/":(e==null?void 0:e.role)==="pending_influencer"?(await i.auth.signOut(),o.innerHTML=`
                <div style="color: #ffd700; background: rgba(255, 215, 0, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid #ffd700;">
                    <h3>Application Received ⏳</h3>
                    <p>Your influencer application is pending approval.</p>
                </div>
             `,g.style.display="block",(r=document.getElementById("continueBtn"))==null||r.remove(),(l=document.getElementById("logoutBtn"))==null||l.remove()):window.location.href="/"}catch(e){console.error("Role check failed:",e),window.location.href="/"}}i.auth.getSession().then(async({data:{session:t}})=>{if(t){g.style.display="none",document.querySelector(".login-subtitle").style.display="none",document.querySelector("p").style.display="none";const{data:r}=await i.from("profiles").select("full_name, role, email").eq("id",t.user.id).single(),l=r?r.full_name:"User",e=r?r.role:"user",n=e==="influencer"?"🌟 Influencer":e==="admin"?"🛡️ Admin":"👤 Member";o.innerHTML=`
            <div style="background: #2a2a2a; padding: 2rem; border-radius: 12px; border: 1px solid #444; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <div style="width: 60px; height: 60px; background: #ffd700; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">
                    ${l.charAt(0).toUpperCase()}
                </div>
                <h3 style="color: #fff; margin-bottom: 0.2rem;">${l}</h3>
                <p style="color: #888; font-size: 0.9rem; margin-bottom: 0.5rem;">${t.user.email}</p>
                <div style="display:inline-block; padding: 4px 12px; background: rgba(255, 215, 0, 0.1); border: 1px solid #ffd700; border-radius: 20px; color: #ffd700; font-size: 0.8rem; margin-bottom: 1.5rem;">
                    ${n}
                </div>
                
                <button id="continueBtn" class="btn-login" style="margin-bottom: 0.8rem;">
                    Go to Dashboard →
                </button>
                <button id="logoutBtn" class="btn-login" style="background: transparent; border: 1px solid #444; color: #ccc;">
                    Sign Out
                </button>
            </div>
        `,o.classList.add("success"),document.getElementById("continueBtn").addEventListener("click",()=>{m(t.user.id)}),document.getElementById("logoutBtn").addEventListener("click",async()=>{await i.auth.signOut(),window.location.reload()})}});
