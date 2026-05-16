/**
 * Compatibility facade for bubble-menu content helpers.
 *
 * Keep exports stable while delegating implementation to focused modules.
 */
export { setHeader, toggleList } from './content-block-actions';
export { toggleInlineStyle, isInlineStyleActive } from './content-inline-actions';
export { isHeaderActive, isListActive } from './content-active-state';
