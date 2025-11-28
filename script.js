// Hela koden är nu insvept i en DOMContentLoaded listener 
// för att säkerställa att alla HTML-element laddas innan scriptet försöker interagera med dem.
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

    // Kontrollpunkt för att se om scriptet körs korrekt
    console.log("Planerarscriptet laddades framgångsrikt och EventListeners aktiveras nu.");

    // --- CSV HANTERING ---
    // Denna EventListener är nu säker på att hitta elementet:
    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function(e) {
            console.log("Filval detekterat, påbörjar läsning..."); // Ny kontrollpunkt
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
        const lines = text.split('\n');
        if (lines.length < 1) return;

        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';')) {
            delimiter = ';';
        }

        const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
        
        const idxName = headers.findIndex(h => h.includes('vad'));
        const idxW = headers.findIndex(h => h.includes('längd') || h.includes('langd') || h.includes('bredd')); 
        const idxD = headers.findIndex(h => h.includes('djup'));
        const idxH = headers.findIndex(h => h.includes('höjd') || h.includes('hojd'));
        const idxCol = headers.findIndex(h => h.includes('färg') && h.includes('huvud'));
        const idxQty = headers.findIndex(h => h.includes('antal'));
        const idxEl = headers.findIndex(h => h.includes('elanslutning'));
        const idxWeight = headers.findIndex(h => h.includes('vikt'));

        if(idxName === -1 || idxW === -1 || idxD === -1) {
             alert(`Kunde inte hitta kolumnerna!\nVi letade efter: Vad, Längd/Bredd, Djup.\nVi hittade: ${headers.join(", ")}\n\nKolla att filen använder semikolon (;) eller komma (,) som avgränsare.`);
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

    function renderInventoryList() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        
        inventory.sort((a, b) => {
            const aAvailable = a.usedQty < a.maxQty;
            const bAvailable = b.usedQty < b.maxQty;
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;
            return a.name.localeCompare(b.name);
        });

        if(inventory.length === 0) {
            list.innerHTML = '<li style="padding:10px;">Inga giltiga rader hittades i filen.</li>';
            return;
        }

        inventory.forEach((item) => {
            const isExhausted = item.usedQty >= item.maxQty;
            const li = document.createElement('li');
            li.className = `inventory-item ${isExhausted ? 'exhausted' : ''}`;
            li.draggable = !isExhausted;
            li.innerHTML = `
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    ${item.width}x${item.depth}x${item.height} cm
                </div>
                <div class="item-count">${item.usedQty}/${item.maxQty}</div>
            `;
            
            li.addEventListener('dragstart', (e) => {
                if (isExhausted) { e.preventDefault(); return; }
                e.dataTransfer.setData('text/plain', item.id);
            });
            list.appendChild(li);
        });
    }

    function findInventoryIndexById(id) {
        return inventory.findIndex(item => item.id == id);
    }

    // --- CANVAS RITNING OCH SKALNING ---

    window.updateCanvasSize = function() {
        const w = parseInt(document.getElementById('boothW').value) || 300;
        const d = parseInt(document.getElementById('boothD').value) || 200;
        
        canvas.width = w + MARGIN * 2;
        canvas.height = d + MARGIN * 2;
        
        scale = 1.0;
        panX = 0;
        panY = 0;
        drawBoard();
    }

    window.drawBoard = function() {
        const w = parseInt(document.getElementById('boothW').value);
        const d = parseInt(document.getElementById('boothD').value);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save(); 

        ctx.translate(panX, panY);
        ctx.scale(scale, scale);
        
        const startX = MARGIN;
        const startY = MARGIN;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(startX, startY, w, d);
        ctx.strokeStyle = "#eee";
        ctx.beginPath();
        for(let x=0; x<=w; x+=50) { ctx.moveTo(startX+x, startY); ctx.lineTo(startX+x, startY+d); }
        for(let y=0; y<=d; y+=50) { ctx.moveTo(startX, startY+y); ctx.lineTo(startX+w, startY+y); }
        ctx.stroke();

        const config = document.getElementById('wallConfig').value;
        ctx.lineWidth = 8 / scale; 
        ctx.strokeStyle = "#333";
        ctx.beginPath();
        if(config !== 'island') { ctx.moveTo(startX, startY); ctx.lineTo(startX + w, startY); }
        if(config === 'corner' || config === 'u_shape' || config === 'tunnel') { ctx.moveTo(startX, startY); ctx.lineTo(startX, startY + d); }
        if(config === 'u_shape' || config === 'tunnel') { ctx.moveTo(startX + w, startY); ctx.lineTo(startX + w, startY + d); }
        ctx.stroke();
        ctx.lineWidth = 1 / scale;

        placedItems.forEach((item, idx) => {
            ctx.fillStyle = item.color || "#ccc";
            ctx.fillRect(startX + item.x, startY + item.y, item.width, item.depth);
            
            ctx.strokeStyle = (idx === selectedItemIndex) ? "red" : "#000";
            ctx.lineWidth = (idx === selectedItemIndex) ? 3 / scale : 1 / scale;
            ctx.strokeRect(startX + item.x, startY + item.y, item.width, item.depth);
            
            ctx.fillStyle = "#000";
            ctx.font = `${12 / scale}px Arial`;
            let text = `${item.name.substring(0,10)} (${item.height}H)`;
            ctx.fillText(text, startX + item.x + 2 / scale, startY + item.y + 12 / scale);
        });
        
        ctx.strokeStyle = "#999";
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.strokeRect(startX, startY, w, d);
        ctx.setLineDash([]);
        
        ctx.restore(); 
    }

    function screenToCanvas(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const rawX = clientX - rect.left;
        const rawY = clientY - rect.top;
        
        const canvasX = (rawX - panX) / scale - MARGIN;
        const canvasY = (rawY - panY) / scale - MARGIN;
        
        return { x: canvasX, y: canvasY };
    }

    // --- DRAG & DROP / INTERAKTION ---

    workspace.addEventListener('dragover', (e) => { e.preventDefault(); });
    workspace.addEventListener('drop', (e) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain'); 

        const inventoryIndex = findInventoryIndexById(itemId);
        if (inventoryIndex === -1) return;

        const template = inventory[inventoryIndex];
        const { x: mouseX, y: mouseY } = screenToCanvas(e.clientX, e.clientY);

        placedItems.push({
            name: template.name,
            width: template.width,
            depth: template.depth,
            height: template.height,
            color: template.color,
            x: mouseX - (template.width/2),
            y: mouseY - (template.depth/2),
            originalId: template.id,
            needsEl: template.needsEl,
            weight: template.weight
        });

        inventory[inventoryIndex].usedQty++;
        renderInventoryList();
        drawBoard();
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; 

        const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);

        selectedItemIndex = -1;
        for(let i = placedItems.length - 1; i >= 0; i--) {
            const item = placedItems[i];
            if(mx >= item.x && mx <= item.x + item.width && my >= item.y && my <= item.y + item.depth) {
                selectedItemIndex = i;
                isDraggingCanvasItem = true;
                dragOffsetX = mx - item.x;
                dragOffsetY = my - item.y;
                drawBoard();
                return;
            }
        }
        
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        workspace.classList.add('grabbing');
        drawBoard();
    });

    canvas.addEventListener('mousemove', (e) => {
        if(isDraggingCanvasItem && selectedItemIndex !== -1) {
            const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);
            const item = placedItems[selectedItemIndex];
            item.x = mx - dragOffsetX;
            item.y = my - dragOffsetY;
            drawBoard();
        } else if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            panX += dx;
            panY += dy;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            drawBoard();
        }
    });

    window.addEventListener('mouseup', () => { 
        isDraggingCanvasItem = false;
        isPanning = false;
        workspace.classList.remove('grabbing');
    });

    workspace.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const oldScale = scale;
        
        if (e.deltaY < 0) { 
            scale = Math.min(scale * zoomFactor, 3.0);
        } else { 
            scale = Math.max(scale / zoomFactor, 0.2);
        }

        panX -= (canvas.width / 2) * (scale - oldScale);
        panY -= (canvas.height / 2) * (scale - oldScale);

        drawBoard();
    });

    window.addEventListener('keydown', (e) => {
        if((e.key === 'Delete' || e.key === 'Backspace') && selectedItemIndex !== -1) {
            const item = placedItems[selectedItemIndex];
            const invIndex = findInventoryIndexById(item.originalId);

            if (invIndex !== -1) {
                inventory[invIndex].usedQty--;
            }
            
            placedItems.splice(selectedItemIndex, 1);
            selectedItemIndex = -1;
            renderInventoryList();
            drawBoard();
            e.preventDefault();
        } 
        
        else if ((e.key === 'r' || e.key === 'R') && selectedItemIndex !== -1) {
            const item = placedItems[selectedItemIndex];
            [item.width, item.depth] = [item.depth, item.width];
            drawBoard();
            e.preventDefault();
        }
    });

    // --- RAPPORT ---
    window.generateReport = function() {
        const modal = document.getElementById('report-modal');
        const detailDiv = document.getElementById('report-details');
        const tableBody = document.querySelector('#report-table tbody');
        
        const boothW = document.getElementById('boothW').value;
        const boothD = document.getElementById('boothD').value;
        const notes = document.getElementById('eventNotes').value;
        const wallType = document.getElementById('wallConfig').options[document.getElementById('wallConfig').selectedIndex].text;
        
        let maxHeight = 0;
        let totalWeight = 0;

        placedItems.forEach(item => {
            if (item.height > maxHeight) maxHeight = item.height;
        });

        detailDiv.innerHTML = `
            <p><strong>Monterstorlek:</strong> ${boothW} x ${boothD} cm</p>
            <p><strong>Maxhöjd på monter (Används):</strong> ${maxHeight} cm</p>
            <p><strong>Typ:</strong> ${wallType}</p>
            <p><strong>Anteckningar:</strong><br>${notes}</p>
        `;

        tableBody.innerHTML = '';
        const summary = {};
        
        placedItems.forEach(item => {
            if(!summary[item.name]) summary[item.name] = { 
                count: 0, 
                weight: 0, 
                el: item.needsEl,
                width: item.width,
                depth: item.depth,
                height: item.height 
            };
            summary[item.name].count++;
            summary[item.name].weight += item.weight;
            totalWeight += item.weight;
        });

        for (const [name, data] of Object.entries(summary)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td>${data.count}</td>
                <td>${data.width}x${data.depth}</td>
                <td>${data.height}</td>
                <td>${data.weight} kg</td>
                <td>${data.el ? 'JA' : '-'}</td>
            `;
            tableBody.appendChild(tr);
        }
        const trTot = document.createElement('tr');
        trTot.style.fontWeight = 'bold';
        trTot.innerHTML = `<td>TOTALT</td><td>${placedItems.length} st</td><td></td><td></td><td>${totalWeight} kg</td><td></td>`;
        tableBody.appendChild(trTot);
        modal.style.display = 'flex';
    }
    
    // Slutligen, initiera canvas
    updateCanvasSize();
    
    // SLUT PÅ BEFINTLIG JAVASCRIPT LOGIK
});
