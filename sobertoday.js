document.addEventListener("DOMContentLoaded", () => {
    const nå = new Date();
    const today = new Date(nå.getTime() - (nå.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // --- SIKKER MIGRERING (Unngår krasj hvis gammel historikk har feil) ---
    try {
        let rawHistory = localStorage.getItem('journalHistory');
        if (rawHistory) {
            let initHistory = JSON.parse(rawHistory);
            if (Array.isArray(initHistory)) {
                let needsSave = false;
                // Fjerner ødelagte/tomme linjer
                initHistory = initHistory.filter(entry => entry && typeof entry === 'object');
                initHistory.forEach((entry, idx) => {
                    if (!entry.id) { entry.id = crypto.randomUUID(); needsSave = true; }
                    if (entry.starred === undefined) { entry.starred = false; needsSave = true; }
                });
                if (needsSave) localStorage.setItem('journalHistory', JSON.stringify(initHistory));
            }
        }
    } catch(e) {
        console.error("Feil ved oppdatering av historikk, nullstiller liste.", e);
        localStorage.setItem('journalHistory', JSON.stringify([]));
    }

    // --- FELLES IMPORT LOGIKK ---
    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (data.sobrietyStartDate) localStorage.setItem('sobrietyStartDate', data.sobrietyStartDate);
                if (data.lastCheckInDate) localStorage.setItem('lastCheckInDate', data.lastCheckInDate);
                
                // Validering: Sjekker at det faktisk er en array før lagring
                if (data.journalHistory && Array.isArray(data.journalHistory)) { 
                    localStorage.setItem('journalHistory', JSON.stringify(data.journalHistory));
                }
                
                if (data.motivationMessage) localStorage.setItem('motivationMessage', data.motivationMessage);
                
                if(window.location.pathname.includes('settings.html')) {
                    alert("Data imported! Taking you to My page.");
                    window.location.href = "dashboard.html";
                } else {
                    alert("Data imported! Reloading the page.");
                    location.reload();
                }
            } catch (err) {
                alert("Something went wrong. Are you sure you selected the correct JSON file?");
            }
        };
        reader.readAsText(file);
    }

    // ==========================================
    // LOGIKK FOR: INDEX.HTML (Forsiden)
    // ==========================================
    if (document.getElementById('checkin-container')) {
        const lastCheckIn = localStorage.getItem('lastCheckInDate');
        if (lastCheckIn === today) {
            window.location.href = 'dashboard.html';
        }

        let selectedMood = null;
        const moodOptions = document.querySelectorAll('.mood-option');

        moodOptions.forEach(option => {
            option.addEventListener('click', function() {
                moodOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                selectedMood = this.getAttribute('data-mood');
            });
        });

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                if (!selectedMood) {
                    alert("Please select a mood before checking in.");
                    return;
                }
                const journalText = document.getElementById('journal-entry').value;
                
                const entry = { id: crypto.randomUUID(), date: today, mood: selectedMood, text: journalText, starred: false };
                let journalHistory = JSON.parse(localStorage.getItem('journalHistory')) || [];
                
                journalHistory.push(entry);
                localStorage.setItem('journalHistory', JSON.stringify(journalHistory));
                localStorage.setItem('lastCheckInDate', today);

                window.location.href = 'dashboard.html';
            });
        }
    }

    // ==========================================
    // LOGIKK FOR: DASHBOARD.HTML (Dashbord)
    // ==========================================
    if (document.getElementById('dashboard') || document.getElementById('setup-date')) {
        let startDateStr = localStorage.getItem('sobrietyStartDate');
        const setupDiv = document.getElementById('setup-date');
        const dashboardDiv = document.getElementById('dashboard');
        
        const startDateInput = document.getElementById('start-date-input');
        const startTimeInput = document.getElementById('start-time-input');

        if (!startDateStr) {
            if (setupDiv) setupDiv.style.display = 'block';

            if (startDateInput && startTimeInput) {
                const maxDate = new Date(nå);
                maxDate.setDate(maxDate.getDate() + 21);
                startDateInput.max = maxDate.toISOString().split('T')[0];
                
                startDateInput.value = today;
                startTimeInput.value = "00:00";
            }

            const saveDateBtn = document.getElementById('save-date-btn');
            if (saveDateBtn) {
                saveDateBtn.addEventListener('click', function() {
                    const selectedDate = startDateInput.value;
                    const selectedTime = startTimeInput.value || "00:00";
                    const motivationMsg = document.getElementById('motivation-input') ? document.getElementById('motivation-input').value : "";
                    
                    if (!selectedDate) { alert("Please select a date."); return; }
                    
                    localStorage.setItem('sobrietyStartDate', `${selectedDate}T${selectedTime}`);
                    if (motivationMsg.trim() !== "") {
                        localStorage.setItem('motivationMessage', motivationMsg);
                    }
                    location.reload();
                });
            }
            
            const fileInputSetup = document.getElementById('file-input-setup');
            const btnImportSetup = document.getElementById('btn-import-setup');
            if (btnImportSetup && fileInputSetup) {
                btnImportSetup.addEventListener('click', () => fileInputSetup.click());
                fileInputSetup.addEventListener('change', handleImport);
            }
        } else {
            if (dashboardDiv) dashboardDiv.style.display = 'block';

            // Liste med oppmuntrende ord for sitat-seksjonen
            const oppmuntrendeOrd = [
                "Take one day at a time. If it works, take the next day too. Repeat.",
                "You do not have to decide for a week or a month. You are simply choosing not to drink right now.",
                "The choice is always in the present moment, and you are in control.",
                "Every sober day is a gift to yourself and your future.",
                "Focus on the here and now. We will deal with tomorrow when it comes.",
                "You are building a new, stronger version of yourself, one step at a time."
            ];

            function updateDashboard() {
                const now = new Date();
                const currentLocalDay = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                const lastCheckIn = localStorage.getItem('lastCheckInDate');
                
                if (lastCheckIn && lastCheckIn !== currentLocalDay) {
                    window.location.href = "/";
                    return; 
                }

                const startDate = new Date(startDateStr);
                
                if (isNaN(startDate.getTime())) {
                    if (document.getElementById('time-display')) {
                        document.getElementById('time-display').innerText = "Oops! The date is invalid. Try resetting the app.";
                    }
                    return;
                }

                const diffMs = now - startDate;
                const isFuture = diffMs < 0; 
                
                const absDiffMs = Math.abs(diffMs);
                const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                const timeDisplay = document.getElementById('time-display');
                const successTitle = document.getElementById('success-title');
                const badgeImg = document.getElementById('badge-display');
                const badgeText = document.getElementById('badge-text');
                const statsText = document.querySelector('.stats'); 
                const quoteText = document.getElementById('quoteText'); 
                
                const dagTekst = diffDays === 1 ? "day" : "days";
                const timeTekst = diffHours === 1 ? "hour" : "hours";

                if (timeDisplay) {
                    timeDisplay.innerText = `${diffDays} ${dagTekst}\nand ${diffHours} ${timeTekst}`;
                }

                const motivationBox = document.getElementById('personal-motivation-box');
                const motivationText = document.getElementById('personal-motivation-text');
                const savedMessage = localStorage.getItem('motivationMessage');

                if (savedMessage && motivationBox && motivationText) {
                    if (isFuture || diffDays <= 7) {
                        motivationBox.style.display = 'block';
                        motivationText.innerText = savedMessage;
                    } else {
                        motivationBox.style.display = 'none';
                    }
                }

                // Hovedlogikk for visning (Fremtid vs. Startet)
                if (isFuture) {
                    if (successTitle) successTitle.innerText = "We can do this!";
                    if (statsText) statsText.innerText = "Your journey starts in";
                    if (badgeImg) badgeImg.style.display = 'none';
                    if (badgeText) badgeText.innerText = "Your journey starts soon!";
                    
                    // Viser et sitat også mens man venter på at reisen starter
                    if (quoteText) {
                        quoteText.style.display = 'block'; 
                        quoteText.innerText = oppmuntrendeOrd[1]; // Viser et relevant sitat i ventetiden
                    }
                } else {
                    if (statsText) statsText.innerText = "You have now been sober for";
                    if (quoteText) quoteText.style.display = 'block'; 
                    
                    if (successTitle) {
                        if (diffDays === 0) { 
                            successTitle.innerText = "A smart start!"; 
                        } 
                        else if (diffDays > 0 && diffDays % 7 === 0) { 
                            let uker = diffDays / 7;
                            successTitle.innerText = `Week ${uker} complete!`; 
                        } 
                        else if (diffDays === 1) { successTitle.innerText = "Great work! Your first day is complete."; }
                        else if (diffDays === 2) { successTitle.innerText = "You can do this!"; }
                        else if (diffDays === 3) { successTitle.innerText = "This is how you take care of yourself!"; }
                        else if (diffDays === 4) { successTitle.innerText = "Connect with sober communities!"; }
                        else if (diffDays === 5) { successTitle.innerText = "You are not alone!"; }
                        else if (diffDays === 6) { successTitle.innerText = "Almost a whole week!"; }
                        else { 
                            successTitle.innerText = "Great work!"; 
                        }
                    }

                    if (quoteText) {
                        let sitatIndeks = diffDays % oppmuntrendeOrd.length;
                        quoteText.innerText = oppmuntrendeOrd[sitatIndeks];
                    }

                    // Utmerkelsene beregnes KUN hvis reisen er i gang
                    if (badgeImg && badgeText) {
                        if (diffDays >= 365) { 
                            badgeImg.src = "images/badges/1-year.webp"; 
                            badgeText.innerText = "Next goal: Keep up the good habit!"; 
                            badgeImg.style.display = 'inline';
                        }
                        else if (diffDays >= 30) { 
                            badgeImg.src = "images/badges/1-month.webp"; 
                            badgeText.innerText = "Your next badge is at 1 year"; 
                            badgeImg.style.display = 'inline';
                        }
                        else if (diffDays >= 10) { 
                            badgeImg.src = "images/badges/10-days.webp"; 
                            badgeText.innerText = "Your next badge is at 1 month"; 
                            badgeImg.style.display = 'inline';
                        }
                        else if (diffDays >= 5) { 
                            badgeImg.src = "images/badges/5-days.webp"; 
                            badgeText.innerText = "Your next badge is at 10 days"; 
                            badgeImg.style.display = 'inline';
                        }
                        else if (diffDays >= 1) { 
                            badgeImg.src = "images/badges/1-day.webp"; 
                            badgeText.innerText = "Your next badge is at 5 days"; 
                            badgeImg.style.display = 'inline';
                        }
                        else { 
                            badgeImg.style.display = 'none'; 
                            badgeText.innerText = "Your first badge is at 1 day!"; 
                        }
                    }
                }
            }
            
            updateDashboard();
            setInterval(updateDashboard, 60000);
        }
    }

    // ==========================================
    // FELLES LOGIKK FOR HISTORIKK & NOTATER
    // ==========================================
    const historyWrapper = document.getElementById('history-wrapper');
    if (historyWrapper) {
        const emojis = { "1": "😠", "2": "😟", "3": "😐", "4": "🙂", "5": "🤩", "note": "📝" };
        let currentPage = 1;
        const itemsPerPage = 7;
        
        function renderHistory() {
            const historySection = document.getElementById('history-section');
            const paginationControls = document.getElementById('pagination-controls');
            if(!historySection) return;

            historySection.innerHTML = '';
            
            let currentHistory = JSON.parse(localStorage.getItem('journalHistory')) || [];
            currentHistory = currentHistory.filter(entry => entry && typeof entry === 'object' && entry.date);

            if (currentHistory.length === 0) {
                historySection.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No history yet.</p>';
                if(paginationControls) paginationControls.style.display = 'none';
                return;
            }
            
            // Sorterer etter stjerne først, så nyeste dato
            let sortedHistory = [...currentHistory].sort((a, b) => {
                if (a.starred === b.starred) {
                    return new Date(b.date) - new Date(a.date);
                }
                return a.starred ? -1 : 1;
            });
            
            const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = sortedHistory.slice(start, end);
            
            currentItems.forEach(entry => {
                const emoji = emojis[entry.mood] || "❓";
                const note = entry.text ? `"${entry.text}"` : "<i>No text added.</i>";
                const starClass = entry.starred ? 'history-star active' : 'history-star inactive';
                const starIcon = entry.starred ? '★' : '☆';

                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-header">
                        <span class="history-date">${entry.date}</span>
                        <span class="history-star ${starClass}" data-id="${entry.id}">${starIcon}</span>
                    </div>
                    <div class="history-content">${emoji} - ${note}</div>
                `;
                historySection.appendChild(div);
            });

            if (paginationControls) {
                if (totalPages > 1) {
                    paginationControls.style.display = 'flex';
                    document.getElementById('page-info').innerText = `${currentPage} / ${totalPages}`;
                    document.getElementById('btn-prev').disabled = currentPage === 1;
                    document.getElementById('btn-next').disabled = currentPage === totalPages;
                } else {
                    paginationControls.style.display = 'none';
                }
            }
        }

        const historySection = document.getElementById('history-section');
        if (historySection) {
            historySection.addEventListener('click', (e) => {
                if (e.target.classList.contains('history-star')) {
                    const id = e.target.getAttribute('data-id');
                    let history = JSON.parse(localStorage.getItem('journalHistory')) || [];
                    const itemIndex = history.findIndex(item => item && item.id === id);
                    if (itemIndex > -1) {
                        history[itemIndex].starred = !history[itemIndex].starred;
                        localStorage.setItem('journalHistory', JSON.stringify(history));
                        renderHistory();
                    }
                }
            });
        }

        const quickNoteBtn = document.getElementById('quick-note-btn');
        if (quickNoteBtn) {
            quickNoteBtn.addEventListener('click', () => {
                const text = document.getElementById('quick-note-entry').value;
                if (!text.trim()) return;
                
                let history = JSON.parse(localStorage.getItem('journalHistory')) || [];
                const entry = {
                    id: crypto.randomUUID(),
                    date: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
                    mood: "note", 
                    text: text,
                    starred: false
                };
                history.push(entry);
                localStorage.setItem('journalHistory', JSON.stringify(history));
                
                document.getElementById('quick-note-entry').value = '';
                currentPage = 1; 
                renderHistory();
            });
        }

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        if (btnPrev) btnPrev.addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderHistory(); } });
        if (btnNext) btnNext.addEventListener('click', () => { 
            const history = JSON.parse(localStorage.getItem('journalHistory')) || [];
            if(currentPage < Math.ceil(history.length / itemsPerPage)) { currentPage++; renderHistory(); } 
        });

        renderHistory();
    }

    // ==========================================
    // LOGIKK FOR: SETTINGS.HTML
    // ==========================================
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', function() {
            const exportData = {
                sobrietyStartDate: localStorage.getItem('sobrietyStartDate'),
                lastCheckInDate: localStorage.getItem('lastCheckInDate'),
                journalHistory: JSON.parse(localStorage.getItem('journalHistory')) || [],
                motivationMessage: localStorage.getItem('motivationMessage') || ""
            };
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "sobertoday-backup.json";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const btnImport = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-input');
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleImport);
    }

    const btnResetCounter = document.getElementById('btn-reset-counter');
    if (btnResetCounter) {
        btnResetCounter.addEventListener('click', function() {
            if (confirm("Would you like to start counting again? Your notes and history will be kept.")) {
                localStorage.removeItem('sobrietyStartDate');
                localStorage.removeItem('motivationMessage'); 
                window.location.href = "dashboard.html"; 
            }
        });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', function() {
            if (confirm("Are you sure you want to delete all your data? This cannot be undone unless you have exported a backup first.")) {
                localStorage.clear();
                alert("All data has been deleted.");
                window.location.href = "/";
            }
        });
    }
});
