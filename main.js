// Main application logic for the Layout Library POC
document.addEventListener('DOMContentLoaded', function() {
    const gridContainer = document.getElementById('layoutGrid');
    const editModeBtn = document.getElementById('editModeBtn');
    const exportBtn = document.getElementById('exportBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    // Initialize the layout library
    const layoutLib = new LayoutLib(gridContainer, {
        rows: 6,
        cols: 8,
        onMerge: function(selection, mergedAreas) {
            console.log('Merged area:', selection);
            console.log('All merged areas:', mergedAreas);
            
            // Show a brief success message
            showNotification(`Merged area: ${selection.endRow - selection.startRow + 1}x${selection.endCol - selection.startCol + 1}`);
        },
        onSingleSelect: function(cellId, singleSelectedCells) {
            console.log('Single selected cell:', cellId);
            console.log('All single selected cells:', singleSelectedCells);
            
            showNotification(`Single cell selected: ${cellId}`);
        },
        onRectangleMove: function(movedRectangle) {
            console.log('Rectangle moved/resized:', movedRectangle);
            
            const width = movedRectangle.endCol - movedRectangle.startCol + 1;
            const height = movedRectangle.endRow - movedRectangle.startRow + 1;
            showNotification(`Rectangle updated: ${height}x${width} at (${movedRectangle.startRow}, ${movedRectangle.startCol})`);
        },
        onModeChange: function(editMode) {
            console.log('Edit mode changed:', editMode);
            updateEditModeButton(editMode);
        },
        onSelectionChange: function(selection, canMerge) {
            // Optional: could show selection info in UI
            // console.log('Selection:', selection, 'Can merge:', canMerge);
        }
    });
    
    // Edit mode toggle functionality
    editModeBtn.addEventListener('click', function() {
        const newEditMode = layoutLib.toggleEditMode();
        updateEditModeButton(newEditMode);
        
        if (newEditMode) {
            showNotification('Edit mode enabled - Click individual cells or drag to merge');
        } else {
            showNotification('View mode enabled - Only showing selected areas');
        }
    });
    
    function updateEditModeButton(editMode) {
        if (editMode) {
            editModeBtn.textContent = 'Edit Mode: ON';
            editModeBtn.classList.add('active');
        } else {
            editModeBtn.textContent = 'Edit Mode: OFF';
            editModeBtn.classList.remove('active');
        }
    }
    
    // Export functionality
    exportBtn.addEventListener('click', function() {
        const layoutData = layoutLib.export();
        console.log('Exported layout:', layoutData);
        
        // Show the exported data in a formatted way
        const jsonString = JSON.stringify(layoutData, null, 2);
        showExportModal(jsonString);
    });
    
    // Reset functionality
    resetBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset the grid? This will remove all merged areas and selected cells.')) {
            layoutLib.reset();
            showNotification('Grid reset successfully');
        }
    });
    
    // Utility functions
    function showNotification(message, duration = 3000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            font-size: 14px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
    
    function showExportModal(jsonString) {
        // Remove any existing modal
        const existingModal = document.querySelector('.export-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <h3>Exported Layout Data</h3>
                    <textarea readonly>${jsonString}</textarea>
                    <div class="modal-actions">
                        <button id="copyBtn">Copy to Clipboard</button>
                        <button id="closeBtn">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 2000;
        `;
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .modal-content {
                background: white;
                border-radius: 10px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow: auto;
            }
            
            .modal-content h3 {
                margin-bottom: 20px;
                color: #2c3e50;
            }
            
            .modal-content textarea {
                width: 100%;
                height: 250px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                resize: vertical;
                margin-bottom: 20px;
            }
            
            .modal-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .modal-actions button {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            
            #copyBtn {
                background-color: #28a745;
                color: white;
            }
            
            #closeBtn {
                background-color: #6c757d;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Handle modal actions
        modal.querySelector('#copyBtn').addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText(jsonString);
                showNotification('Copied to clipboard!');
            } catch (err) {
                // Fallback for older browsers
                const textarea = modal.querySelector('textarea');
                textarea.select();
                document.execCommand('copy');
                showNotification('Copied to clipboard!');
            }
        });
        
        modal.querySelector('#closeBtn').addEventListener('click', function() {
            modal.remove();
            style.remove();
        });
        
        // Close on backdrop click
        modal.querySelector('.modal-backdrop').addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
                style.remove();
            }
        });
    }
    
    // Add some helpful keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to reset selection
        if (e.key === 'Escape') {
            layoutLib.clearSelection();
        }
        
        // Ctrl/Cmd + R to reset (prevent default browser refresh)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (confirm('Reset the grid?')) {
                layoutLib.reset();
                showNotification('Grid reset');
            }
        }
        
        // Ctrl/Cmd + E to export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportBtn.click();
        }
        
        // Space to toggle edit mode
        if (e.key === ' ' && e.target === document.body) {
            e.preventDefault();
            editModeBtn.click();
        }
    });
    
    // Add touch support for mobile devices
    let touchStartCell = null;
    
    gridContainer.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('grid-cell')) {
            touchStartCell = e.target;
            layoutLib.handleMouseDown({ target: e.target, preventDefault: () => e.preventDefault() });
        }
    }, { passive: false });
    
    gridContainer.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        layoutLib.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });
    
    gridContainer.addEventListener('touchend', function(e) {
        layoutLib.handleMouseUp(e);
        touchStartCell = null;
    });
    
    console.log('Layout Library POC initialized successfully!');
    showNotification('Layout Library loaded! Click cells or drag to merge. Use "Edit Mode" to toggle.', 5000);
}); 