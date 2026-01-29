import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{console.log("Event JS Loaded");const o=document.getElementById("event-full-details");if(console.log("Container found:",o),!o)return;const a=(()=>{const t=window.location.pathname.match(/\/events\/([a-zA-Z0-9-]+)/);return t?t[1]:null})();if(console.log("URL ID:",a),!a){console.error("No ID found in URL"),d("No event specified.");return}const p="https://opensheet.elk.sh/1_7lOYKJZ_cmJeMn3hZNggNmk58Wu2SdYjVtlQgG-7lQ/upcoming_events",h=e=>{if(!e)return"";const t=e.match(/\/d\/([a-zA-Z0-9_-]+)/);return t&&t[1]?`https://drive.google.com/thumbnail?id=${t[1]}&sz=w1920`:e};fetch(p).then(e=>e.json()).then(e=>{console.log("Data fetched:",e.length,"rows");const t=e.find(n=>{const c=n.Type||n.type||"event",l=n.Date||n.date;let s=n.id||n.Id||n.ID;return!s&&c&&l&&(s=`${c.toLowerCase().trim()}-${l}`),console.log(`Checking ID: ${s} vs URL: ${a}`),s===a});t?g(t):d("Event not found.")}).catch(e=>{console.error(e),d("Unable to load event details.")});function g(e){const t=e["Title "]||e.Title||e.title||"Untitled Event",n=e.Date||e.date,c=e.Time||e.time||"",l=e.Location||e.location||"",i=e.Address||e.address||"",s=e.Type||e.type||"Event",m=e.Description||e.description||"",u=e.Image||e.image,f=h(u)||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",r=e.Insta||e.insta,$=e.Tickets||e.tickets||"TBA";e.Form||e.form||e.Link;const v=new Date(n),b=isNaN(v)?n:v.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});o.innerHTML=`
                <div class="event-detail-header">
                    <img src="${f}" alt="${t}" class="event-detail-image">
                    <div class="event-detail-badge">${s}</div>
                </div>

                <div class="event-detail-content">
                    <h1 class="event-detail-title">${t}</h1>
                    
                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${b}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${c}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${l}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Tickets</span>
                            <span class="meta-value">${$}</span>
                        </div>
                    </div>

                    ${i?`<p class="event-address"><strong>Address:</strong> ${i}</p>`:""}
                    
                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${m||"No description available for this event."}</p>
                    </div>

                    <div class="event-actions">
                        <a href="/book/${a}" class="btn btn-primary">Book Tickets</a>
                        ${r?`<a href="${r}" target="_blank" class="btn btn-outline" style="margin-left: 10px;">View on Instagram ↗</a>`:""}
                    </div>
                </div>
            </div>
        `}function d(e){o.innerHTML=`
            <div class="error-state">
                <h3>${e}</h3>
                <a href="index.html#events" class="btn btn-outline" style="margin-top: 1rem;">Back to Events</a>
            </div>
        `}});
