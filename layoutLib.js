/**
 * LayoutLib - A simple JavaScript library for creating draggable grid layouts
 */
class LayoutLib {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            rows: options.rows || 6,
            cols: options.cols || 8,
            gap: options.gap || 8,
            onMerge: options.onMerge || null,
            onSelectionChange: options.onSelectionChange || null,
            onSingleSelect: options.onSingleSelect || null,
            onModeChange: options.onModeChange || null
        };
        
        this.cells = [];
        this.mergedAreas = [];
        this.singleSelectedCells = []; // For individual clicked cells
        this.isDragging = false;
        this.startCell = null;
        this.currentSelection = null;
        this.selectionOutline = null;
        this.editMode = true; // Edit mode is on by default
        
        this.init();
    }
    
    init() {
        this.createGrid();
        this.setupEventListeners();
        this.createSelectionOutline();
    }
    
    createGrid() {
        this.container.innerHTML = '';
        this.container.style.gridTemplateColumns = `repeat(${this.options.cols}, 1fr)`;
        this.container.style.gridTemplateRows = `repeat(${this.options.rows}, 1fr)`;
        
        this.cells = [];
        
        for (let row = 0; row < this.options.rows; row++) {
            for (let col = 0; col < this.options.cols; col++) {
                const cell = this.createCell(row, col);
                this.container.appendChild(cell);
                this.cells.push(cell);
            }
        }
        
        this.updateViewMode();
    }
    
    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.textContent = '+';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.id = `${row}-${col}`;
        
        return cell;
    }
    
    createSelectionOutline() {
        this.selectionOutline = document.createElement('div');
        this.selectionOutline.className = 'selection-outline';
        document.body.appendChild(this.selectionOutline);
    }
    
    setupEventListeners() {
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.container.addEventListener('click', this.handleClick.bind(this));
        
        // Prevent context menu on right click
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleClick(e) {
        if (!this.editMode || this.isDragging) return;
        
        if (e.target.classList.contains('grid-cell')) {
            e.stopPropagation();
            this.toggleSingleCell(e.target);
        }
    }
    
    toggleSingleCell(cell) {
        const cellId = cell.dataset.id;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Check if cell is part of a merged area
        if (this.isCellInMergedArea(cell)) {
            return; // Don't allow single selection of cells in merged areas
        }
        
        // Toggle single selection
        const existingIndex = this.singleSelectedCells.findIndex(c => c.id === cellId);
        if (existingIndex >= 0) {
            // Remove from single selected
            this.singleSelectedCells.splice(existingIndex, 1);
            cell.classList.remove('single-selected');
        } else {
            // Add to single selected
            this.singleSelectedCells.push({ id: cellId, row, col });
            cell.classList.add('single-selected');
        }
        
        if (this.options.onSingleSelect) {
            this.options.onSingleSelect(cellId, this.singleSelectedCells);
        }
    }
    
    handleMouseDown(e) {
        if (!this.editMode) return;
        
        if (e.target.classList.contains('grid-cell')) {
            this.isDragging = true;
            this.startCell = e.target;
            this.currentSelection = {
                startRow: parseInt(this.startCell.dataset.row),
                startCol: parseInt(this.startCell.dataset.col),
                endRow: parseInt(this.startCell.dataset.row),
                endCol: parseInt(this.startCell.dataset.col)
            };
            
            this.updateSelection();
            e.preventDefault();
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.editMode) return;
        
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        if (elementUnderMouse && elementUnderMouse.classList.contains('grid-cell')) {
            const endRow = parseInt(elementUnderMouse.dataset.row);
            const endCol = parseInt(elementUnderMouse.dataset.col);
            
            this.currentSelection.endRow = endRow;
            this.currentSelection.endCol = endCol;
            
            this.updateSelection();
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        if (this.currentSelection && this.isValidSelection()) {
            this.mergeSelection();
        }
        
        this.clearSelection();
    }
    
    updateSelection() {
        // Clear previous selection styling
        this.cells.forEach(cell => {
            cell.classList.remove('selecting', 'preview');
        });
        
        if (!this.currentSelection) return;
        
        const selection = this.getNormalizedSelection();
        const selectedCells = this.getCellsInSelection(selection);
        
        // Check if all cells in selection are available for merging
        const canMerge = this.canMergeSelection(selectedCells);
        
        selectedCells.forEach(cell => {
            if (canMerge) {
                cell.classList.add('preview');
            } else {
                cell.classList.add('selecting');
            }
        });
        
        // Update selection outline
        this.updateSelectionOutline(selection, canMerge);
        
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(selection, canMerge);
        }
    }
    
    updateSelectionOutline(selection, canMerge) {
        const firstCell = this.getCellAt(selection.startRow, selection.startCol);
        const lastCell = this.getCellAt(selection.endRow, selection.endCol);
        
        if (!firstCell || !lastCell) return;
        
        const firstRect = firstCell.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();
        
        const outline = this.selectionOutline;
        outline.style.left = `${firstRect.left}px`;
        outline.style.top = `${firstRect.top}px`;
        outline.style.width = `${lastRect.right - firstRect.left}px`;
        outline.style.height = `${lastRect.bottom - firstRect.top}px`;
        outline.style.borderColor = canMerge ? '#28a745' : '#ffc107';
        outline.classList.add('active');
    }
    
    getNormalizedSelection() {
        const startRow = Math.min(this.currentSelection.startRow, this.currentSelection.endRow);
        const endRow = Math.max(this.currentSelection.startRow, this.currentSelection.endRow);
        const startCol = Math.min(this.currentSelection.startCol, this.currentSelection.endCol);
        const endCol = Math.max(this.currentSelection.startCol, this.currentSelection.endCol);
        
        return { startRow, endRow, startCol, endCol };
    }
    
    getCellsInSelection(selection) {
        const cells = [];
        for (let row = selection.startRow; row <= selection.endRow; row++) {
            for (let col = selection.startCol; col <= selection.endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) cells.push(cell);
            }
        }
        return cells;
    }
    
    getCellAt(row, col) {
        return this.cells.find(cell => 
            parseInt(cell.dataset.row) === row && parseInt(cell.dataset.col) === col
        );
    }
    
    canMergeSelection(selectedCells) {
        // Check if any of the selected cells are already part of a larger merged area
        return selectedCells.every(cell => {
            // A cell can be merged if it's not already part of a merged area,
            // or if all cells in the selection belong to the same merged area
            return !this.isCellInMergedArea(cell) || this.areAllCellsInSameMergedArea(selectedCells);
        });
    }
    
    isCellInMergedArea(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        return this.mergedAreas.some(area => 
            row >= area.startRow && row <= area.endRow &&
            col >= area.startCol && col <= area.endCol
        );
    }
    
    areAllCellsInSameMergedArea(cells) {
        if (cells.length === 0) return false;
        
        const firstCellArea = this.getMergedAreaForCell(cells[0]);
        if (!firstCellArea) return false;
        
        return cells.every(cell => {
            const cellArea = this.getMergedAreaForCell(cell);
            return cellArea === firstCellArea;
        });
    }
    
    getMergedAreaForCell(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        return this.mergedAreas.find(area => 
            row >= area.startRow && row <= area.endRow &&
            col >= area.startCol && col <= area.endCol
        );
    }
    
    isValidSelection() {
        const selection = this.getNormalizedSelection();
        return selection.startRow !== selection.endRow || selection.startCol !== selection.endCol;
    }
    
    mergeSelection() {
        const selection = this.getNormalizedSelection();
        const selectedCells = this.getCellsInSelection(selection);
        
        if (!this.canMergeSelection(selectedCells)) return;
        
        // Remove any existing merged areas that overlap with this selection
        this.removeMergedAreasInSelection(selection);
        
        // Remove any single selections in the merged area
        selectedCells.forEach(cell => {
            cell.classList.remove('single-selected');
            const cellId = cell.dataset.id;
            this.singleSelectedCells = this.singleSelectedCells.filter(c => c.id !== cellId);
        });
        
        // Add new merged area
        const mergedArea = {
            startRow: selection.startRow,
            endRow: selection.endRow,
            startCol: selection.startCol,
            endCol: selection.endCol,
            id: `merged-${Date.now()}`
        };
        this.mergedAreas.push(mergedArea);
        
        // Apply merge styling with animation
        selectedCells.forEach((cell, index) => {
            setTimeout(() => {
                cell.classList.add('merging');
                setTimeout(() => {
                    cell.classList.remove('merging');
                    cell.classList.add('merged');
                }, 600);
            }, index * 50);
        });
        
        // Create merged area overlay
        setTimeout(() => {
            this.createMergedAreaOverlay(mergedArea);
        }, 600);
        
        if (this.options.onMerge) {
            this.options.onMerge(selection, this.mergedAreas);
        }
    }
    
    createMergedAreaOverlay(mergedArea) {
        const firstCell = this.getCellAt(mergedArea.startRow, mergedArea.startCol);
        const lastCell = this.getCellAt(mergedArea.endRow, mergedArea.endCol);
        
        if (!firstCell || !lastCell) return;
        
        // Hide individual cells in the merged area
        for (let row = mergedArea.startRow; row <= mergedArea.endRow; row++) {
            for (let col = mergedArea.startCol; col <= mergedArea.endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) {
                    cell.style.opacity = '0';
                }
            }
        }
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'merged-area-overlay';
        overlay.textContent = this.editMode ? '+' : '';
        overlay.dataset.mergedId = mergedArea.id;
        
        if (!this.editMode) {
            overlay.classList.add('view-mode');
        }
        
        // Position the overlay
        const containerRect = this.container.getBoundingClientRect();
        const firstRect = firstCell.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();
        
        overlay.style.cssText = `
            position: absolute;
            left: ${firstRect.left - containerRect.left}px;
            top: ${firstRect.top - containerRect.top}px;
            width: ${lastRect.right - firstRect.left}px;
            height: ${lastRect.bottom - firstRect.top}px;
            background-color: #e8f5e8;
            border: 2px solid #27ae60;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #27ae60;
            z-index: 5;
            pointer-events: none;
        `;
        
        this.container.appendChild(overlay);
    }
    
    removeMergedAreasInSelection(selection) {
        this.mergedAreas = this.mergedAreas.filter(area => {
            const overlaps = !(
                area.endRow < selection.startRow ||
                area.startRow > selection.endRow ||
                area.endCol < selection.startCol ||
                area.startCol > selection.endCol
            );
            
            if (overlaps) {
                // Remove merged styling from cells in this area
                for (let row = area.startRow; row <= area.endRow; row++) {
                    for (let col = area.startCol; col <= area.endCol; col++) {
                        const cell = this.getCellAt(row, col);
                        if (cell) {
                            cell.classList.remove('merged');
                            cell.style.opacity = '1';
                        }
                    }
                }
                
                // Remove overlay element
                const overlay = this.container.querySelector(`[data-merged-id="${area.id}"]`);
                if (overlay) {
                    overlay.remove();
                }
            }
            
            return !overlaps;
        });
    }
    
    clearSelection() {
        this.cells.forEach(cell => {
            cell.classList.remove('selecting', 'preview');
        });
        
        this.selectionOutline.classList.remove('active');
        this.currentSelection = null;
        this.startCell = null;
    }
    
    // Edit mode methods
    setEditMode(enabled) {
        this.editMode = enabled;
        this.updateViewMode();
        
        if (this.options.onModeChange) {
            this.options.onModeChange(this.editMode);
        }
    }
    
    toggleEditMode() {
        this.setEditMode(!this.editMode);
        return this.editMode;
    }
    
    updateViewMode() {
        if (this.editMode) {
            this.container.classList.remove('view-mode');
        } else {
            this.container.classList.add('view-mode');
        }
        
        // Update merged area overlays
        const overlays = this.container.querySelectorAll('.merged-area-overlay');
        overlays.forEach(overlay => {
            if (this.editMode) {
                overlay.classList.remove('view-mode');
                overlay.textContent = '+';
            } else {
                overlay.classList.add('view-mode');
                overlay.textContent = '';
            }
        });
        
        // Clear selection if switching to view mode
        if (!this.editMode) {
            this.clearSelection();
        }
    }
    
    // Public API methods
    export() {
        return {
            rows: this.options.rows,
            cols: this.options.cols,
            mergedAreas: this.mergedAreas.map(area => ({ ...area })),
            singleSelectedCells: this.singleSelectedCells.map(cell => ({ ...cell }))
        };
    }
    
    import(data) {
        this.options.rows = data.rows;
        this.options.cols = data.cols;
        this.mergedAreas = data.mergedAreas || [];
        this.singleSelectedCells = data.singleSelectedCells || [];
        
        this.createGrid();
        
        // Apply merged styling and overlays
        this.mergedAreas.forEach(area => {
            for (let row = area.startRow; row <= area.endRow; row++) {
                for (let col = area.startCol; col <= area.endCol; col++) {
                    const cell = this.getCellAt(row, col);
                    if (cell) {
                        cell.classList.add('merged');
                    }
                }
            }
            this.createMergedAreaOverlay(area);
        });
        
        // Apply single selections
        this.singleSelectedCells.forEach(cellData => {
            const cell = this.getCellAt(cellData.row, cellData.col);
            if (cell) {
                cell.classList.add('single-selected');
            }
        });
    }
    
    reset() {
        this.mergedAreas = [];
        this.singleSelectedCells = [];
        this.cells.forEach(cell => {
            cell.classList.remove('merged', 'selecting', 'preview', 'merging', 'single-selected');
            cell.style.opacity = '1';
        });
        
        // Remove all overlay elements
        const overlays = this.container.querySelectorAll('.merged-area-overlay');
        overlays.forEach(overlay => overlay.remove());
    }
    
    destroy() {
        if (this.selectionOutline && this.selectionOutline.parentElement) {
            this.selectionOutline.parentElement.removeChild(this.selectionOutline);
        }
        this.container.innerHTML = '';
    }
}