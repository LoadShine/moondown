import { buildTableHelperStyles } from './table-helper-styles';

/**
 * Generates CSS styles for table helper interface.
 *
 * @param edgeButtonSize - Base size for table operation buttons (affects button dimensions and border radius)
 * @returns Style element containing all table helper CSS rules
 */
export default function computeCSS(edgeButtonSize: number): Element {
    const styleNode = document.createElement('style');
    styleNode.setAttribute('id', 'tableHelperCSS');
    styleNode.setAttribute('type', 'text/css');
    styleNode.textContent = buildTableHelperStyles(edgeButtonSize);

    return styleNode;
}
