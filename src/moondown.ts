import { MoondownEditor } from './editor/moondown-editor';

/**
 * Backward-compatible public class name.
 * Internally delegates all responsibilities to the new facade/runtime architecture.
 */
class Moondown extends MoondownEditor {}

export default Moondown;
