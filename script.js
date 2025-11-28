// Hela koden är nu insvept i en DOMContentLoaded listener 
document.addEventListener('DOMContentLoaded', (event) => {
    // START PÅ BEFINTLIG JAVASCRIPT LOGIK

    let inventory = [];
    let placedItems = [];
    let selectedItemIndex = -1;
    let isDraggingCanvasItem = false;
    let dragOffsetX, dragOffsetY;

    // VARIABLER FÖR SKALNING/PANORERING
    let scale = 1.0; 
    let panX = 0;    
    let panY = 0;    
    let isPanning = false;
    let lastPanX, lastPanY;

    const canvas = document.getElementById('planCanvas');
    const ctx = canvas.getContext('2d');
    const workspace = document.getElementById('workspace');
    const MARGIN = 50; 

    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                parseCSV(e.target.result);
            };
            reader.readAsText(file); 
        });
    }

    // --- FUNKTION MED DEBUG ALERT ---
    function parseCSV(text) {
        inventory = [];
        const lines = text.split('\n');
        if (lines.length < 1) return;

        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';')) {
            delimiter = ';';
        }

        const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
        
        // ** <--- NY DEBUG ALERT HÄR! ---> **
        alert(`DEBUG INFO:\nAvgränsare: ${delimiter}\nHittade Rubriker: ${headers.join(" | ")}\nAntal rader (inkl. rubrik): ${lines.length}`);
        
        // Fortsätter med rubrik-kontroll och parsing...
        
        const idxName = headers.findIndex(h => h.includes('vad'));
        const idxW = headers.findIndex(h => h.includes('längd') || h.includes('langd') || h.includes('bredd')); 
        const idxD = headers.findIndex(h => h.includes('djup'));
        const idxH = headers.findIndex(h => h.includes('höjd') || h.includes('hojd'));
        const idxCol = headers.findIndex(h => h.includes('färg') && h.includes('huvud'));
        const idxQty = headers.findIndex(h => h.includes('antal'));
        const idxEl = headers.findIndex(h => h.includes('elanslutning'));
        const idxWeight = headers.findIndex(h => h.includes('vikt'));

        if(idxName === -1 || idxW === -1 || idxD === -1) {
             alert(`FEL: Kunde inte hitta kolumnerna Vad, Längd/Bredd, och Djup. Kontrollera rubrikerna.`);
             return;
        }

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const row = lines[i].split(delimiter).map(c => c.trim().replace(/"/g, ''));
            if(row.length < headers.length - 2) continue;

            let widthVal = row[idxW] ? row[idxW].replace(',', '.') : '50';
            let depthVal = row[idxD] ? row[idxD].replace(',', '.') : '50';
            let heightVal = row[idxH] ? row[idxH].replace(',', '.') : '0'; 
            let weightVal = row[idxWeight] ? row[idxWeight].replace(',', '.') : '0';

            inventory.push({
                id: i,
                name: row[idxName] || "Okänt",
                width: parseFloat(widthVal) || 50,
                depth: parseFloat(depthVal) || 50,
                height: parseFloat(heightVal) || 0,
                color: row[idxCol] || "#95a5a6",
                maxQty: parseInt(row[idxQty]) || 1,
                needsEl: (row[idxEl] || "").toLowerCase().includes('ja'),
                weight: parseFloat(weightVal) || 0,
                usedQty: 0
            });
        }
        renderInventoryList();
        updateCanvasSize();
    }

    // ... (resten av funktionerna är oförändrade, t.ex. renderInventoryList, findInventoryIndexById, updateCanvasSize, drawBoard, screenToCanvas, event listeners, generateReport) ...

    // Fick stryka ut den oförändrade koden här för att spara utrymme. 
    // Använd koden från föregående svar och klistra in alerten.

    // Du MÅSTE se till att resten av koden från ditt förra script.js-svar finns med!

    // ...
    // ...

    window.generateReport = function() {
        // ... (hela generateReport funktionen) ...
    }
    
    // Slutligen, initiera canvas
    updateCanvasSize();
    
    // SLUT PÅ JAVASCRIPT LOGIK
});
