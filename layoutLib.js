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
            onModeChange: options.onModeChange || null,
            onRectangleMove: options.onRectangleMove || null
        };
        
        this.cells = [];
        this.mergedAreas = [];
        this.singleSelectedCells = []; // For individual clicked cells
        this.isDragging = false;
        this.isDraggingRectangle = false;
        this.draggedRectangle = null;
        this.isResizing = false;
        this.resizeData = null;
        this.startCell = null;
        this.currentSelection = null;
        this.selectionOutline = null;
        this.rectangleDragPreview = null;
        this.editMode = true; // Edit mode is on by default
        
        this.init();
    }
    
    init() {
        this.createGrid();
        this.setupEventListeners();
        this.createSelectionOutline();
        this.createRectangleDragPreview();
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
    
    createRectangleDragPreview() {
        this.rectangleDragPreview = document.createElement('div');
        this.rectangleDragPreview.className = 'rectangle-drag-preview';
        this.rectangleDragPreview.style.cssText = `
            position: fixed;
            border: 3px solid #007bff;
            background-color: rgba(0, 123, 255, 0.2);
            border-radius: 8px;
            z-index: 2000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        `;
        document.body.appendChild(this.rectangleDragPreview);
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
        if (!this.editMode || this.isDragging || this.isDraggingRectangle) return;
        
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
        
        // Check if clicking on a merged area overlay
        if (e.target.classList.contains('merged-area-overlay')) {
            const rect = e.target.getBoundingClientRect();
            const resizeHandle = this.getResizeHandle(e, rect);
            
            if (resizeHandle) {
                this.startResize(e, e.target, resizeHandle);
            } else {
                this.startRectangleDrag(e);
            }
            return;
        }
        
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
    
    startRectangleDrag(e) {
        const overlayElement = e.target;
        const mergedId = overlayElement.dataset.mergedId;
        const mergedArea = this.mergedAreas.find(area => area.id === mergedId);
        
        if (!mergedArea) return;
        
        this.isDraggingRectangle = true;
        this.draggedRectangle = mergedArea;
        
        // Calculate rectangle dimensions
        const width = mergedArea.endCol - mergedArea.startCol + 1;
        const height = mergedArea.endRow - mergedArea.startRow + 1;
        
        // Store original position
        this.draggedRectangle.originalStartRow = mergedArea.startRow;
        this.draggedRectangle.originalStartCol = mergedArea.startCol;
        this.draggedRectangle.originalEndRow = mergedArea.endRow;
        this.draggedRectangle.originalEndCol = mergedArea.endCol;
        this.draggedRectangle.width = width;
        this.draggedRectangle.height = height;
        
        // Hide the original overlay while dragging
        overlayElement.style.opacity = '0.3';
        
        // Clear cells in original position temporarily
        this.clearRectangleCells(mergedArea);
        
        // Update preview
        this.updateRectangleDragPreview(e);
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.isResizing) {
            this.updateResize(e);
            return;
        }
        
        if (this.isDraggingRectangle) {
            this.updateRectangleDragPreview(e);
            this.updateRectanglePlacementPreview(e);
            return;
        }
        
        // Check for resize cursor when not dragging
        if (!this.isDragging && !this.isDraggingRectangle && this.editMode) {
            this.updateResizeCursor(e);
        }
        
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
    
    updateRectangleDragPreview(e) {
        if (!this.draggedRectangle) return;
        
        const cellSize = this.getCellSize();
        const width = this.draggedRectangle.width * cellSize.width + (this.draggedRectangle.width - 1) * 8; // 8px gap
        const height = this.draggedRectangle.height * cellSize.height + (this.draggedRectangle.height - 1) * 8;
        
        this.rectangleDragPreview.style.left = `${e.clientX - width/2}px`;
        this.rectangleDragPreview.style.top = `${e.clientY - height/2}px`;
        this.rectangleDragPreview.style.width = `${width}px`;
        this.rectangleDragPreview.style.height = `${height}px`;
        this.rectangleDragPreview.style.opacity = '1';
    }
    
    updateRectanglePlacementPreview(e) {
        // Clear previous preview
        this.cells.forEach(cell => {
            cell.classList.remove('rectangle-drop-preview', 'rectangle-drop-invalid');
        });
        
        const targetCell = document.elementFromPoint(e.clientX, e.clientY);
        if (!targetCell || !targetCell.classList.contains('grid-cell')) return;
        
        const targetRow = parseInt(targetCell.dataset.row);
        const targetCol = parseInt(targetCell.dataset.col);
        
        // Calculate the bounds for the rectangle if placed at this position
        const endRow = targetRow + this.draggedRectangle.height - 1;
        const endCol = targetCol + this.draggedRectangle.width - 1;
        
        // Check if the rectangle would fit within grid bounds
        if (endRow >= this.options.rows || endCol >= this.options.cols) {
            // Show invalid preview
            this.showInvalidDropPreview(targetRow, targetCol);
            return;
        }
        
        // Check for collisions with existing rectangles/selections
        const wouldCollide = this.wouldRectangleCollide(targetRow, targetCol, endRow, endCol);
        
        // Show preview
        for (let row = targetRow; row <= endRow; row++) {
            for (let col = targetCol; col <= endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) {
                    if (wouldCollide) {
                        cell.classList.add('rectangle-drop-invalid');
                    } else {
                        cell.classList.add('rectangle-drop-preview');
                    }
                }
            }
        }
    }
    
    showInvalidDropPreview(row, col) {
        const cell = this.getCellAt(row, col);
        if (cell) {
            cell.classList.add('rectangle-drop-invalid');
        }
    }
    
    wouldRectangleCollide(startRow, startCol, endRow, endCol) {
        // Check collision with other merged areas (excluding the one being dragged)
        for (const area of this.mergedAreas) {
            if (area.id === this.draggedRectangle.id) continue;
            
            const overlapsRow = !(endRow < area.startRow || startRow > area.endRow);
            const overlapsCol = !(endCol < area.startCol || startCol > area.endCol);
            
            if (overlapsRow && overlapsCol) {
                return true;
            }
        }
        
        // Check collision with single selected cells
        for (const cellData of this.singleSelectedCells) {
            if (cellData.row >= startRow && cellData.row <= endRow &&
                cellData.col >= startCol && cellData.col <= endCol) {
                return true;
            }
        }
        
        return false;
    }
    
    getCellSize() {
        if (this.cells.length === 0) return { width: 50, height: 50 };
        
        const firstCell = this.cells[0];
        const rect = firstCell.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }
    
    handleMouseUp(e) {
        if (this.isResizing) {
            this.finishResize();
            return;
        }
        
        if (this.isDraggingRectangle) {
            this.finishRectangleDrag(e);
            return;
        }
        
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        if (this.currentSelection && this.isValidSelection()) {
            this.mergeSelection();
        }
        
        this.clearSelection();
    }
    
    finishRectangleDrag(e) {
        const targetCell = document.elementFromPoint(e.clientX, e.clientY);
        
        if (targetCell && targetCell.classList.contains('grid-cell')) {
            const targetRow = parseInt(targetCell.dataset.row);
            const targetCol = parseInt(targetCell.dataset.col);
            const endRow = targetRow + this.draggedRectangle.height - 1;
            const endCol = targetCol + this.draggedRectangle.width - 1;
            
            // Check if drop is valid
            if (endRow < this.options.rows && endCol < this.options.cols && 
                !this.wouldRectangleCollide(targetRow, targetCol, endRow, endCol)) {
                
                // Update the rectangle position
                this.draggedRectangle.startRow = targetRow;
                this.draggedRectangle.startCol = targetCol;
                this.draggedRectangle.endRow = endRow;
                this.draggedRectangle.endCol = endCol;
                
                // Re-create the overlay at the new position
                this.updateMergedAreaOverlay(this.draggedRectangle);
                
                if (this.options.onRectangleMove) {
                    this.options.onRectangleMove(this.draggedRectangle);
                }
            } else {
                // Invalid drop - restore original position
                this.draggedRectangle.startRow = this.draggedRectangle.originalStartRow;
                this.draggedRectangle.startCol = this.draggedRectangle.originalStartCol;
                this.draggedRectangle.endRow = this.draggedRectangle.originalEndRow;
                this.draggedRectangle.endCol = this.draggedRectangle.originalEndCol;
                
                // Restore original overlay
                const overlay = this.container.querySelector(`[data-merged-id="${this.draggedRectangle.id}"]`);
                if (overlay) {
                    overlay.style.opacity = '1';
                }
                
                // Restore cells
                this.restoreRectangleCells(this.draggedRectangle);
            }
        } else {
            // No valid target - restore original position
            this.draggedRectangle.startRow = this.draggedRectangle.originalStartRow;
            this.draggedRectangle.startCol = this.draggedRectangle.originalStartCol;
            this.draggedRectangle.endRow = this.draggedRectangle.originalEndRow;
            this.draggedRectangle.endCol = this.draggedRectangle.originalEndCol;
            
            const overlay = this.container.querySelector(`[data-merged-id="${this.draggedRectangle.id}"]`);
            if (overlay) {
                overlay.style.opacity = '1';
            }
            
            this.restoreRectangleCells(this.draggedRectangle);
        }
        
        // Clean up
        this.cleanupRectangleDrag();
    }
    
    cleanupRectangleDrag() {
        this.isDraggingRectangle = false;
        this.draggedRectangle = null;
        this.rectangleDragPreview.style.opacity = '0';
        
        // Clear preview classes
        this.cells.forEach(cell => {
            cell.classList.remove('rectangle-drop-preview', 'rectangle-drop-invalid');
        });
    }
    
    clearRectangleCells(mergedArea) {
        for (let row = mergedArea.startRow; row <= mergedArea.endRow; row++) {
            for (let col = mergedArea.startCol; col <= mergedArea.endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) {
                    cell.style.opacity = '1';
                    cell.classList.remove('merged');
                }
            }
        }
    }
    
    restoreRectangleCells(mergedArea) {
        for (let row = mergedArea.startRow; row <= mergedArea.endRow; row++) {
            for (let col = mergedArea.startCol; col <= mergedArea.endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) {
                    cell.style.opacity = '0';
                    cell.classList.add('merged');
                }
            }
        }
    }
    
    updateMergedAreaOverlay(mergedArea) {
        // Remove old overlay
        const oldOverlay = this.container.querySelector(`[data-merged-id="${mergedArea.id}"]`);
        if (oldOverlay) {
            oldOverlay.remove();
        }
        
        // Create new overlay at new position
        this.createMergedAreaOverlay(mergedArea);
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
            cursor: ${this.editMode ? 'grab' : 'default'};
            transition: all 0.3s ease;
        `;
        
        // Add hover effect for draggable overlays
        if (this.editMode) {
            overlay.addEventListener('mouseenter', () => {
                if (!this.isDraggingRectangle) {
                    overlay.style.transform = 'scale(1.02)';
                    overlay.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }
            });
            
            overlay.addEventListener('mouseleave', () => {
                if (!this.isDraggingRectangle) {
                    overlay.style.transform = 'scale(1)';
                    overlay.style.boxShadow = 'none';
                }
            });
            
            overlay.addEventListener('mousedown', () => {
                overlay.style.cursor = 'grabbing';
            });
            
            overlay.addEventListener('mouseup', () => {
                overlay.style.cursor = 'grab';
            });
        }
        
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
                overlay.style.cursor = 'grab';
            } else {
                overlay.classList.add('view-mode');
                overlay.textContent = '';
                overlay.style.cursor = 'default';
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
            cell.classList.remove('merged', 'selecting', 'preview', 'merging', 'single-selected', 'rectangle-drop-preview', 'rectangle-drop-invalid', 'resize-preview', 'resize-invalid');
            cell.style.opacity = '1';
        });
        
        // Remove all overlay elements
        const overlays = this.container.querySelectorAll('.merged-area-overlay');
        overlays.forEach(overlay => overlay.remove());
        
        // Reset cursor
        document.body.style.cursor = '';
    }
    
    destroy() {
        if (this.selectionOutline && this.selectionOutline.parentElement) {
            this.selectionOutline.parentElement.removeChild(this.selectionOutline);
        }
        if (this.rectangleDragPreview && this.rectangleDragPreview.parentElement) {
            this.rectangleDragPreview.parentElement.removeChild(this.rectangleDragPreview);
        }
        this.container.innerHTML = '';
    }
    
    updateResizeCursor(e) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || !element.classList.contains('merged-area-overlay')) {
            document.body.style.cursor = '';
            return;
        }
        
        const rect = element.getBoundingClientRect();
        const resizeHandle = this.getResizeHandle(e, rect);
        
        if (resizeHandle) {
            document.body.style.cursor = this.getResizeCursor(resizeHandle);
        } else {
            document.body.style.cursor = 'grab';
        }
    }
    
    getResizeHandle(e, rect) {
        const margin = 8; // Resize handle margin in pixels
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const nearLeft = x <= margin;
        const nearRight = x >= rect.width - margin;
        const nearTop = y <= margin;
        const nearBottom = y >= rect.height - margin;
        
        if (nearTop && nearLeft) return 'nw';
        if (nearTop && nearRight) return 'ne';
        if (nearBottom && nearLeft) return 'sw';
        if (nearBottom && nearRight) return 'se';
        if (nearTop) return 'n';
        if (nearBottom) return 's';
        if (nearLeft) return 'w';
        if (nearRight) return 'e';
        
        return null;
    }
    
    getResizeCursor(handle) {
        switch (handle) {
            case 'n':
            case 's':
                return 'ns-resize';
            case 'e':
            case 'w':
                return 'ew-resize';
            case 'nw':
            case 'se':
                return 'nwse-resize';
            case 'ne':
            case 'sw':
                return 'nesw-resize';
            default:
                return 'grab';
        }
    }
    
    startResize(e, overlayElement, resizeHandle) {
        const mergedId = overlayElement.dataset.mergedId;
        const mergedArea = this.mergedAreas.find(area => area.id === mergedId);
        
        if (!mergedArea) return;
        
        this.isResizing = true;
        this.resizeData = {
            mergedArea: mergedArea,
            handle: resizeHandle,
            originalStartRow: mergedArea.startRow,
            originalEndRow: mergedArea.endRow,
            originalStartCol: mergedArea.startCol,
            originalEndCol: mergedArea.endCol,
            startX: e.clientX,
            startY: e.clientY,
            overlay: overlayElement
        };
        
        // Store cell size for calculations
        this.resizeData.cellSize = this.getCellSize();
        this.resizeData.containerRect = this.container.getBoundingClientRect();
        
        e.preventDefault();
    }
    
    updateResize(e) {
        if (!this.resizeData) return;
        
        const deltaX = e.clientX - this.resizeData.startX;
        const deltaY = e.clientY - this.resizeData.startY;
        
        // Convert pixel delta to grid delta
        const cellWidth = this.resizeData.cellSize.width + 8; // Include gap
        const cellHeight = this.resizeData.cellSize.height + 8;
        
        const deltaCol = Math.round(deltaX / cellWidth);
        const deltaRow = Math.round(deltaY / cellHeight);
        
        // Calculate new bounds based on handle
        let newStartRow = this.resizeData.originalStartRow;
        let newEndRow = this.resizeData.originalEndRow;
        let newStartCol = this.resizeData.originalStartCol;
        let newEndCol = this.resizeData.originalEndCol;
        
        const handle = this.resizeData.handle;
        
        // Apply deltas based on resize handle
        if (handle.includes('n')) newStartRow += deltaRow;
        if (handle.includes('s')) newEndRow += deltaRow;
        if (handle.includes('w')) newStartCol += deltaCol;
        if (handle.includes('e')) newEndCol += deltaCol;
        
        // Validate bounds
        if (newStartRow < 0) newStartRow = 0;
        if (newStartCol < 0) newStartCol = 0;
        if (newEndRow >= this.options.rows) newEndRow = this.options.rows - 1;
        if (newEndCol >= this.options.cols) newEndCol = this.options.cols - 1;
        
        // Ensure minimum size (1x1)
        if (newEndRow < newStartRow) {
            if (handle.includes('n')) newStartRow = newEndRow;
            else newEndRow = newStartRow;
        }
        if (newEndCol < newStartCol) {
            if (handle.includes('w')) newStartCol = newEndCol;
            else newEndCol = newStartCol;
        }
        
        // Check for collisions (excluding current rectangle)
        const wouldCollide = this.wouldResizeCollide(newStartRow, newStartCol, newEndRow, newEndCol);
        
        // Show preview
        this.showResizePreview(newStartRow, newStartCol, newEndRow, newEndCol, wouldCollide);
        
        // Store proposed dimensions
        this.resizeData.newStartRow = newStartRow;
        this.resizeData.newEndRow = newEndRow;
        this.resizeData.newStartCol = newStartCol;
        this.resizeData.newEndCol = newEndCol;
        this.resizeData.wouldCollide = wouldCollide;
    }
    
    wouldResizeCollide(startRow, startCol, endRow, endCol) {
        // Check collision with other merged areas (excluding the one being resized)
        for (const area of this.mergedAreas) {
            if (area.id === this.resizeData.mergedArea.id) continue;
            
            const overlapsRow = !(endRow < area.startRow || startRow > area.endRow);
            const overlapsCol = !(endCol < area.startCol || startCol > area.endCol);
            
            if (overlapsRow && overlapsCol) {
                return true;
            }
        }
        
        // Check collision with single selected cells
        for (const cellData of this.singleSelectedCells) {
            if (cellData.row >= startRow && cellData.row <= endRow &&
                cellData.col >= startCol && cellData.col <= endCol) {
                return true;
            }
        }
        
        return false;
    }
    
    showResizePreview(startRow, startCol, endRow, endCol, wouldCollide) {
        // Clear previous preview
        this.cells.forEach(cell => {
            cell.classList.remove('resize-preview', 'resize-invalid');
        });
        
        // Show new preview
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const cell = this.getCellAt(row, col);
                if (cell) {
                    if (wouldCollide) {
                        cell.classList.add('resize-invalid');
                    } else {
                        cell.classList.add('resize-preview');
                    }
                }
            }
        }
    }
    
    finishResize() {
        if (!this.resizeData || this.resizeData.wouldCollide) {
            // Invalid resize - cancel
            this.cancelResize();
            return;
        }
        
        const { mergedArea, newStartRow, newEndRow, newStartCol, newEndCol } = this.resizeData;
        
        // Clear old cells
        this.clearRectangleCells(mergedArea);
        
        // Update rectangle bounds
        mergedArea.startRow = newStartRow;
        mergedArea.endRow = newEndRow;
        mergedArea.startCol = newStartCol;
        mergedArea.endCol = newEndCol;
        
        // Update overlay
        this.updateMergedAreaOverlay(mergedArea);
        
        // Clean up
        this.cleanupResize();
        
        if (this.options.onRectangleMove) {
            this.options.onRectangleMove(mergedArea);
        }
    }
    
    cancelResize() {
        this.cleanupResize();
    }
    
    cleanupResize() {
        this.isResizing = false;
        this.resizeData = null;
        document.body.style.cursor = '';
        
        // Clear preview classes
        this.cells.forEach(cell => {
            cell.classList.remove('resize-preview', 'resize-invalid');
        });
    }
}