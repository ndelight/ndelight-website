import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css              */document.addEventListener("DOMContentLoaded",()=>{console.log("Event JS Loaded");const c=document.getElementById("event-full-details");if(console.log("Container found:",c),!c)return;const o=(()=>{const n=window.location.pathname.match(/\/events\/([a-zA-Z0-9-]+)/);return n?n[1]:null})();if(console.log("URL ID:",o),!o){console.error("No ID found in URL"),l("No event specified.");return}const p="https://script.google.com/macros/s/AKfycby6Vn7zF3wTGLWbchur1GGXbWy9w-X--_ry1Bc9Mwrss9s3Wpk_XPIhTHi8ZA6Lans_/exec",h=e=>{if(!e)return"";let n="";const t=e.match(/\/d\/([a-zA-Z0-9_-]+)/);t&&t[1]&&(n=t[1]);const a=e.match(/id=([a-zA-Z0-9_-]+)/);return a&&a[1]&&(n=a[1]),n?`https://drive.google.com/thumbnail?id=${n}&sz=w1920`:e};fetch(`${p}?action=get_events`).then(e=>e.json()).then(e=>{console.log("Data fetched:",e.length,"rows");const n=e.find(t=>{const a=t.Type||t.type||"event",i=t.Date||t.date;let s=t.id||t.Id||t.ID;return!s&&a&&i&&(s=`${a.toLowerCase().trim()}-${i}`),console.log(`Checking ID: ${s} vs URL: ${o}`),s===o});n?g(n):l("Event not found.")}).catch(e=>{console.error(e),l("Unable to load event details.")});function g(e){const n=e["Title "]||e.Title||e.title||"Untitled Event",t=e.Date||e.date,a=e.Time||e.time||"",i=e.Location||e.location||"",d=e.Address||e.address||"",s=e.Type||e.type||"Event",m=e.Description||e.description||"",f=e.Image||e.image,u=h(f)||"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",r=e.Insta||e.insta,b=e.Tickets||e.tickets||"TBA";e.Form||e.form||e.Link;const v=new Date(t),$=isNaN(v)?t:v.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});c.innerHTML=`
                <div class="event-detail-header">
                    <img src="${u}" alt="${n}" class="event-detail-image">
                    <div class="event-detail-badge">${s}</div>
                </div>

                <div class="event-detail-content">
                    <h1 class="event-detail-title">${n}</h1>
                    
                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${$}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${a}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${i}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Tickets</span>
                            <span class="meta-value">${b}</span>
                        </div>
                    </div>

                    ${d?`<p class="event-address"><strong>Address:</strong> ${d}</p>`:""}
                    
                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${m||"No description available for this event."}</p>
                    </div>

                    <div class="event-actions">
                        <a href="/book/${o}" class="btn btn-primary">Book Tickets</a>
                        ${r?`<a href="${r}" target="_blank" class="btn btn-outline" style="margin-left: 10px;">View on Instagram ↗</a>`:""}
                    </div>
                </div>
            </div>
        `}function l(e){c.innerHTML=`
            <div class="error-state">
                <h3>${e}</h3>
                <a href="index.html#events" class="btn btn-outline" style="margin-top: 1rem;">Back to Events</a>
            </div>
        `}});
