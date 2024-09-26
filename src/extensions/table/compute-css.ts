export default function computeCSS(edgeButtonSize: number): Element {
    let styleNode = document.createElement('style')
    styleNode.setAttribute('id', 'tableHelperCSS')
    styleNode.setAttribute('type', 'text/css')

    styleNode.textContent = `
  table.table-helper {
    width: 100%;
    display: inline-table;
    border: 1px solid #e0e0e0;
    padding: 0px;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  table.table-helper tr:first-child {
    font-weight: bold;
    background-color: #f0f0f0;
    color: #333;
  }

  table.table-helper tr:first-child td {
    padding: 12px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-right: 1px solid #e0e0e0;
  }

  table.table-helper td {
    padding: 8px;
    border: 1px solid #e0e0e0;
    min-width: 150px;
    caret-color: rgb(0, 0, 0);
    height: ${edgeButtonSize * 1.5}px;
    position: relative;
  }

  table.table-helper td:focus {
    background-color: #e6f7ff;
    outline: none;
  }

  .table-helper-align-button-container,
  .table-helper-remove-button-container,
  .table-helper-save-status-button {
    z-index: 2;
  }

  .table-helper-operate-button {
    z-index: 3;
  }

  .table-helper-align-button-container,
  .table-helper-remove-button-container,
  .table-helper-operate-button {
    background-color: #fff;
    color: #4d5d75;
  }

  .table-helper-align-button-container {
    color: #4d5d75;
    opacity: 0.5;
    transition: 0.2s opacity ease;
    width: ${edgeButtonSize * 3}px;
    height: ${edgeButtonSize}px;
    border-radius: ${edgeButtonSize * 0.25}px;
    overflow: hidden;
    position: absolute;
    box-shadow: 2px 2px 5px 0px rgba(0, 0, 0, .25);
  }

  .table-helper-align-button-container:hover { opacity: 1; }

  .table-helper-align-button, .table-helper-remove-button {
    width: ${edgeButtonSize}px;
    height: ${edgeButtonSize}px;
    padding-top: ${edgeButtonSize * 0.1}px;
    display: inline-block;
    vertical-align: top;
    text-align: center;
    cursor: pointer;
    transition: 0.2s background-color ease;
  }

  .table-helper-align-button:hover, .table-helper-remove-button:hover {
    background-color: #cde;
  }

  .table-helper-align-button-line {
    width: ${edgeButtonSize * 0.74}px;
    height: ${edgeButtonSize * 0.1}px;
    margin-top: ${edgeButtonSize * 0.13}px;
    margin-left: ${edgeButtonSize * 0.13}px;
    margin-right: ${edgeButtonSize * 0.13}px;
    background-color: #4d5d75;
  }

  .table-helper-align-button.align-left div:last-child {
    width: ${edgeButtonSize * 0.4}px;
  }

  .table-helper-align-button.align-right div:last-child {
    width: ${edgeButtonSize * 0.4}px;
    margin-left: ${edgeButtonSize * 0.47}px;
  }

  .table-helper-align-button.align-center div:nth-child(2) {
    width: ${edgeButtonSize * 0.4}px;
    margin-left: ${edgeButtonSize * 0.27}px;
  }

  .table-helper-remove-button-container {
    opacity: 0.25;
    transition: 0.2s opacity ease;
    width: ${edgeButtonSize * 2}px;
    height: ${edgeButtonSize}px;
    border-radius: ${edgeButtonSize * 0.25}px;
    overflow: hidden;
    position: absolute;
    box-shadow: 2px 2px 5px 0px rgba(0, 0, 0, .25);
  }

  .table-helper-remove-button-container:hover { opacity: 1; }

  .table-helper-remove-button-line {
    background-color: #4d5d75;
    width: ${edgeButtonSize * 0.74}px;
    height: ${edgeButtonSize * 0.1}px;
  }

  .table-helper-remove-button.row .table-helper-remove-button-line {
    position: absolute;
    top: ${edgeButtonSize / 2}px;
    left: ${edgeButtonSize * 0.13}px;
  }

  .table-helper-remove-button.col .table-helper-remove-button-line {
    position: absolute;
    top: ${edgeButtonSize / 2}px;
    left: ${edgeButtonSize + edgeButtonSize * 0.13}px;
  }

  .table-helper-remove-button-line:nth-child(1) {
    transform: rotate(-45deg);
    background-color: #f56868;
  }
  .table-helper-remove-button-line:nth-child(2) {
    transform: rotate(45deg);
    background-color: #f56868;
  }

  .table-helper-remove-button.row .table-helper-remove-button-line:nth-child(3) {
    transform: rotate(0deg);
  }

  .table-helper-remove-button.col .table-helper-remove-button-line:nth-child(3) {
    transform: rotate(90deg);
  }

  .table-helper-operate-button {
    opacity: 0.5;
    transition: 0.2s opacity ease;
    background-color: #eee;
    color: #333;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    position: absolute;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
  }

  .table-helper-operate-button.top,
  .table-helper-operate-button.bottom {
    width: ${edgeButtonSize * 1.2}px;
    height: ${edgeButtonSize * 0.6}px;
    border-radius: ${edgeButtonSize * 0.5}px;
  }

  .table-helper-operate-button.left,
  .table-helper-operate-button.right {
    width: ${edgeButtonSize * 0.6}px;
    height: ${edgeButtonSize * 1.2}px;
    border-radius: ${edgeButtonSize * 0.5}px;
  }

  .table-helper-operate-button:hover {
    opacity: 1;
  }
  
  .tippy-box[data-theme~='custom'] {
    background-color: white;
    color: black;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
    
  .tippy-box[data-theme~='custom'][data-placement^='bottom'] > .tippy-arrow::before {
    border-bottom-color: white;
  }
    
  .tippy-box[data-theme~='custom'] .tippy-content {
    padding: 4px;
  }
    
  .tippy-button {
    border: none;
    background: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    transition: background-color 0.3s;
  }
    
  .tippy-button:hover {
    background-color: #f0f0f0;
  }
    
  .tippy-button i {
    display: block;
    width: 16px;
    height: 16px;
  }
    
  .color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
    
  .color-button {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
    
  .alignment-options {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  `

    return styleNode
}