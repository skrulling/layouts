# Layout Library POC

A proof-of-concept JavaScript library for creating simple, draggable grid layouts with merge functionality.

## Features

- **Drag-to-Merge**: Click and drag to select rectangular areas and merge grid cells
- **Visual Feedback**: Real-time preview of merge areas with smooth animations
- **Export/Import**: Save and restore grid layouts as JSON data
- **Touch Support**: Works on mobile devices with touch interactions
- **No Dependencies**: Pure JavaScript implementation with no external libraries

## Demo

Open `index.html` in your browser to see the interactive demo.

### How to Use

1. **Merge Boxes**: Click and hold on any grid cell, then drag to select a rectangular area. Release to merge the selected cells.
2. **Visual Indicators**: 
   - Yellow outline: Selection in progress
   - Green outline: Valid merge area
   - Green cells: Successfully merged areas
3. **Export Layout**: Click "Export Layout" to see the current grid configuration as JSON
4. **Reset Grid**: Click "Reset Grid" to clear all merged areas

### Keyboard Shortcuts

- `Escape`: Clear current selection
- `Ctrl/Cmd + E`: Export layout
- `Ctrl/Cmd + R`: Reset grid (with confirmation)

## API Documentation

### LayoutLib Class

#### Constructor

```javascript
const layoutLib = new LayoutLib(container, options);
```

**Parameters:**
- `container` (HTMLElement): The DOM element that will contain the grid
- `options` (Object): Configuration options
  - `rows` (number): Number of grid rows (default: 6)
  - `cols` (number): Number of grid columns (default: 8)
  - `gap` (number): Gap between cells in pixels (default: 8)
  - `onMerge` (function): Callback fired when cells are merged
  - `onSelectionChange` (function): Callback fired when selection changes

#### Methods

##### `export()`
Returns the current grid layout as a JSON object.

```javascript
const layoutData = layoutLib.export();
// Returns: { rows: 6, cols: 8, mergedAreas: [...] }
```

##### `import(data)`
Loads a grid layout from JSON data.

```javascript
layoutLib.import(layoutData);
```

##### `reset()`
Clears all merged areas and resets the grid to its initial state.

```javascript
layoutLib.reset();
```

##### `destroy()`
Removes the grid and cleans up event listeners.

```javascript
layoutLib.destroy();
```

### Data Structure

The exported layout data follows this structure:

```javascript
{
  "rows": 6,
  "cols": 8,
  "mergedAreas": [
    {
      "startRow": 0,
      "endRow": 1,
      "startCol": 0,
      "endCol": 2,
      "id": "merged-1234567890"
    }
    // ... more merged areas
  ]
}
```

## Architecture

### Core Components

1. **LayoutLib** (`layoutLib.js`): The main library class handling grid creation, interaction logic, and data management
2. **Styling** (`styles.css`): CSS for grid layout, animations, and visual feedback
3. **Demo App** (`main.js`): Example implementation with UI controls and utilities

### Key Features Implementation

#### Drag-to-Merge Logic
- Mouse/touch event handling for selection
- Real-time rectangular area calculation
- Merge validation (prevents overlapping with existing merged areas)
- Smooth animation feedback

#### Visual Feedback System
- Selection outline with dynamic positioning
- Color-coded states (selecting, preview, merged)
- CSS animations for merge confirmation

#### Data Management
- Internal representation of merged areas
- Export/import functionality for persistence
- Overlap detection and handling

## Browser Compatibility

- Modern browsers with ES6+ support
- Touch events for mobile devices
- CSS Grid support required

## Future Enhancements

This POC provides a foundation for more advanced features:

- **Resize handles** for merged areas
- **Split/unmerge** functionality
- **Nested grids** and hierarchical layouts
- **Content management** for individual cells
- **Undo/redo** system
- **Templates** and preset layouts
- **Responsive grid** with breakpoints

## Development

The project uses vanilla JavaScript with no build process required. Simply open `index.html` in a web browser to run the demo.

### File Structure

```
├── index.html          # Demo page
├── styles.css          # Grid styling and animations  
├── layoutLib.js        # Core library
├── main.js            # Demo app logic
└── README.md          # This file
```

## License

This is a proof-of-concept project. Use and modify as needed for your own projects. 