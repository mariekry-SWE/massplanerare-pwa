// ... (Initial DOMContentLoaded wrapper och variabler oförändrade) ...
document.addEventListener('DOMContentLoaded', (event) => {
    // VARIABLER... (finns här)
    let inventory = [];
    // ... (alla variabler definieras här) ...
    const canvas = document.getElementById('planCanvas');
    const ctx = canvas.getContext('2d');
    const workspace = document.getElementById('workspace');
    const MARGIN = 50; 
    
    // ... (updateCanvasSize, drawBoard, generateReport funktioner definieras här och exponeras till window) ...
    
    // Vi lägger bara in den korrigerade parseCSV och dess omgivning här:

    // --- CSV HANTERING ---
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

    function parseCSV(text) {
        inventory = [];
        // KORRIGERING: Normalisera radbrytningar till \n
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.split('\n');
        
        if (lines.length < 1) {
            alert("Filen är tom.");
            return;
        }

        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';')) {
            delimiter = ';';
        }

        const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
        
        // Rubrikindex...
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
            
            // ... (Parsing logik som konverterar sträng till nummer) ...
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
        
        if (inventory.length === 0) {
             alert("OBS! Filen lästes men inga giltiga datarader hittades. Dubbelkolla att du har data under rubrikraden.");
        }

        renderInventoryList();
        updateCanvasSize();
    }
    
    // ... (Resten av koden/lyssnarna/initiering oförändrad) ...

    // Slutligen, initiera canvas när DOM är laddad
    updateCanvasSize();
});
