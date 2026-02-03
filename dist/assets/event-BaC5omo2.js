import{s as g}from"./supabase-DgD8GzGi.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{console.log("Event JS Loaded");const n=document.getElementById("event-full-details");if(console.log("Container found:",n),!n)return;const i=(()=>{const e=new URLSearchParams(window.location.search);if(e.get("id"))return e.get("id");const a=window.location.pathname.match(/\/events\/([a-zA-Z0-9-]+)/);return a?a[1]:null})();if(console.log("URL ID:",i),!i){console.error("No ID found in URL"),o("No event specified.");return}async function l(){try{const{data:e,error:t}=await g.from("events").select("*").eq("id",i).single();if(t)throw t;e?r(e):o("Event not found.")}catch(e){console.error("Error fetching event:",e),o("Unable to load event details.")}}l();function r(e){const t=e.title,a=e.date,c=e.location||"",d="Event",v=e.description||"",p=e.image_url||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",s=new Date(a),m=isNaN(s)?a:s.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),u=isNaN(s)?"":s.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),h=e.price>0?`₹${e.price}`:"Free";n.innerHTML=`
                <div class="event-detail-header">
                    <img src="${p}" alt="${t}" class="event-detail-image">
                    <div class="event-detail-badge">${d}</div>
                </div>

                <div class="event-detail-content">
                    <h1 class="event-detail-title">${t}</h1>
                    
                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${m}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${u}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${c}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Price</span>
                            <span class="meta-value">${h}</span>
                        </div>
                    </div>
                    
                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${v||"No description available for this event."}</p>
                    </div>

                    <div class="event-actions">
                ${new Date(e.date)<new Date?'<button class="btn btn-disabled" disabled style="opacity:0.6; cursor:not-allowed; border:1px solid #444; background:#333; color:#aaa; width:100%;">Event Ended</button>':`<a href="/book.html?id=${e.id}" class="btn btn-primary" style="width:100%; text-align:center;">Book Tickets</a>`}
                ${e.external_link?`<a href="${e.external_link}" target="_blank" class="btn btn-outline" style="margin-top:10px; width:100%; text-align:center; display:block;">View on Instagram 📸</a>`:""}
            </div>        </div>
                </div>
            </div>
        `}function o(e){n.innerHTML=`
            <div class="error-state">
                <h3>${e}</h3>
                <a href="/#events" class="btn btn-outline" style="margin-top: 1rem;">Back to Events</a>
            </div>
        `}});
