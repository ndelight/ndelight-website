import{s as h}from"./supabase-DgD8GzGi.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{console.log("Event JS Loaded");const a=document.getElementById("event-full-details");if(console.log("Container found:",a),!a)return;const o=(()=>{const e=new URLSearchParams(window.location.search);if(e.get("id"))return e.get("id");const n=window.location.pathname.match(/\/events\/([a-zA-Z0-9-]+)/);return n?n[1]:null})();if(console.log("URL ID:",o),!o){console.error("No ID found in URL"),i("No event specified.");return}async function c(){try{const{data:e,error:t}=await h.from("events").select("*").eq("id",o).single();if(t)throw t;e?r(e):i("Event not found.")}catch(e){console.error("Error fetching event:",e),i("Unable to load event details.")}}c();function r(e){const t=e.title,n=e.date,d=e.description||"",v=e.image_url||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",m="Event",p=e.location||"TBA",u=e.price>0?`₹${e.price}`:"Free",l=e.external_link,s=new Date(n),b=isNaN(s)?n:s.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),f=isNaN(s)?"":s.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),g=new Date(e.date)<new Date;a.innerHTML=`
            <div class="event-premium-wrapper fade-in-up">
                <!-- Visuals -->
                <div class="event-visuals">
                    <span class="event-type-badge">${m}</span>
                    <img src="${v}" alt="${t}" class="event-main-image">
                </div>

                <!-- Info -->
                <div class="event-info">
                    <h1 class="event-title">${t}</h1>

                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${b}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${f||"TBA"}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${p}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Price</span>
                            <span class="meta-value">${u}</span>
                        </div>
                    </div>

                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${d}</p>
                    </div>

                    <div class="event-actions">
                        ${g?'<button class="btn btn-disabled btn-block" disabled>Event Ended</button>':`<a href="/book.html?id=${e.id}" class="btn btn-primary btn-block">Book Tickets</a>`}
                        
                        ${l?`<a href="${l}" target="_blank" class="btn btn-outline btn-block">View on Instagram 📸</a>`:""}
                    </div>
                </div>
            </div>
        `}function i(e){a.innerHTML=`
            <div class="error-state" style="padding: 4rem 0; text-align: center;">
                <h3 style="color: #aaa; margin-bottom: 1rem;">${e}</h3>
                <a href="/#events" class="btn btn-outline">Back to Events</a>
            </div>
        `}});
