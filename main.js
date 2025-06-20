// Main application logic for the Layout Library POC
document.addEventListener('DOMContentLoaded', function() {
    // Check if Highcharts is loaded
    if (typeof Highcharts === 'undefined') {
        console.error('Highcharts library not loaded!');
        showNotification('Error: Highcharts library not loaded!', 5000);
        return;
    }
    
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
        },
        onContentClick: function(mergedArea, overlayElement) {
            console.log('Content clicked:', mergedArea);
            console.log('Overlay element:', overlayElement);
            console.log('Edit mode:', layoutLib.editMode);
            
            // Generate and add random content (or replace existing)
            try {
                const contentElement = createRandomChart(mergedArea);
                const success = layoutLib.addContentToArea(mergedArea.id, contentElement);
                console.log('Chart added successfully:', success);
                
                if (success) {
                    showNotification('Random Highcharts graph added to area!');
                } else {
                    showNotification('Failed to add chart');
                }
            } catch (error) {
                console.error('Error creating chart:', error);
                showNotification('Error creating chart: ' + error.message);
            }
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

    // Function to create random chart content
    function createRandomChart(mergedArea) {
        console.log('Creating chart for area:', mergedArea);
        
        const chartContainer = document.createElement('div');
        chartContainer.style.cssText = `
            width: 100%;
            height: 100%;
            min-height: 200px;
            min-width: 200px;
            padding: 4px;
            box-sizing: border-box;
            background: white;
            border-radius: 6px;
        `;
        
        // Assign a unique ID for Highcharts
        const chartId = `chart-${mergedArea.id}-${Date.now()}`;
        chartContainer.id = chartId;
        
        // Generate random data
        const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = categories.map(() => Math.floor(Math.random() * 100) + 10);
        
        // Randomly choose between different chart types
        const chartTypes = ['line', 'column', 'bar', 'pie'];
        const randomType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
        
        console.log('Chart type:', randomType, 'Data:', data);
        
        // Prepare data for pie chart if needed
        let chartData, chartCategories;
        if (randomType === 'pie') {
            chartData = categories.map((cat, index) => ({
                name: cat,
                y: data[index]
            }));
            chartCategories = null;
        } else {
            chartData = data;
            chartCategories = categories;
        }
        
        // Create Highcharts configuration
        const chartConfig = {
            chart: {
                type: randomType,
                backgroundColor: 'white',
                borderRadius: 6,
                height: '100%',
                animation: {
                    duration: 500
                }
            },
            title: {
                text: `${getChartTitle(randomType)}`,
                style: {
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#333'
                }
            },
            credits: {
                enabled: false
            },
            legend: {
                enabled: randomType === 'pie',
                align: 'right',
                verticalAlign: 'middle',
                layout: 'vertical',
                itemStyle: {
                    fontSize: '10px'
                }
            },
            xAxis: randomType === 'pie' ? undefined : {
                categories: chartCategories,
                labels: {
                    style: {
                        fontSize: '11px'
                    }
                },
                title: {
                    text: null
                }
            },
            yAxis: randomType === 'pie' ? undefined : {
                title: {
                    text: 'Value',
                    style: {
                        fontSize: '11px'
                    }
                },
                labels: {
                    style: {
                        fontSize: '11px'
                    }
                },
                gridLineWidth: 1
            },
            plotOptions: {
                series: {
                    animation: {
                        duration: 500
                    },
                    dataLabels: {
                        enabled: randomType === 'pie',
                        format: randomType === 'pie' ? '{point.name}: {point.percentage:.1f}%' : undefined,
                        style: {
                            fontSize: '9px'
                        }
                    }
                },
                line: {
                    marker: {
                        radius: 4,
                        symbol: 'circle'
                    },
                    lineWidth: 3
                },
                column: {
                    borderRadius: 3,
                    borderWidth: 0,
                    pointPadding: 0.1
                },
                bar: {
                    borderRadius: 3,
                    borderWidth: 0,
                    pointPadding: 0.1
                },
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    showInLegend: true,
                    size: '80%',
                    innerSize: '30%', // Creates a donut effect
                    dataLabels: {
                        enabled: true,
                        distance: 10
                    }
                }
            },
            series: [{
                name: randomType === 'pie' ? 'Values' : 'Value',
                data: chartData,
                colorByPoint: randomType === 'pie',
                colors: randomType === 'pie' ? ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'] : undefined,
                color: randomType !== 'pie' ? getChartColor(randomType) : undefined
            }],
            tooltip: {
                formatter: function() {
                    if (randomType === 'pie') {
                        return `<b>${this.point.name}</b><br/>Value: ${this.y}<br/>Percentage: ${this.percentage.toFixed(1)}%`;
                    } else {
                        return `<b>${this.x}</b><br/>${this.series.name}: ${this.y}`;
                    }
                }
            },
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        title: {
                            style: {
                                fontSize: '12px'
                            }
                        },
                        legend: {
                            itemStyle: {
                                fontSize: '9px'
                            }
                        },
                        plotOptions: {
                            pie: {
                                dataLabels: {
                                    style: {
                                        fontSize: '8px'
                                    }
                                }
                            }
                        }
                    }
                }]
            }
        };
        
        // Create the chart immediately and handle errors
        try {
            console.log('Creating Highcharts chart...');
            const chart = Highcharts.chart(chartContainer, chartConfig);
            console.log('Chart created successfully:', chart);
        } catch (error) {
            console.error('Error creating Highcharts chart:', error);
            // Fallback: show simple text
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 14px; color: #666;">
                    Chart Error: ${error.message}
                </div>
            `;
        }
        
        return chartContainer;
    }
    
    // Helper function to get chart title based on type
    function getChartTitle(chartType) {
        switch (chartType) {
            case 'line':
                return 'Line Chart';
            case 'column':
                return 'Column Chart';
            case 'bar':
                return 'Bar Chart';
            case 'pie':
                return 'Pie Chart';
            default:
                return 'Chart';
        }
    }
    
    // Helper function to get chart color based on type
    function getChartColor(chartType) {
        switch (chartType) {
            case 'line':
                return '#007bff';
            case 'column':
                return '#28a745';
            case 'bar':
                return '#fd7e14';
            case 'pie':
                return '#6f42c1';
            default:
                return '#007bff';
        }
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
    
    // Debug function to check overlays
    window.debugOverlays = function() {
        const overlays = document.querySelectorAll('.merged-area-overlay');
        console.log('Found overlays:', overlays.length);
        overlays.forEach((overlay, index) => {
            console.log(`Overlay ${index}:`, {
                id: overlay.dataset.mergedId,
                classes: overlay.className,
                style: overlay.style.cssText,
                position: overlay.getBoundingClientRect()
            });
        });
        return overlays;
    };
    
    // Debug function to check view mode state
    window.debugViewMode = function() {
        const container = document.getElementById('layoutGrid');
        const isViewMode = container.classList.contains('view-mode');
        const singleSelected = document.querySelectorAll('.grid-cell.single-selected');
        const merged = document.querySelectorAll('.grid-cell.merged');
        const allCells = document.querySelectorAll('.grid-cell');
        
        console.log('View Mode Debug:', {
            isViewMode: isViewMode,
            editMode: layoutLib.editMode,
            singleSelectedCells: singleSelected.length,
            mergedCells: merged.length,
            totalCells: allCells.length,
            mergedAreas: layoutLib.mergedAreas.length,
            singleSelectedArray: layoutLib.singleSelectedCells.length
        });
        
        console.log('Single selected cells:', Array.from(singleSelected).map(cell => ({
            id: cell.dataset.id,
            row: cell.dataset.row,
            col: cell.dataset.col,
            classes: cell.className,
            opacity: cell.style.opacity
        })));
        
        console.log('Merged areas:', layoutLib.mergedAreas);
        
        // Check for problematic cells
        const problematicCells = Array.from(allCells).filter(cell => {
            const hasClasses = cell.classList.contains('single-selected') || 
                              cell.classList.contains('selecting') || 
                              cell.classList.contains('preview');
            const isVisible = cell.style.opacity !== '0';
            return hasClasses && isVisible && isViewMode;
        });
        
        if (problematicCells.length > 0) {
            console.warn('Found problematic cells that should not be visible in view mode:', 
                problematicCells.map(cell => ({
                    id: cell.dataset.id,
                    classes: cell.className,
                    opacity: cell.style.opacity
                }))
            );
        }
        
        return {
            isViewMode,
            singleSelected: Array.from(singleSelected),
            merged: Array.from(merged),
            problematicCells
        };
    };
    
    // Add a function to manually trigger cleanup
    window.forceCleanup = function() {
        console.log('Forcing comprehensive cleanup...');
        layoutLib.cleanupAllCellStates();
        if (!layoutLib.editMode) {
            layoutLib.updateViewMode();
        }
        console.log('Cleanup complete');
    };
    
    console.log('Debug functions available: window.debugOverlays(), window.debugViewMode()');
    
    console.log('Layout Library POC initialized successfully!');
    showNotification('Layout Library loaded! Create boxes by dragging, then click their centers for Highcharts!', 5000);
});